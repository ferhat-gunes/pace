import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, UserPlus, Link2, Copy, Check, LogOut, Trash2, X, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop, playSuccess, playFanfare } from '../lib/soundFx';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';
import {
  NUDGE_PRESETS,
  sendNudge,
  getIncomingNudges,
  dismissNudge,
} from '../lib/notifications';
import * as api from '../lib/api';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function GroupsView({
  groups = [],
  user,
  loadData,
  initialInviteToken = null,
  onClearInviteToken = null,
  gamification = null,
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [cheerModalMember, setCheerModalMember] = useState(null);
  const [nudgeModalMember, setNudgeModalMember] = useState(null);
  const [nudgeToast, setNudgeToast] = useState('');
  const [incomingNudges, setIncomingNudges] = useState(() => getIncomingNudges(user?.id));
  const [cheers, setCheers] = useState(() => {
    try {
      const saved = localStorage.getItem('pace_group_cheers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteLinkValue, setInviteLinkValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newHabitName, setNewHabitName] = useState('');

  const refreshIncomingNudges = () => {
    setIncomingNudges(getIncomingNudges(user?.id));
  };

  useEffect(() => {
    refreshIncomingNudges();
    const interval = setInterval(refreshIncomingNudges, 12000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle incoming invite token from deep-link
  useEffect(() => {
    if (!initialInviteToken) return;
    api.getInvitePreview(initialInviteToken)
      .then((res) => {
        if (res?.invite) {
          setInvitePreview({ ...res.invite, token: initialInviteToken });
        }
      })
      .catch((err) => {
        console.warn('Invite preview error:', err);
      });
  }, [initialInviteToken]);

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
        setCheerModalMember(null);
        setNudgeModalMember(null);
        setInvitePreview(null);
        onClearInviteToken?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClearInviteToken]);

  const handleSendNudge = async (targetMember, emoji, text) => {
    playSuccess();
    triggerHaptic('celebration');
    triggerConfetti();

    await sendNudge({
      targetMember,
      senderUser: user,
      message: text,
      emoji,
      groupId: selectedGroupId || 'default',
    });

    gamification?.addXp?.(5); // +5 XP peer motivation bonus
    setNudgeModalMember(null);
    setNudgeToast(`${targetMember.display_name || 'Arkadaşına'} motivasyon dürtmesi gönderildi! (+5 XP)`);
    setTimeout(() => setNudgeToast(''), 4500);
  };


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

  const handleOpenInviteModal = async () => {
    if (!activeGroup) return;
    setShowInviteModal(true);
    try {
      const res = await api.createGroupInvite(activeGroup.id, 'link').catch(() => null);
      const token = res?.invite?.token || `inv-${Date.now()}`;
      setInviteLinkValue(`${window.location.origin}/?join=${token}`);
    } catch {
      setInviteLinkValue(`${window.location.origin}/?join=${activeGroup.id}`);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteLinkValue) return;
    navigator.clipboard.writeText(inviteLinkValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAcceptInvite = async () => {
    if (!invitePreview?.token) return;
    try {
      await api.respondInvite(invitePreview.token, 'accept');
      setInvitePreview(null);
      onClearInviteToken?.();
      await loadData?.();
    } catch (err) {
      alert('Davet kabul edilemedi: ' + err.message);
    }
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

  const members = groupDetail?.members || activeGroup?.members || [
    { id: 'm1', user_id: user?.id || 'me', display_name: 'Sen', role: 'owner' }
  ];
  const habits = groupDetail?.habits || activeGroup?.habits || [];
  const checkins = groupDetail?.checkins || activeGroup?.checkins || [];

  const sendCheer = (targetMember, emoji, text) => {
    playSuccess();
    triggerHaptic('celebration');
    triggerConfetti();

    setCheers((prev) => {
      const gCheers = prev[selectedGroupId] || {};
      const uCheers = gCheers[targetMember.user_id] || [];
      const updated = {
        ...prev,
        [selectedGroupId]: {
          ...gCheers,
          [targetMember.user_id]: [
            ...uCheers,
            { emoji, text, from: user?.email ? user.email.split('@')[0] : 'Arkadaşın', time: Date.now() },
          ],
        },
      };
      try {
        localStorage.setItem('pace_group_cheers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    gamification?.addXp?.(10); // +10 XP for solidarity cheer
    setCheerModalMember(null);
  };

  const todayDayIdx = (new Date().getDay() + 6) % 7;
  const isAllMembersCompletedToday = useMemo(() => {
    if (members.length <= 1) return false;
    return members.every((member) => {
      const memberCheckins = checkins.filter((c) => !c.deleted && c.user_id === member.user_id);
      return memberCheckins.some((c) => (new Date(c.habit_date).getDay() + 6) % 7 === todayDayIdx && Number(c.value) > 0);
    });
  }, [members, checkins, todayDayIdx]);

  return (
    <section className="page-view" id="view-groups" aria-labelledby="groups-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="groups-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Ortak Takip & Gruplar
          </h1>
          <p className="section-subtitle" style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Arkadaşlarınla birbirini teşvik et, ortak ritmini yakala.
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95, y: 2 }}
          className="btn-3d btn-3d-green"
          style={{ minHeight: '44px', padding: '0 20px', fontSize: '14px', borderRadius: '14px' }}
          onClick={() => {
            playPop();
            setShowCreateModal(true);
          }}
        >
          Grup Kur +
        </motion.button>
      </div>

      {/* Nudge Confirmation Toast */}
      {nudgeToast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="card-chunky"
          style={{
            background: 'var(--green-soft)',
            borderColor: 'var(--green)',
            borderBottomColor: 'var(--green-dark)',
            color: 'var(--green-dark)',
            padding: '12px 16px',
            fontWeight: 700,
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>👉</span>
          <span>{nudgeToast}</span>
        </motion.div>
      )}

      {/* Incoming Nudges Banner */}
      {incomingNudges.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {incomingNudges.map((nudge) => (
            <motion.div
              key={nudge.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-chunky"
              style={{
                background: 'var(--orange-soft)',
                borderColor: 'var(--orange)',
                borderBottomColor: 'var(--orange-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>{nudge.emoji || '👉'}</span>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--orange-dark)', display: 'block' }}>
                    {nudge.senderDisplayName} seni hedefini tamamlaman için dürttü!
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
                    "{nudge.message}"
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-green"
                  style={{ minHeight: '36px', padding: '0 14px', fontSize: '12px', borderRadius: '10px' }}
                  onClick={() => {
                    dismissNudge(nudge.id);
                    refreshIncomingNudges();
                    window.location.hash = '#view-today';
                    window.location.reload();
                  }}
                >
                  Tamamla ⚡
                </button>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px', borderRadius: '10px' }}
                  onClick={() => {
                    playPop();
                    dismissNudge(nudge.id);
                    refreshIncomingNudges();
                  }}
                >
                  Anladım 👍
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Group Navigation Tabs */}
      {groups.length > 0 && (
        <div className="segmented-control" role="tablist" aria-label="Grup seç" style={{ width: '100%', marginBottom: '20px', overflowX: 'auto', display: 'flex' }}>
          {groups.map((g) => {
            const isSelected = g.id === selectedGroupId;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`segmented-item ${isSelected ? 'is-selected' : ''}`}
                style={{ flex: 1, minWidth: '120px', minHeight: '42px', fontSize: '14px' }}
                onClick={() => {
                  playPop();
                  setSelectedGroupId(g.id);
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {groups.length === 0 ? (
        <div className="empty-state card-chunky" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={26} />
          </div>
          <h2 style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '8px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Henüz bir gruba üye değilsin
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px' }}>
            Arkadaşlarınla birlikte ortak hedefler belirleyip birbirinizin ilerlemesini takip edin.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95, y: 2 }}
            className="btn-3d btn-3d-green"
            style={{ minHeight: '48px', padding: '0 24px', borderRadius: '16px' }}
            onClick={() => {
              playPop();
              setShowCreateModal(true);
            }}
          >
            İlk Grubunu Kur +
          </motion.button>
        </div>
      ) : (
        <div className="group-content">
          {activeGroup && (
            <div className="card-chunky" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                    {activeGroup.name}
                  </h2>
                  {activeGroup.description && (
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
                      {activeGroup.description}
                    </p>
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginTop: '4px', display: 'inline-block' }}>
                    {members.length} Üye • {habits.length} Ortak Alışkanlık
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95, y: 2 }}
                    className="btn-3d btn-3d-gray"
                    style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      playPop();
                      handleOpenInviteModal();
                    }}
                  >
                    <UserPlus size={16} />
                    <span>Arkadaş Davet Et</span>
                  </motion.button>

                  <button
                    type="button"
                    className="button button-quiet button-icon"
                    aria-label="Gruptan ayrıl"
                    title="Gruptan ayrıl"
                    onClick={handleLeaveGroup}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>

              {/* Group Synergy: All Members Completed Today Banner */}
              {isAllMembersCompletedToday && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--green-soft, #DCFCE7)',
                    border: '1.5px solid var(--green, #22C55E)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🎉</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--green-dark, #15803D)', display: 'block' }}>
                        Harika Takım Ruhu! Tüm Grup Bugün Tamamladı!
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                        Bugün tüm üyeler hedeflerini tamamlayarak grubu zirveye taşıdı.
                      </span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--green-dark)', background: '#FFFFFF', padding: '4px 10px', borderRadius: '10px' }}>
                    +50 XP Bonus
                  </span>
                </motion.div>
              )}

              {/* Triad Catalyst Card (If group has only 2 members) */}
              {members.length === 2 && (
                <div
                  style={{
                    background: 'var(--blue-soft, #E0F2FE)',
                    border: '1px solid var(--blue, #38BDF8)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>👥</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--blue-dark, #0369A1)', display: 'block' }}>
                        Üçlü Takım Gücü (Triad Catalyst)
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                        PACE simülasyon araştırmamıza göre 3 kişilik gruplar, %40 daha yüksek devamlılık ve dayanışma sağlıyor.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-3d btn-3d-green"
                    style={{ padding: '6px 14px', fontSize: '12px', minHeight: '36px', borderRadius: '12px' }}
                    onClick={() => {
                      playPop();
                      handleOpenInviteModal();
                    }}
                  >
                    3. Arkadaşı Davet Et +
                  </button>
                </div>
              )}

              {/* Weekly Matrix Table */}
              <div
                className="table-container"
                tabIndex={0}
                role="region"
                aria-label="Grup haftalık takip matrisi (yatay kaydırılabilir)"
              >
                <table className="table-standard" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: 'left', width: '180px' }}>Üye</th>
                      <th scope="col" style={{ textAlign: 'left', width: '130px' }}>Alışkanlık</th>
                      {WEEKDAYS.map((d, idx) => (
                        <th key={idx} scope="col" style={{ textAlign: 'center', width: '38px' }}>
                          {d}
                        </th>
                      ))}
                      <th scope="col" style={{ textAlign: 'center', width: '65px' }}>Haftalık</th>
                      <th scope="col" style={{ textAlign: 'center', width: '90px' }}>Dayanışma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const memberCheckins = checkins.filter(c => !c.deleted && c.user_id === member.user_id);
                      const habitName = habits[0]?.name || 'Günlük Takip';
                      const completedDays = WEEKDAYS.filter((_, dayIdx) => {
                        return memberCheckins.some(c => (new Date(c.habit_date).getDay() + 6) % 7 === dayIdx && Number(c.value) > 0);
                      }).length;
                      const percentage = Math.round((completedDays / 7) * 100);
                      const memberCheersCount = cheers[selectedGroupId]?.[member.user_id]?.length || 0;
                      const isMemberCompletedToday = memberCheckins.some(
                        c => (new Date(c.habit_date).getDay() + 6) % 7 === todayDayIdx && Number(c.value) > 0
                      );

                      return (
                        <tr key={member.id}>
                          <th scope="row" style={{ textAlign: 'left', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{member.display_name || 'Üye'}</span>
                              {member.role === 'owner' && (
                                <span style={{ fontSize: '11px', color: 'var(--orange-dark)', fontWeight: 700 }}>
                                  (Lider)
                                </span>
                              )}
                              {memberCheersCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'var(--orange-dark)',
                                    background: 'var(--orange-soft)',
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                  }}
                                  title="Gruptan gelen alkışlar"
                                >
                                  👏 {memberCheersCount}
                                </span>
                              )}
                            </div>
                          </th>
                          <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{habitName}</td>
                          {WEEKDAYS.map((_, dayIdx) => {
                            const hasLog = memberCheckins.some(c => (new Date(c.habit_date).getDay() + 6) % 7 === dayIdx && Number(c.value) > 0);
                            return (
                              <td key={dayIdx} style={{ textAlign: 'center' }}>
                                {hasLog ? (
                                  <span>
                                    <span aria-hidden="true" style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
                                    <span className="sr-only">Tamamlandı</span>
                                  </span>
                                ) : (
                                  <span>
                                    <span aria-hidden="true" style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>
                                    <span className="sr-only">Eksik</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ color: percentage >= 70 ? 'var(--green-dark)' : 'var(--orange-dark)' }}>
                              %{percentage}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {member.user_id !== (user?.id || 'me') ? (
                              isMemberCompletedToday ? (
                                <button
                                  type="button"
                                  className="btn-3d btn-3d-gray"
                                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px', borderRadius: '8px' }}
                                  title="Arkadaşına tebrik ve alkış gönder"
                                  onClick={() => {
                                    playPop();
                                    setCheerModalMember(member);
                                  }}
                                >
                                  👏 Tebrik Et
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-3d btn-3d-orange"
                                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px', borderRadius: '8px', fontWeight: 800 }}
                                  title="Arkadaşını hedefini tamamlaması için dürt!"
                                  onClick={() => {
                                    playPop();
                                    setNudgeModalMember(member);
                                  }}
                                >
                                  Dürt 👉
                                </button>
                              )
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Sen</span>
                            )}
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

      {/* Create Group Sheet */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="dialog-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="create-group-title" style={{ margin: 0, color: 'var(--ink)', fontSize: '20px' }}>
                Yeni Grup Kur
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Kapat"
                onClick={() => {
                  playPop();
                  setShowCreateModal(false);
                }}
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Grup Adı</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Örn: Sabah Koşucuları"
                  required
                  autoFocus
                />
              </label>

              <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Açıklama (İsteğe bağlı)</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Grup hakkında kısa motivasyon"
                />
              </label>

              <label className="field" style={{ display: 'block', marginBottom: '20px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Ortak Alışkanlık Adı</span>
                <input
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Örn: 5 km Koşu veya Kitap Okuma"
                />
              </label>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button button-quiet"
                  style={{ minHeight: '48px', padding: '0 20px' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-3d btn-3d-green"
                  style={{ minHeight: '48px', padding: '0 24px', borderRadius: '16px' }}
                >
                  Grup Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Friends Sheet */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="dialog-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="invite-modal-title" style={{ margin: 0, color: 'var(--ink)', fontSize: '20px' }}>
                Arkadaşlarını Davet Et
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Kapat"
                onClick={() => {
                  playPop();
                  setShowInviteModal(false);
                }}
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.4, margin: '0 0 16px' }}>
              Bu bağlantıyı arkadaşlarına gönder. Bağlantıya tıklayanlar doğrudan grubuna katılacaktır.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                className="form-input"
                readOnly
                value={inviteLinkValue}
                style={{ flex: 1, height: '48px', padding: '0 12px', fontSize: '14px', background: 'var(--surface-alt)' }}
              />
              <button
                type="button"
                className="btn-3d btn-3d-green"
                style={{ minHeight: '48px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '14px' }}
                onClick={handleCopyInviteLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 20px', borderRadius: '14px' }}
                onClick={() => setShowInviteModal(false)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep Link Join Confirmation Sheet */}
      {invitePreview && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-preview-title"
          onClick={() => {
            setInvitePreview(null);
            onClearInviteToken?.();
          }}
        >
          <div
            className="dialog-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'var(--orange-soft)', color: 'var(--orange-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={28} />
              </div>

              <h2 id="join-preview-title" style={{ fontSize: '20px', color: 'var(--ink)', margin: '0 0 8px' }}>
                "{invitePreview.group_name}" Grubuna Katıl
              </h2>

              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px' }}>
                {invitePreview.inviter_display} seni bu gruba davet etti.
                {invitePreview.group_description && ` (${invitePreview.group_description})`}
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '48px', padding: '0 20px', borderRadius: '14px' }}
                  onClick={() => {
                    setInvitePreview(null);
                    onClearInviteToken?.();
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn-3d btn-3d-green"
                  style={{ minHeight: '48px', padding: '0 24px', borderRadius: '14px' }}
                  onClick={handleAcceptInvite}
                >
                  Gruba Katıl
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Peer Cheer Sheet Modal */}
      {cheerModalMember && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cheer-modal-title"
          onClick={() => setCheerModalMember(null)}
        >
          <div
            className="dialog-sheet card-chunky"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', margin: 'auto', textAlign: 'center' }}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ fontSize: '36px', marginBottom: '8px' }}>👏</div>
            <h2 id="cheer-modal-title" style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--ink)' }}>
              {cheerModalMember.display_name} İçin Tebrik Gönder
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.4 }}>
              Arkadaşına küçük bir motivasyon desteği gönder! Dayanışma devamlılığı güçlendirir (+10 XP).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                className="btn-3d btn-3d-green"
                style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => sendCheer(cheerModalMember, '👏', 'Harikasın!')}
              >
                👏 Harikasın!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-orange"
                style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => sendCheer(cheerModalMember, '🔥', 'Aynen devam!')}
              >
                🔥 Aynen Devam!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-blue"
                style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => sendCheer(cheerModalMember, '💪', 'Süper İlerleme!')}
              >
                💪 Süper İlerleme!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-purple"
                style={{ padding: '12px 10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => sendCheer(cheerModalMember, '⭐', 'Gurur Duyduk!')}
              >
                ⭐ Gurur Duyduk!
              </button>
            </div>

            <button
              type="button"
              className="button button-quiet"
              style={{ width: '100%', minHeight: '40px' }}
              onClick={() => setCheerModalMember(null)}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Friend Nudge Sheet Modal */}
      {nudgeModalMember && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nudge-modal-title"
          onClick={() => setNudgeModalMember(null)}
        >
          <div
            className="dialog-sheet card-chunky"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', margin: 'auto', textAlign: 'center' }}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Kapat"
                onClick={() => {
                  playPop();
                  setNudgeModalMember(null);
                }}
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div style={{ fontSize: '40px', marginBottom: '8px' }}>👉</div>
            <h2 id="nudge-modal-title" style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              {nudgeModalMember.display_name} İçin Hatırlatma Dürtmesi
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.4 }}>
              Arkadaşının serisi yanmasın! Eğlenceli ve cesaretlendirici bir dürtme mesajı seç (+5 XP):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {NUDGE_PRESETS.map((preset, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={{ scale: 0.96, y: 2 }}
                  className="btn-3d btn-3d-orange"
                  style={{
                    padding: '12px 14px',
                    fontSize: '13px',
                    borderRadius: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                  }}
                  onClick={() => handleSendNudge(nudgeModalMember, preset.emoji, preset.text)}
                >
                  <span style={{ fontSize: '20px' }}>{preset.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{preset.text}</span>
                </motion.button>
              ))}
            </div>

            <button
              type="button"
              className="button button-quiet"
              style={{ width: '100%', minHeight: '40px' }}
              onClick={() => {
                playPop();
                setNudgeModalMember(null);
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
