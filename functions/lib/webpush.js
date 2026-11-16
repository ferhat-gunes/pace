/**
 * Zero-dependency Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID ES256)
 * Works natively on Cloudflare Workers / Pages Functions via Web Crypto API.
 */

const enc = new TextEncoder();

function b64UrlEncode(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64UrlDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function importVapidPrivateKey(publicKeyB64, privateKeyB64) {
  const pub = b64UrlDecode(publicKeyB64);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('Geçersiz VAPID genel anahtarı.');
  }
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: b64UrlEncode(pub.slice(1, 33)),
    y: b64UrlEncode(pub.slice(33, 65)),
    d: privateKeyB64,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function createVapidJwt(audience, subject, publicKeyB64, privateKeyB64) {
  const header = b64UrlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = b64UrlEncode(enc.encode(JSON.stringify({ aud: audience, exp, sub: subject })));
  const unsigned = `${header}.${payload}`;
  const key = await importVapidPrivateKey(publicKeyB64, privateKeyB64);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return `${unsigned}.${b64UrlEncode(sig)}`;
}

async function hkdfExtractAndExpand(salt, ikm, info, length) {
  const prkKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    prkKey,
    length * 8
  );
  return new Uint8Array(bits);
}

export async function encryptWebPushPayload(subscription, payloadObj) {
  const uaPublicBytes = b64UrlDecode(subscription.p256dh);
  const authSecret = b64UrlDecode(subscription.auth);
  const plaintext = enc.encode(JSON.stringify(payloadObj));

  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  const keyInfo = concatBytes(enc.encode('WebPush: info\x00'), uaPublicBytes, asPublicBytes);
  const ikm = await hkdfExtractAndExpand(authSecret, sharedSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdfExtractAndExpand(salt, ikm, enc.encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdfExtractAndExpand(salt, ikm, enc.encode('Content-Encoding: nonce\x00'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const padded = concatBytes(plaintext, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idLen = new Uint8Array([asPublicBytes.length]);
  return concatBytes(salt, rs, idLen, asPublicBytes, ciphertext);
}

export async function sendWebPush(subscription, payloadObj, env) {
  const pubKey = env.VAPID_PUBLIC_KEY;
  const privKey = env.VAPID_PRIVATE_KEY;
  if (!pubKey || !privKey) return { sent: false, reason: 'vapid_unconfigured' };

  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const subject = env.VAPID_SUBJECT || 'mailto:noreply@pace.app';

  const jwt = await createVapidJwt(audience, subject, pubKey, privKey);
  const body = await encryptWebPushPayload(subscription, payloadObj);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${pubKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body,
  });

  if (res.status === 404 || res.status === 410) {
    return { sent: false, expired: true, status: res.status };
  }
  return { sent: res.ok, status: res.status };
}
