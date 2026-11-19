import React, { useEffect, useState } from 'react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  sendLocalNotification,
  isNotificationSupported,
  isPushSupported,
  getCurrentPushSubscription,
  subscribeWebPush,
  syncPushPreferences,
} from '../../lib/notifications.js';
import * as api from '../../lib/api.js';
import { isSoundEnabled, toggleSound } from '../../lib/soundFx.js';
import { Button, DateTimePicker, FormField, InlineFeedback, Toggle } from '../ui/index.js';

export default function NotificationSettings({ authorized = false, pushEnabled = false }) {
  const [settings, setSettings] = useState(getNotificationSettings);
  const [sound, setSound] = useState(isSoundEnabled);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let current = true;
    if (authorized && isPushSupported()) {
      getCurrentPushSubscription().then((s) => {
        if (current) setSubscribed(Boolean(s));
      });
    }
    return () => {
      current = false;
    };
  }, [authorized]);

  const run = async (task) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await task();
    } catch (e) {
      setNotice({ error: true, text: e.message || 'Tercih kaydedilemedi.' });
    } finally {
      setBusy(false);
    }
  };

  const update = async (patch) => {
    const next = { ...settings, ...patch };
    if (authorized) {
      const r = await syncPushPreferences(next);
      if (!r.ok) throw new Error(r.error || 'Sunucu bildirim tercihini kaydedemedi.');
    }
    saveNotificationSettings(next);
    const stored = getNotificationSettings();
    if (Object.entries(patch).some(([key, value]) => stored[key] !== value)) {
      throw new Error('Tarayıcı bildirim tercihini saklayamadı. Depolama iznini kontrol et.');
    }
    setSettings({ ...next, permission: stored.permission });
    setNotice({ text: 'Bildirim tercihin kaydedildi.' });
  };

  const permission = () =>
    run(async () => {
      const p = await requestNotificationPermission();
      setSettings(getNotificationSettings());
      if (p !== 'granted') {
        throw new Error(
          p === 'unsupported'
            ? 'Tarayıcın bildirimleri desteklemiyor.'
            : 'Bildirim izni verilmedi. Tarayıcı ayarlarından değiştirebilirsin.'
        );
      }
      await update({ enabled: true });
    });

  const push = () =>
    run(async () => {
      let result;
      if (subscribed) {
        const subscription = await getCurrentPushSubscription();
        if (subscription) {
          const response = await api.unsubscribePush(subscription.endpoint);
          if (response?.ok !== true) throw new Error('Sunucu push aboneliğini kapatamadı.');
          if (!(await subscription.unsubscribe())) {
            throw new Error('Tarayıcı aboneliği kapatılamadı. Yeniden dene.');
          }
        }
        result = { ok: true };
      } else {
        result = await subscribeWebPush(settings);
      }
      if (!result?.ok) {
        throw new Error(
          result.error ||
            (result.reason === 'vapid_missing'
              ? 'Sunucu push anahtarı henüz yapılandırılmadı.'
              : 'Push aboneliği tamamlanamadı.')
        );
      }
      setSubscribed(!subscribed);
      setNotice({
        text: subscribed ? 'Arka plan bildirimleri kapatıldı.' : 'Arka plan bildirimleri açıldı.',
      });
    });

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) 0',
    borderTop: '1px solid var(--border)',
    flexWrap: 'wrap',
  };

  return (
    <section
      aria-labelledby="notification-settings-title"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <h2 id="notification-settings-title" style={{ fontSize: '16px', fontWeight: 700 }}>
        Ses ve bildirimler
      </h2>

      {notice ? (
        <InlineFeedback message={notice.text} tone={notice.error ? 'danger' : 'signal'} />
      ) : null}

      <div style={rowStyle}>
        <div>
          <strong style={{ fontSize: '14px' }}>Ses efektleri</strong>
          <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            İlerleme ve tamamlama sırasında kısa sesler.
          </p>
        </div>
        <Toggle
          label={sound ? 'Açık' : 'Kapalı'}
          checked={sound}
          onChange={() => setSound(toggleSound())}
        />
      </div>

      <div style={rowStyle}>
        <div>
          <strong style={{ fontSize: '14px' }}>Günlük hatırlatma</strong>
          <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            {settings.permission === 'granted'
              ? 'Tarayıcı açıkken çalışır. Uygulama kapalıyken hatırlatma için Web Push gerekir.'
              : settings.permission === 'denied'
                ? 'Tarayıcı bildirim iznini kapatmış; izin ayarlarından değiştirebilirsin.'
                : 'Hatırlatma için önce tarayıcı izni gerekir.'}
          </p>
        </div>
        {settings.permission === 'granted' ? (
          <Toggle
            label={settings.enabled ? 'Açık' : 'Kapalı'}
            checked={settings.enabled}
            disabled={busy || !isNotificationSupported()}
            onChange={() => run(() => update({ enabled: !settings.enabled }))}
          />
        ) : (
          <Button
            variant="secondary"
            disabled={busy || !isNotificationSupported()}
            onClick={permission}
          >
            Bildirim izni ver
          </Button>
        )}
      </div>

      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <legend className="sr-only">Hatırlatma saatleri</legend>
        <div style={rowStyle}>
          <div>
            <strong style={{ fontSize: '14px' }}>Hatırlatma saati</strong>
          </div>
          <div style={{ minWidth: '156px', width: 'auto', maxWidth: '100%' }}>
            <FormField label="Saat" htmlFor="reminder-time-input">
              <DateTimePicker
                id="reminder-time-input"
                type="time"
                aria-label="Hatırlatma saati"
                style={{ width: '100%', minWidth: '148px' }}
                value={settings.reminderTime}
                onChange={(e) => run(() => update({ reminderTime: e.target.value }))}
              />
            </FormField>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <strong style={{ fontSize: '14px' }}>Sessiz saatler</strong>
            <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
              Bu aralıkta hatırlatma gösterilmez.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', maxWidth: '100%' }}>
            <div style={{ minWidth: '156px', width: 'auto', maxWidth: '100%' }}>
              <FormField label="Başlangıç" htmlFor="quiet-start-input">
                <DateTimePicker
                  id="quiet-start-input"
                  type="time"
                  aria-label="Sessiz saat başlangıcı"
                  style={{ width: '100%', minWidth: '148px' }}
                  value={settings.quietStart}
                  onChange={(e) => run(() => update({ quietStart: e.target.value }))}
                />
              </FormField>
            </div>
            <div style={{ minWidth: '156px', width: 'auto', maxWidth: '100%' }}>
              <FormField label="Bitiş" htmlFor="quiet-end-input">
                <DateTimePicker
                  id="quiet-end-input"
                  type="time"
                  aria-label="Sessiz saat bitişi"
                  style={{ width: '100%', minWidth: '148px' }}
                  value={settings.quietEnd}
                  onChange={(e) => run(() => update({ quietEnd: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
        </div>
      </fieldset>

      <div style={rowStyle}>
        <div>
          <strong style={{ fontSize: '14px' }}>Grup bildirimleri</strong>
          <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            Tebrik ve nazik yoklama bildirimleri.
          </p>
        </div>
        <Toggle
          label={settings.socialEnabled ? 'Açık' : 'Kapalı'}
          checked={settings.socialEnabled}
          disabled={busy}
          onChange={() => run(() => update({ socialEnabled: !settings.socialEnabled }))}
        />
      </div>

      <div style={rowStyle}>
        <div>
          <strong style={{ fontSize: '14px' }}>Arka plan Web Push</strong>
          <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            {!authorized
              ? 'Gerçek hesabına giriş yapman gerekir.'
              : !pushEnabled
                ? 'Sunucuda push yapılandırması etkin değil.'
                : !isPushSupported()
                  ? 'Tarayıcın bu özelliği desteklemiyor.'
                  : 'Uygulama kapalıyken de bildirim alabilirsin.'}
          </p>
        </div>
        <Toggle
          label={subscribed ? 'Açık' : 'Kapalı'}
          checked={subscribed}
          disabled={busy || !authorized || !pushEnabled || !isPushSupported()}
          onChange={push}
        />
      </div>

      {settings.permission === 'granted' && (
        <div style={{ paddingTop: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const ok = await sendLocalNotification('PACE test bildirimi', {
                  body: 'Bildirim bağlantısını kontrol ediyorsun.',
                  tag: 'pace-test-notification',
                });
                if (!ok) throw new Error('Test bildirimi gönderilemedi.');
                setNotice({ text: 'Test bildirimi gönderildi.' });
              })
            }
          >
            Test bildirimi gönder
          </Button>
        </div>
      )}
    </section>
  );
}
