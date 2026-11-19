import React from 'react';
import { CloudCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import * as api from '../../lib/api.js';

export default function TopBar({ setView, user, onOpenAuth, syncState, streak = 0 }) {
  const initial = user?.email ? user.email[0].toLocaleUpperCase('tr-TR') : 'P';
  const isDemo = api.demoMode;
  const isError = /Hata|Çakışma|kurulamadı|Kaydedilmemiş/i.test(syncState || '');
  const isPending = /Kaydediliyor|Yükleniyor/i.test(syncState || '');
  const SyncIcon = isError ? AlertTriangle : isPending ? RefreshCw : CloudCheck;
  const syncLabel = syncState || 'Senkronize';

  return (
    <header className="topbar" role="banner">
      <button
        type="button"
        className="mobile-brand"
        data-view="today"
        aria-label="PACE ana sayfa"
        onClick={() => setView?.('today')}
      >
        <span>PACE</span>
      </button>

      <span className="topbar-note mono">
        {streak > 0 ? (
          <>
            SERİ: <strong style={{ color: 'var(--signal-text)' }}>{streak}</strong> GÜN
          </>
        ) : (
          'GÜNLÜK TAKİP'
        )}
      </span>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          className="mobile-sync-badge"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={syncLabel}
          title={syncLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            color: isError ? 'var(--danger)' : isPending ? 'var(--fg-muted)' : 'var(--signal-text)',
          }}
        >
          <SyncIcon
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className={isPending ? 'db-spin' : undefined}
          />
        </span>

        <button
          type="button"
          className="avatar-button mono"
          id="account-button"
          aria-label={
            isDemo
              ? 'Demodan çık ve kendi hesabına giriş yap'
              : user?.email
                ? `Hesap ayarları (${user.email})`
                : 'Giriş yap veya hesap oluştur'
          }
          onClick={() => {
            if (isDemo) api.exitDemo();
            else if (user?.email) setView?.('settings');
            else onOpenAuth?.();
          }}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
