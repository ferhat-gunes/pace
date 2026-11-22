import React, { useState, useEffect } from 'react';
import { Users, Check, X } from 'lucide-react';
import * as api from '../lib/api.js';
import { formatNumber } from '../lib/rules.js';
import { Modal, Button, InlineFeedback, LoadingState } from './ui/index.js';

export default function InvitePreviewModal({
  open = false,
  token = null,
  initialInvite = null,
  user = null,
  onClose,
  onRequireAuth,
  onRequireUsername,
  onAccepted,
  onDeclined,
}) {
  const [invite, setInvite] = useState(initialInvite);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !token) return;
    setError('');
    setBusy('');
    if (initialInvite) {
      setInvite(initialInvite);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setInvite(null);
    api.getInvitePreview(token)
      .then((res) => {
        if (!cancelled) setInvite(res?.invite || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Davet bilgileri yüklenemedi veya süresi dolmuş.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, token, initialInvite]);

  const handleAccept = async () => {
    if (!token || busy) return;
    if (!user && !api.isDemo()) {
      onRequireAuth?.();
      return;
    }
    if (!user?.username && !api.isDemo()) {
      onRequireUsername?.();
      return;
    }
    setBusy('accept');
    setError('');
    try {
      const res = await api.acceptInvite(token);
      await onAccepted?.(res);
    } catch (err) {
      if (err.code === 'USERNAME_REQUIRED') {
        onRequireUsername?.();
      } else {
        setError(err.message || 'Davet kabul edilemedi.');
      }
    } finally {
      setBusy('');
    }
  };

  const handleDecline = async () => {
    if (!token || busy) return;
    if (!user && !api.isDemo()) {
      onClose?.();
      return;
    }
    setBusy('decline');
    setError('');
    try {
      await api.declineInvite(token);
      await onDeclined?.(token);
    } catch (err) {
      setError(err.message || 'Davet reddedilemedi.');
    } finally {
      setBusy('');
    }
  };

  const targetSummary = invite
    ? invite.tracking === 'quantity'
      ? `${formatNumber(invite.target || 1)} ${invite.unit || ''}`.trim()
      : 'Yaptım / yapmadım'
    : '';

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose?.(); }}
      title="Alışkanlık daveti"
      size="sm"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {loading && <LoadingState label="Davet bilgileri yükleniyor…" />}

        {error && (
          <InlineFeedback tone="error" role="alert">
            {error}
          </InlineFeedback>
        )}

        {!loading && invite && (
          <>
            <div
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <strong style={{ fontSize: '16px' }}>{invite.habit_name || 'Ortak Alışkanlık'}</strong>
              <div className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span>Hedef: {targetSummary}</span>
                {invite.inviter_username && <span>· Davet eden: @{invite.inviter_username}</span>}
                {Number.isFinite(Number(invite.participant_count)) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    · <Users size={12} aria-hidden="true" /> {invite.participant_count} katılımcı
                  </span>
                )}
              </div>
            </div>

            {!user && !api.isDemo() && (
              <InlineFeedback tone="neutral">
                Bu alışkanlığa katılmak için hesabına giriş yapman veya hesap oluşturman gerekiyor.
              </InlineFeedback>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {invite.invite_type === 'username' && user && (
                <Button type="button" variant="secondary" disabled={Boolean(busy)} loading={busy === 'decline'} onClick={handleDecline}>
                  <X size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{busy === 'decline' ? 'Reddediliyor…' : 'Reddet'}</span>
                </Button>
              )}
              <Button type="button" variant="tertiary" disabled={Boolean(busy)} onClick={onClose}>
                Kapat
              </Button>
              <Button type="button" variant="primary" disabled={Boolean(busy)} loading={busy === 'accept'} onClick={handleAccept}>
                <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{busy === 'accept' ? 'Katılınıyor…' : !user && !api.isDemo() ? 'Giriş yap ve katıl' : 'Katıl'}</span>
              </Button>
            </div>
          </>
        )}

        {!loading && !invite && !error && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" variant="tertiary" onClick={onClose}>
              Kapat
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
