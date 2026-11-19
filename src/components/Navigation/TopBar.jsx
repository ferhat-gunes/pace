import React, { useState } from 'react';
import { CloudCheck, RefreshCw, AlertTriangle, Bell } from 'lucide-react';
import * as api from '../../lib/api.js';
import { ActivityItem, Button, Modal } from '../ui/index.js';

export default function TopBar({
  setView,
  user,
  onOpenAuth,
  syncState,
  streak = 0,
  socialInbox = [],
  onDismissInbox,
  inviteToken = null,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const initial = user?.email ? user.email[0].toLocaleUpperCase('tr-TR') : 'P';
  const isDemo = api.demoMode;
  const isError = /Hata|Çakışma|kurulamadı|Kaydedilmemiş/i.test(syncState || '');
  const isPending = /Kaydediliyor|Yükleniyor/i.test(syncState || '');
  const SyncIcon = isError ? AlertTriangle : isPending ? RefreshCw : CloudCheck;
  const syncLabel = syncState || 'Senkronize';
  const unreadCount = socialInbox.length + (inviteToken ? 1 : 0);

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
          className="db-icon-btn"
          aria-label={unreadCount > 0 ? `Bildirimler (${unreadCount} yeni)` : 'Bildirimler'}
          title="Bildirimler"
          onClick={() => setNotifOpen(true)}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          <Bell size={18} strokeWidth={1.5} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                background: 'var(--signal)',
                color: 'var(--signal-fg)',
                border: '1px solid var(--border-strong)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

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

      <Modal open={notifOpen} title="Bildirimler" onClose={() => setNotifOpen(false)}>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {inviteToken && (
            <div
              style={{
                border: '1px solid var(--signal)',
                background: 'var(--surface-1)',
                padding: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <strong className="mono" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                  Bekleyen Grup Daveti
                </strong>
                <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                  Bir gruba katılman için davet bağlantın hazır.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNotifOpen(false);
                  setView?.('groups');
                }}
              >
                Daveti gör
              </Button>
            </div>
          )}

          {socialInbox.map((item) => (
            <div key={item.id} style={{ border: '1px solid var(--border)', background: 'var(--surface-1)' }}>
              <ActivityItem
                actor={item.sender_display || item.senderDisplayName || 'Grup Üyesi'}
                summary={item.message}
              >
                <Button variant="secondary" size="sm" onClick={() => onDismissInbox?.(item.id)}>
                  Onayla
                </Button>
              </ActivityItem>
            </div>
          ))}

          {!inviteToken && socialInbox.length === 0 && (
            <p className="mono" style={{ fontSize: '13px', color: 'var(--fg-muted)', margin: 0 }}>
              Yeni bildirim yok.
            </p>
          )}
        </div>
      </Modal>
    </header>
  );
}
