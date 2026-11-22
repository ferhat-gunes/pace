import React, { useState, useEffect } from 'react';
import { Copy, Check, Link2, AtSign } from 'lucide-react';
import * as api from '../lib/api.js';
import { Modal, TabNav, TextInput, Button, InlineFeedback } from './ui/index.js';

export default function HabitInviteModal({
  open = false,
  habit = null,
  onClose,
  onRequireUsername,
}) {
  const [mode, setMode] = useState('username');
  const [targetUsername, setTargetUsername] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (open) {
      setMode('username');
      setTargetUsername('');
      setInviteLink('');
      setCopied(false);
      setBusy(false);
      setError('');
      setNotice('');
    }
  }, [open, habit?.id]);

  const handleCreateLink = async () => {
    if (!habit?.id || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.createHabitInvite(habit.id, { invite_type: 'link' });
      const token = res?.invite?.token;
      if (!token) throw new Error('Davet bağlantısı oluşturulamadı.');
      const url = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
      setInviteLink(url);
      setNotice('7 gün geçerli davet bağlantın hazır.');
    } catch (err) {
      if (err.code === 'USERNAME_REQUIRED') {
        onRequireUsername?.();
      } else {
        setError(err.message || 'Davet bağlantısı oluşturulamadı.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Bağlantı kopyalanamadı. Aşağıdaki alandan seçip kopyalayabilirsin.');
    }
  };

  const handleSendUsernameInvite = async (e) => {
    e.preventDefault();
    if (!habit?.id || busy) return;
    const cleaned = targetUsername.trim().replace(/^@+/, '').toLowerCase();
    if (!cleaned) {
      setError('Davet etmek istediğin kişinin @kullanıcıadını gir.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.createHabitInvite(habit.id, { invite_type: 'username', username: cleaned });
      setNotice(`@${cleaned} kullanıcısına davet gönderildi.`);
      setTargetUsername('');
    } catch (err) {
      if (err.code === 'USERNAME_REQUIRED') {
        onRequireUsername?.();
      } else {
        setError(err.message || 'Davet gönderilemedi.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose?.(); }}
      title={habit?.name ? `Arkadaş davet et · ${habit.name}` : 'Arkadaş davet et'}
      description="Bu alışkanlığı birlikte takip etmek için @kullanıcıadı ile davet gönder veya 7 günlük davet bağlantısı paylaş."
      size="sm"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <TabNav
          tabs={[
            { id: 'username', label: '@Kullanıcı adı' },
            { id: 'link', label: 'Davet bağlantısı' },
          ]}
          activeTab={mode}
          onChange={(next) => {
            setMode(next);
            setError('');
            setNotice('');
          }}
          ariaLabel="Davet yöntemi seç"
        />

        {error && (
          <InlineFeedback tone="error" role="alert">
            {error}
          </InlineFeedback>
        )}

        {notice && (
          <InlineFeedback tone="neutral" role="status">
            {notice}
          </InlineFeedback>
        )}

        {mode === 'username' ? (
          <form onSubmit={handleSendUsernameInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <TextInput
              id="habit-invite-username"
              label="Arkadaşının @kullanıcıadı"
              value={targetUsername}
              onChange={(e) => {
                setTargetUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="ornek.kullanici"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={25}
              autoFocus
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="tertiary" disabled={busy} onClick={onClose}>
                Kapat
              </Button>
              <Button type="submit" variant="primary" disabled={busy || !targetUsername.trim()} loading={busy}>
                <AtSign size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{busy ? 'Gönderiliyor…' : 'Davet gönder'}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {inviteLink ? (
              <>
                <TextInput
                  id="habit-invite-link-output"
                  label="7 gün geçerli davet bağlantısı"
                  value={inviteLink}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <Button type="button" variant="tertiary" onClick={onClose}>
                    Kapat
                  </Button>
                  <Button type="button" variant="primary" onClick={handleCopyLink}>
                    {copied ? <Check size={15} strokeWidth={1.5} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.5} aria-hidden="true" />}
                    <span>{copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}</span>
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <Button type="button" variant="tertiary" disabled={busy} onClick={onClose}>
                  Kapat
                </Button>
                <Button type="button" variant="primary" disabled={busy} loading={busy} onClick={handleCreateLink}>
                  <Link2 size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{busy ? 'Oluşturuluyor…' : 'Bağlantı oluştur'}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
