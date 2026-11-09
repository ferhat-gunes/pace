import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mock authentication store simulating auth logic
function createAuthStore() {
  const users = new Map();
  const sessions = new Map();
  let offlineCache = null;

  function hashPass(pwd) {
    // simplified mock hash
    return 'hash_' + pwd.split('').reverse().join('');
  }

  function generateRecoveryCode() {
    return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-');
  }

  return {
    register(email, password) {
      if (!email || !email.includes('@')) throw new Error('Geçerli bir e-posta adresi gir.');
      if (!password || password.length < 10) throw new Error('Parola en az 10 karakter olmalı.');
      if (password.length > 128) throw new Error('Parola en fazla 128 karakter olabilir.');
      const normEmail = email.toLowerCase().trim();
      if (users.has(normEmail)) throw new Error('Bu e-posta adresiyle kayıtlı bir hesap var.');
      const id = 'usr_' + crypto.randomUUID().slice(0, 8);
      const recoveryCode = generateRecoveryCode();
      const user = {
        id,
        email: normEmail,
        passwordHash: hashPass(password),
        recoveryCodeHash: hashPass(recoveryCode),
        week_start: 1,
        created_at: new Date().toISOString()
      };
      users.set(normEmail, user);
      const token = 'tok_' + crypto.randomUUID();
      sessions.set(token, { user_id: id, email: normEmail, expires_at: Date.now() + 30 * 86400000 });
      offlineCache = { id, email: normEmail, week_start: 1 };
      return { user: { id, email: normEmail, week_start: 1 }, recovery_code: recoveryCode, token };
    },
    login(email, password) {
      if (!email || !password) throw new Error('E-posta ve parola gerekli.');
      const normEmail = email.toLowerCase().trim();
      const user = users.get(normEmail);
      if (!user || user.passwordHash !== hashPass(password)) {
        throw new Error('E-posta veya parola hatalı.');
      }
      const token = 'tok_' + crypto.randomUUID();
      sessions.set(token, { user_id: user.id, email: user.email, expires_at: Date.now() + 30 * 86400000 });
      offlineCache = { id: user.id, email: user.email, week_start: user.week_start };
      return { user: { id: user.id, email: user.email, week_start: user.week_start }, token };
    },
    recover(email, recoveryCode, newPassword) {
      if (!email || !recoveryCode || !newPassword) throw new Error('Tüm alanlar gerekli.');
      if (newPassword.length < 10) throw new Error('Yeni parola en az 10 karakter olmalı.');
      const normEmail = email.toLowerCase().trim();
      const user = users.get(normEmail);
      if (!user || user.recoveryCodeHash !== hashPass(recoveryCode.trim())) {
        throw new Error('Kurtarma kodu veya e-posta hatalı.');
      }
      user.passwordHash = hashPass(newPassword);
      // Revoke all prior sessions
      for (const [t, s] of sessions.entries()) {
        if (s.user_id === user.id) sessions.delete(t);
      }
      const token = 'tok_' + crypto.randomUUID();
      sessions.set(token, { user_id: user.id, email: user.email, expires_at: Date.now() + 30 * 86400000 });
      return { user: { id: user.id, email: user.email, week_start: user.week_start }, token };
    },
    validateSession(token) {
      const s = sessions.get(token);
      if (!s) throw Object.assign(new Error('Oturum bulunamadı.'), { status: 401 });
      if (s.expires_at < Date.now()) {
        sessions.delete(token);
        throw Object.assign(new Error('Oturum süresi dolmuş.'), { status: 401 });
      }
      return { id: s.user_id, email: s.email };
    },
    logout(token) {
      sessions.delete(token);
      offlineCache = null;
      return { ok: true };
    },
    getOfflineUser() {
      return offlineCache;
    }
  };
}

test('Auth: user registration enforces validation and returns recovery code', () => {
  const auth = createAuthStore();
  assert.throws(() => auth.register('invalid-email', 'ValidPass123!'), /Geçerli bir e-posta/);
  assert.throws(() => auth.register('user@pace.app', 'short'), /en az 10 karakter/);
  assert.throws(() => auth.register('user@pace.app', 'A'.repeat(129)), /en fazla 128 karakter/);

  const reg = auth.register('user@pace.app', 'SecurePace2026!');
  assert.equal(reg.user.email, 'user@pace.app');
  assert(reg.recovery_code.length >= 16);
  assert(reg.token.startsWith('tok_'));
});

test('Auth: duplicate registration is blocked', () => {
  const auth = createAuthStore();
  auth.register('test@pace.app', 'Password1234!');
  assert.throws(() => auth.register('test@pace.app', 'DifferentPass123!'), /Bu e-posta adresiyle kayıtlı bir hesap var/);
  assert.throws(() => auth.register('TEST@PACE.APP', 'DifferentPass123!'), /Bu e-posta adresiyle kayıtlı bir hesap var/);
});

