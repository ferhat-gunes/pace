export const PASSWORD_HELP = 'Parolan 10–128 karakter olmalı. Parolanı ve kurtarma kodunu güvenli bir yerde sakla.';
export function validateAuthResponse(action, payload) {
  const user = payload?.user;
  if (payload?.ok !== true || !user || typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' || !user.email.includes('@')) {
    throw new Error('Sunucu giriş sonucunu doğrulamadı. Lütfen yeniden dene.');
  }
  if (action !== 'login' && (typeof payload.recovery_code !== 'string' || !/^(?:[a-f0-9]{8}-){5}[a-f0-9]{8}$/i.test(payload.recovery_code))) {
    throw new Error('Sunucu kurtarma kodunu doğrulamadı. Hesabını yeniden oluşturmadan önce giriş yapmayı dene.');
  }
  return { user, recoveryCode: action === 'login' ? '' : payload.recovery_code };
}
