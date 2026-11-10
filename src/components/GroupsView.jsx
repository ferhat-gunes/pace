import React, { useState, useEffect } from 'react';
import { Plus, Users, UserPlus, Link2, Copy, Check, LogOut, Trash2 } from 'lucide-react';
import * as api from '../lib/api';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function GroupsView({ groups = [], user, loadData }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newHabitName, setNewHabitName] = useState('');

  // Synchronize selectedGroupId if groups change
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Load detailed group data
  useEffect(() => {
    if (!selectedGroupId) return;
    let isCurrent = true;
    setLoadingDetail(true);

    api.getGroup(selectedGroupId)
      .then((res) => {
        if (isCurrent && res) {
          setGroupDetail(res);
        }
      })
      .catch((err) => {
        console.warn('Group detail error:', err);
      })
      .finally(() => {
        if (isCurrent) setLoadingDetail(false);
      });

    return () => { isCurrent = false; };
  }, [selectedGroupId]);

  // Handle ESC key for modal dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowInviteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await api.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        habit_name: newHabitName.trim() || undefined,
      });
      if (res?.group) {
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewHabitName('');
        await loadData?.();
        setSelectedGroupId(res.group.id);
      }
    } catch (err) {
      console.error('Group create failed', err);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/?join=${activeGroup?.id || 'demo'}&token=inv-${Date.now()}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm(`"${activeGroup.name}" grubundan ayrılmak istediğinize emin misiniz?`)) return;

    try {
      await api.leaveGroup(activeGroup.id);
      await loadData?.();
      setSelectedGroupId(null);
    } catch (err) {
      alert('Gruptan ayrılma başarısız: ' + err.message);
    }
  };

  const members = groupDetail?.members || [
    { id: 'm1', user_id: user?.id || 'me', display_name: 'Sen', role: 'owner' }
  ];
  const habits = groupDetail?.habits || [
    { id: 'h1', name: 'Grup Rutini' }
  ];
  const checkins = groupDetail?.checkins || [];

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
          aria-label="Yeni grup oluştur"
          onClick={() => setShowCreateModal(true)}
        >
          Grup Kur +
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--forest)', marginBottom: '8px' }}>
            Henüz bir grubun yok
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            Arkadaşlarınla ortak bir hedef belirleyip birlikte takip edin.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setShowCreateModal(true)}
          >
            İlk Grubunu Kur +
          </button>
        </div>
      ) : (
        <div>
          {/* Group Tab Bar */}
          <div
            role="tablist"
            aria-label="Gruplarım"
            style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}
          >
            {groups.map((g) => {
              const isSelected = activeGroup?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`button ${isSelected ? 'button-primary' : 'button-quiet'}`}
                  style={{
                    height: '42px',
                    padding: '0 16px',
                    fontWeight: 600,
                    background: isSelected ? 'var(--forest)' : undefined,
                    color: isSelected ? '#FFFFFF' : undefined,
                    borderColor: isSelected ? 'var(--forest)' : undefined,
                  }}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <Users size={16} style={{ marginRight: '6px' }} />
                  {g.name}
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <div
              className="panel-card"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(36, 76, 58, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--forest)' }}>{activeGroup.name}</h2>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '14px' }}>
                    {activeGroup.description || 'Ortak alışkanlık takip grubu'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ fontSize: '13px', padding: '0 16px', height: '40px' }}
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserPlus size={16} style={{ marginRight: '6px' }} />
                    Arkadaş Davet Et
                  </button>
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{ height: '40px', padding: '0 12px', color: 'var(--red)' }}
                    title="Gruptan ayrıl"
                    onClick={handleLeaveGroup}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>

              {/* Weekly Matrix Table */}
              <div
                className="progress-table-wrap"
                tabIndex={0}
                role="region"
                aria-label={`${activeGroup.name} haftalık katılım tablosu`}
                style={{ marginTop: '24px', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}
              >
                <table className="progress-table" style={{ width: '100%', minWidth: '640px', margin: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px' }}>Üye</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px' }}>Alışkanlık</th>
                      {WEEKDAYS.map((day) => (
                        <th key={day} scope="col" style={{ textAlign: 'center', padding: '12px 8px' }}>{day}</th>
                      ))}
                      <th scope="col" style={{ textAlign: 'center', padding: '12px 16px' }}>Haftalık Başarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const habitName = habits[0]?.name || 'Kitap Oku';
                      const memberCheckins = checkins.filter((c) => c.user_id === member.user_id);
                      const doneCount = memberCheckins.filter((c) => Number(c.value) > 0).length;
                      const percentage = Math.min(100, Math.round((doneCount / 7) * 100));

                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong>{member.display_name || 'Üye'}</strong>
                            {member.role === 'owner' && (
                              <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--orange-dark)', fontWeight: 700 }}>
                                (Lider)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{habitName}</td>
                          {WEEKDAYS.map((_, dayIdx) => {
                            // Check if log exists for this weekday
                            const hasLog = memberCheckins.some(c => (new Date(c.habit_date).getDay() + 6) % 7 === dayIdx && Number(c.value) > 0);
                            return (
                              <td key={dayIdx} style={{ textAlign: 'center', padding: '12px 8px' }}>
                                {hasLog ? (
                                  <span style={{ color: 'var(--forest)', fontWeight: 700 }}>✓</span>
                                ) : (
                                  <span style={{ color: 'var(--muted)', opacity: 0.5 }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <strong style={{ color: percentage >= 70 ? 'var(--forest)' : 'var(--orange-dark)' }}>
                              %{percentage}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <dialog
          className="habit-dialog"
          open
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(36, 76, 58, 0.45)',
            border: 'none',
            width: '100%',
            height: '100%',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="dialog-body"
            style={{
              background: 'var(--surface)',
              borderRadius: '16px',
              padding: '24px',
              width: 'min(480px, 92vw)',
              color: 'var(--ink)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="create-group-title" style={{ margin: 0, color: 'var(--forest)', fontSize: '20px' }}>Yeni Grup Kur</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Kapat"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Grup Adı</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Örn: Sabah Koşucuları"
                  required
                  autoFocus
                />
              </label>
              <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Açıklama</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Grup hakkında kısa bilgi"
                />
              </label>
              <label className="field" style={{ display: 'block', marginBottom: '20px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>İlk Ortak Alışkanlık (İsteğe bağlı)</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Örn: Kitap okuma, Su içme"
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button button-quiet"
                  style={{ minHeight: '40px' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  style={{ minHeight: '40px' }}
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <dialog
          className="habit-dialog"
          open
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(36, 76, 58, 0.45)',
            border: 'none',
            width: '100%',
            height: '100%',
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="dialog-body"
            style={{
              background: 'var(--surface)',
              borderRadius: '16px',
              padding: '24px',
              width: 'min(480px, 92vw)',
              color: 'var(--ink)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 id="invite-title" style={{ margin: 0, color: 'var(--forest)', fontSize: '20px' }}>Arkadaş Davet Et</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Kapat"
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px' }}>
              Arkadaşların bu bağlantı üzerinden gruba katılarak ortak ritminize dahil olabilir:
            </p>
            <button
              type="button"
              className="button button-primary"
              style={{ width: '100%', minHeight: '44px', marginBottom: '16px' }}
              onClick={handleCopyInviteLink}
            >
              {copied ? (
                <>
                  <Check size={16} style={{ marginRight: '6px' }} />
                  Bağlantı Panoya Kopyalandı
                </>
              ) : (
                <>
                  <Copy size={16} style={{ marginRight: '6px' }} />
                  Davet Bağlantısını Kopyala
                </>
              )}
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button button-quiet"
                style={{ minHeight: '40px' }}
                onClick={() => setShowInviteModal(false)}
              >
                Kapat
              </button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