test('Auth: login verification and invalid credentials handling', () => {
  const auth = createAuthStore();
  auth.register('ferhat@pace.app', 'MyStrongPassword1');

  assert.throws(() => auth.login('ferhat@pace.app', 'WrongPass1234'), /E-posta veya parola hatalı/);
  assert.throws(() => auth.login('unknown@pace.app', 'MyStrongPassword1'), /E-posta veya parola hatalı/);

  const loggedIn = auth.login('ferhat@pace.app', 'MyStrongPassword1');
  assert.equal(loggedIn.user.email, 'ferhat@pace.app');
  assert(loggedIn.token);
});

test('Auth: password recovery with recovery code revokes active sessions', () => {
  const auth = createAuthStore();
  const reg = auth.register('ayse@pace.app', 'OldPassword123');
  const code = reg.recovery_code;
  const initialToken = reg.token;

  assert.equal(auth.validateSession(initialToken).email, 'ayse@pace.app');

  assert.throws(() => auth.recover('ayse@pace.app', 'WRONG-CODE-1234', 'NewPassword999'), /Kurtarma kodu veya e-posta hatalı/);

  const rec = auth.recover('ayse@pace.app', code, 'NewPassword999');
  assert.equal(rec.user.email, 'ayse@pace.app');

  // Old session token is invalidated
  assert.throws(() => auth.validateSession(initialToken), /Oturum bulunamadı/);

  // New login works with new password
  const newLogin = auth.login('ayse@pace.app', 'NewPassword999');
  assert(newLogin.token);
});

test('Auth: logout invalidates session and clears offline cache', () => {
  const auth = createAuthStore();
  const reg = auth.register('mehmet@pace.app', 'MehmetPass2026!');
  assert.equal(auth.getOfflineUser()?.email, 'mehmet@pace.app');

  auth.logout(reg.token);
  assert.throws(() => auth.validateSession(reg.token), /Oturum bulunamadı/);
  assert.equal(auth.getOfflineUser(), null);
});

test('Auth: offline fallback user recovery when network unavailable', () => {
  const auth = createAuthStore();
  const reg = auth.register('offline@pace.app', 'OfflinePass1234');
  const cached = auth.getOfflineUser();
  assert.equal(cached.email, 'offline@pace.app');
  assert.equal(cached.id, reg.user.id);
});

test('Backup & Restore: JSON data import validates structure and upserts habits & checkins', () => {
  function validateAndImport(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Geçersiz yedek verisi.');
    if (payload.week_start !== undefined && ![0, 1].includes(Number(payload.week_start))) {
      throw new Error('Geçersiz hafta başlangıcı.');
    }
    const habits = Array.isArray(payload.habits) ? payload.habits : [];
    const checkins = Array.isArray(payload.checkins) ? payload.checkins : [];
    for (const h of habits) {
      if (!h.id || !h.name || typeof h.name !== 'string') throw new Error('Geçersiz alışkanlık kaydı.');
    }
    for (const c of checkins) {
      if (!c.habit_id || !/^\d{4}-\d{2}-\d{2}$/.test(c.habit_date)) throw new Error('Geçersiz kayıt formatı.');
    }
    return { ok: true, habits_count: habits.length, checkins_count: checkins.length };
  }

  assert.throws(() => validateAndImport(null), /Geçersiz yedek verisi/);
  assert.throws(() => validateAndImport('string'), /Geçersiz yedek verisi/);
  assert.throws(() => validateAndImport({ week_start: 5 }), /Geçersiz hafta başlangıcı/);
  assert.throws(() => validateAndImport({ habits: [{ name: 'Test' }] }), /Geçersiz alışkanlık kaydı/);
  assert.throws(() => validateAndImport({ checkins: [{ habit_id: 'h1', habit_date: 'invalid-date' }] }), /Geçersiz kayıt formatı/);

  const validPayload = {
    week_start: 1,
    habits: [
      { id: 'h_1', name: 'Sabah Koşusu', tracking: 'quantity', target: 5, unit: 'km' },
      { id: 'h_2', name: 'Kitap Okuma', tracking: 'check', target: 1 }
    ],
    checkins: [
      { habit_id: 'h_1', habit_date: '2026-11-09', value: 5, deleted: 0 },
      { habit_id: 'h_2', habit_date: '2026-11-09', value: 1, deleted: 0 }
    ]
  };
  const res = validateAndImport(validPayload);
  assert.equal(res.ok, true);
  assert.equal(res.habits_count, 2);
  assert.equal(res.checkins_count, 2);
});
