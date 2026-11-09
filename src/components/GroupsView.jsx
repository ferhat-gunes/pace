import React, { useState } from 'react';
import { Plus, Users, UserPlus, Link2, Copy, Check, LogOut } from 'lucide-react';
import * as api from '../lib/api';

export default function GroupsView({ groups = [], user, loadData }) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteTarget, setInviteTarget] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const activeGroup = selectedGroup || groups[0];

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await api.request('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDesc.trim() }),
      });
      if (res && res.group) {
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        await loadData?.();
        setSelectedGroup(res.group);
      }
    } catch (err) {
      console.error('Group create failed', err);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/?join=${activeGroup?.id || 'demo'}&token=invite-${Date.now()}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="page-view" id="view-groups" aria-labelledby="groups-title">
      <div className="page-heading">
        <div>
          <h1 id="groups-title">Gruplar</h1>
          <p className="section-subtitle">Ortak rutinler kur, birbirinize güç verin</p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Grup Kur +
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <h2>Henüz bir grubun yok</h2>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setShowCreateModal(true)}
          >
            İlk Grubunu Kur
          </button>
        </div>
      ) : (
        <div>
          {/* Group tab selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
            {groups.map((g) => {
              const isSelected = activeGroup?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`button ${isSelected ? 'button-primary' : 'button-quiet'}`}
                  style={isSelected ? { background: 'var(--forest)', color: '#FFFFFF', borderColor: 'var(--forest)' } : {}}
                  onClick={() => setSelectedGroup(g)}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <div className="habit-row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--forest)' }}>{activeGroup.name}</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                    {activeGroup.description || 'Ortak alışkanlık takip grubu'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ fontSize: '13px', padding: '8px 14px' }}
                    onClick={() => setShowInviteModal(true)}
                  >
                    Arkadaş Davet Et
                  </button>
                </div>
              </div>

              {/* Weekly Matrix */}
              <div className="progress-table-wrap" style={{ marginTop: '20px' }}>
                <table className="progress-table">
                  <thead>
                    <tr>
                      <th>Üye</th>
                      <th>Ortak Alışkanlık</th>
                      <th>Pzt</th>
                      <th>Sal</th>
                      <th>Çar</th>
                      <th>Per</th>
                      <th>Cum</th>
                      <th>Cmt</th>
                      <th>Paz</th>
                      <th>Başarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Sen</strong></td>
                      <td>Kitap Oku (20 dk)</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>⏳</td>
                      <td>—</td>
                      <td>—</td>
                      <td><strong style={{ color: 'var(--forest)' }}>%80</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Ayşe K.</strong></td>
                      <td>Kitap Oku (20 dk)</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>✅</td>
                      <td>—</td>
                      <td>—</td>
                      <td><strong style={{ color: 'var(--forest)' }}>%100</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <dialog className="habit-dialog" open style={{ position: 'fixed', inset: '0', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36, 76, 58, 0.4)' }}>
          <div className="dialog-body" style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', width: 'min(480px, 90vw)' }}>
            <h2 style={{ margin: '0 0 16px', color: 'var(--forest)' }}>Yeni Grup Kur</h2>
            <form onSubmit={handleCreateGroup}>
              <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
                <span>Grup Adı</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Örn: Sabah Koşucuları"
                  required
                />
              </label>
              <label className="field" style={{ display: 'block', marginBottom: '20px' }}>
                <span>Açıklama</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Grup hakkında kısa bilgi"
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="button button-quiet" onClick={() => setShowCreateModal(false)}>İptal</button>
                <button type="submit" className="button button-primary">Oluştur</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <dialog className="habit-dialog" open style={{ position: 'fixed', inset: '0', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36, 76, 58, 0.4)' }}>
          <div className="dialog-body" style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', width: 'min(480px, 90vw)' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--forest)' }}>Arkadaş Davet Et</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px' }}>Bu bağlantıyı arkadaşlarına gönder:</p>
            <button
              type="button"
              className="button button-primary"
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={handleCopyInviteLink}
            >
              {copied ? '✓ Bağlantı Kopyalandı' : 'Davet Bağlantısını Kopyala'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="button button-quiet" onClick={() => setShowInviteModal(false)}>Kapat</button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
