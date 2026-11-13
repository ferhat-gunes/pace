import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Minus,
  Users,
  UserPlus,
  Copy,
  Check,
  LogOut,
  Trash2,
  X,
  Share2,
  Crown,
  UserMinus,
  Sparkles,
  Download,
} from 'lucide-react';
import { motion } from 'motion/react';
import { playPop, playSuccess, playStep } from '../lib/soundFx';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';
import { NUDGE_PRESETS, sendNudge } from '../lib/notifications';
import { weekDays, formatTarget } from '../lib/rules';
import { localDateIso } from '../lib/date';
import * as api from '../lib/api';

const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function isCheckinComplete(habit, checkin) {
  if (!checkin || checkin.deleted) return false;
  const val = Number(checkin.value || 0);
  if (!habit || habit.tracking === 'check') return val >= 1;
  const target = Number(habit.target) || 1;
  return habit.direction === 'at_most' ? val <= target : val >= target;
}

export default function GroupsView({
  groups = [],
  user,
  loadData,
  initialInviteToken = null,
  onClearInviteToken = null,
  gamification = null,
  socialInbox = [],
  onDismissInbox = null,
  onGoToday = null,
  guestMode = false,
  onOpenAuth = null,
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || null);
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [cheerModalMember, setCheerModalMember] = useState(null);
  const [nudgeModalMember, setNudgeModalMember] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [ownerActionTarget, setOwnerActionTarget] = useState(null); // { userId, type: 'kick' | 'transfer', name }
  const [statusToast, setStatusToast] = useState({ text: '', isError: false });
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteLinkValue, setInviteLinkValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const todayIso = useMemo(() => localDateIso(), []);
  const currentWeekDates = useMemo(() => weekDays(todayIso, 1), [todayIso]);
  const todayDayIdx = useMemo(() => currentWeekDates.indexOf(todayIso), [currentWeekDates, todayIso]);

  const showToast = useCallback((text, isError = false) => {
    setStatusToast({ text, isError });
    setTimeout(() => setStatusToast({ text: '', isError: false }), 4500);
  }, []);

  const refreshDetail = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoadingDetail(true);
    try {
      const res = await api.getGroup(groupId);
      if (res) setGroupDetail(res);
    } catch (err) {
      console.warn('Group detail error:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

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
        showToast(err?.message || 'Davet bağlantısı geçersiz veya süresi dolmuş.', true);
      });
  }, [initialInviteToken, showToast]);

  // Synchronize selectedGroupId when groups list loads/changes
  useEffect(() => {
    if (groups.length > 0 && (!selectedGroupId || !groups.some((g) => g.id === selectedGroupId))) {
      setSelectedGroupId(groups[0].id);
    } else if (groups.length === 0) {
      setSelectedGroupId(null);
      setGroupDetail(null);
    }
  }, [groups, selectedGroupId]);

  // Reset confirmation states & load detail when group changes
  useEffect(() => {
    setConfirmLeave(false);
    setConfirmDeleteGroup(false);
    setOwnerActionTarget(null);
    setSelectedHabitId(null);
    if (selectedGroupId) {
      refreshDetail(selectedGroupId);
    }
  }, [selectedGroupId, refreshDetail]);

  // Escape key closes open sheets
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowInviteModal(false);
        setShowSummaryModal(false);
        setCheerModalMember(null);
        setNudgeModalMember(null);
        setInvitePreview(null);
        onClearInviteToken?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClearInviteToken]);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const myUserId = api.isDemo() ? 'demo-user' : (user?.id || 'me');

  const members = groupDetail?.members || activeGroup?.members || [
    { id: 'm1', user_id: myUserId, display_name: 'Sen', role: 'owner' },
  ];
  const habits = groupDetail?.habits || activeGroup?.habits || [];
  const checkins = groupDetail?.checkins || activeGroup?.checkins || [];
  const reactions = groupDetail?.reactions || [];

  const activeHabit = useMemo(() => {
    if (habits.length === 0) return null;
    return habits.find((h) => h.id === selectedHabitId) || habits[0];
  }, [habits, selectedHabitId]);

  const myTodayCheckin = useMemo(() => {
    if (!activeHabit) return null;
    return checkins.find(
      (c) =>
        !c.deleted &&
        c.user_id === myUserId &&
        c.habit_date === todayIso &&
        (c.group_habit_id === activeHabit.id || c.habit_id === activeHabit.id || (!c.group_habit_id && habits.length === 1))
    );
  }, [checkins, myUserId, todayIso, activeHabit, habits.length]);

  const handleGroupCheckin = async (nextVal) => {
    if (!activeGroup || !activeHabit || checkingIn) return;
    setCheckingIn(true);
    try {
      const clamped = Math.max(0, Math.min(1000000, Number(nextVal) || 0));
      const wasDone = isCheckinComplete(activeHabit, myTodayCheckin);
      await api.setGroupCheckin(activeGroup.id, activeHabit.id, todayIso, {
        value: clamped,
        expected_revision: Number(myTodayCheckin?.revision || 0),
        idempotency_key: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
      const nowDone = isCheckinComplete(activeHabit, { value: clamped, deleted: 0 });
      if (nowDone && !wasDone) {
        playSuccess();
        triggerHaptic('success');
        triggerConfetti();
        gamification?.addXp?.(10);
      } else {
        playStep(clamped > Number(myTodayCheckin?.value || 0));
      }
      await refreshDetail(activeGroup.id);
    } catch (err) {
      showToast(err?.message || 'Grup kaydı güncellenemedi.', true);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSendReaction = async (targetMember, emoji, text, reactionType) => {
    if (!activeGroup) return;
    const res = await sendNudge({
      targetMember,
      senderUser: user,
      message: text,
      emoji,
      groupId: activeGroup.id,
      reactionType,
    });

    if (!res?.success) {
      showToast(res?.error || 'Tepki gönderilemedi.', true);
      setCheerModalMember(null);
      setNudgeModalMember(null);
      return;
    }

    playSuccess();
    triggerHaptic('celebration');
    triggerConfetti();
    gamification?.addXp?.(res.xpBonus || (reactionType === 'cheer' ? 10 : 5));
    setCheerModalMember(null);
    setNudgeModalMember(null);
    showToast(
      reactionType === 'cheer'
        ? `${targetMember.display_name || 'Arkadaşına'} tebrik gönderildi! (+10 XP)`
        : `${targetMember.display_name || 'Arkadaşına'} nazik hatırlatma gönderildi! (+5 XP)`
    );
    await refreshDetail(activeGroup.id);
  };

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
        showToast(`"${res.group.name}" grubu oluşturuldu!`);
      }
    } catch (err) {
      showToast(err?.message || 'Grup oluşturulamadı.', true);
    }
  };

  const handleOpenInviteModal = async () => {
    if (!activeGroup) return;
    setShowInviteModal(true);
    try {
      const res = await api.createGroupInvite(activeGroup.id, { invite_type: 'link' }).catch(() => null);
      const token = res?.invite?.token || res?.invite?.code || `inv-${Date.now()}`;
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

  const handleNativeShareInvite = async () => {
    if (!inviteLinkValue || !navigator.share) return;
    try {
      await navigator.share({
        title: `PACE — ${activeGroup?.name || 'Alışkanlık Grubu'}`,
        text: `"${activeGroup?.name}" grubunda birlikte takip edelim:`,
        url: inviteLinkValue,
      });
    } catch {}
  };

  const handleAcceptInvite = async () => {
    if (!invitePreview?.token) return;
    if (guestMode && !api.isDemo()) {
      onOpenAuth?.();
      return;
    }
    try {
      const res = await api.respondInvite(invitePreview.token, 'accept');
      setInvitePreview(null);
      onClearInviteToken?.();
      await loadData?.();
      if (res?.group_id) setSelectedGroupId(res.group_id);
      showToast('Gruba katıldın!');
    } catch (err) {
      showToast('Davet kabul edilemedi: ' + (err?.message || ''), true);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    try {
      await api.leaveGroup(activeGroup.id);
      setConfirmLeave(false);
      await loadData?.();
      setSelectedGroupId(null);
      showToast(`"${activeGroup.name}" grubundan ayrıldın.`);
    } catch (err) {
      showToast('Gruptan ayrılma başarısız: ' + (err?.message || ''), true);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    try {
      await api.deleteGroup(activeGroup.id);
      setConfirmDeleteGroup(false);
      await loadData?.();
      setSelectedGroupId(null);
      showToast(`"${activeGroup.name}" grubu silindi.`);
    } catch (err) {
      showToast('Grup silinemedi: ' + (err?.message || ''), true);
    }
  };

  const handleOwnerMemberAction = async () => {
    if (!activeGroup || !ownerActionTarget) return;
    try {
      if (ownerActionTarget.type === 'kick') {
        await api.kickGroupMember(activeGroup.id, ownerActionTarget.userId);
        showToast(`${ownerActionTarget.name} gruptan çıkarıldı.`);
      } else if (ownerActionTarget.type === 'transfer') {
        await api.transferGroup(activeGroup.id, ownerActionTarget.userId);
        showToast(`Liderlik ${ownerActionTarget.name} üyesine devredildi.`);
        await loadData?.();
      }
      setOwnerActionTarget(null);
      await refreshDetail(activeGroup.id);
    } catch (err) {
      showToast(err?.message || 'İşlem başarısız.', true);
    }
  };

  const memberMatchesHabit = useCallback(
    (c) => {
      if (c.deleted) return false;
      if (!activeHabit) return true;
      if (!c.group_habit_id && !c.habit_id) return true;
      return c.group_habit_id === activeHabit.id || c.habit_id === activeHabit.id;
    },
    [activeHabit]
  );

  const memberWeeklyRows = useMemo(() => {
    return members.map((member) => {
      const mLogs = checkins.filter((c) => c.user_id === member.user_id && memberMatchesHabit(c));
      const dayStates = currentWeekDates.map((dateIso) => {
        const log = mLogs.find((c) => c.habit_date === dateIso);
        return isCheckinComplete(activeHabit, log);
      });
      const completedCount = dayStates.filter(Boolean).length;
      const percentage = Math.round((completedCount / 7) * 100);
      const isDoneToday = todayDayIdx >= 0 ? dayStates[todayDayIdx] : false;
      const cheersReceived = reactions.filter(
        (r) => r.target_user_id === member.user_id && r.reaction_type === 'cheer'
      ).length;

      return {
        member,
        dayStates,
        completedCount,
        percentage,
        isDoneToday,
        cheersReceived,
      };
    });
  }, [members, checkins, memberMatchesHabit, currentWeekDates, activeHabit, todayDayIdx, reactions]);

  const isAllMembersCompletedToday = useMemo(() => {
    if (memberWeeklyRows.length <= 1) return false;
    return memberWeeklyRows.every((row) => row.isDoneToday);
  }, [memberWeeklyRows]);

  const groupWeeklyAvg = useMemo(() => {
    if (memberWeeklyRows.length === 0) return 0;
    const total = memberWeeklyRows.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round(total / memberWeeklyRows.length);
  }, [memberWeeklyRows]);

  const handleDownloadSummaryPng = () => {
    if (!activeGroup) return;
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 720, 420);
    ctx.fillStyle = '#58CC02';
    ctx.fillRect(0, 0, 720, 10);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`PACE • ${activeGroup.name}`, 40, 68);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(activeHabit ? `${activeHabit.name} (${formatTarget(activeHabit)})` : 'Haftalık Grup Özeti', 40, 104);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`%${groupWeeklyAvg} Grup Uyumu`, 40, 170);

    let y = 230;
    memberWeeklyRows.slice(0, 5).forEach((row) => {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(40, y - 28, 640, 40);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(`${row.member.display_name || 'Üye'}`, 56, y - 2);
      ctx.fillStyle = row.percentage >= 70 ? '#58CC02' : '#FF9600';
      ctx.fillText(`${row.completedCount}/7 gün (%${row.percentage})`, 480, y - 2);
      y += 48;
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `pace-${activeGroup.name.toLowerCase().replace(/\s+/g, '-')}-ozet.png`;
    a.click();
    showToast('Haftalık özet kartı indirildi!');
  };

  const myTodayValue = Number(myTodayCheckin?.value || 0);
  const myTodayDone = isCheckinComplete(activeHabit, myTodayCheckin);
  const isOwner = activeGroup?.role === 'owner';

  return (
    <section className="page-view" id="view-groups" aria-labelledby="groups-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="groups-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Ortak Takip & Gruplar
          </h1>
          <p className="section-subtitle" style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Yakın arkadaşlarınla ortak ritmini yakala ve birbirini destekle.
          </p>
        </div>
        {(!guestMode || api.isDemo()) && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95, y: 2 }}
            className="btn-3d btn-3d-green"
            style={{ minHeight: '44px', padding: '0 18px', fontSize: '14px', borderRadius: '14px' }}
            onClick={() => {
              playPop();
              setShowCreateModal(true);
            }}
          >
            Grup Kur +
          </motion.button>
        )}
      </div>

      {/* Status Toast */}
      {statusToast.text && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="card-chunky"
          style={{
            background: statusToast.isError ? 'var(--red-soft)' : 'var(--green-soft)',
            borderColor: statusToast.isError ? 'var(--red)' : 'var(--green)',
            borderBottomColor: statusToast.isError ? 'var(--red-dark)' : 'var(--green-dark)',
            color: statusToast.isError ? 'var(--red-dark)' : 'var(--green-dark)',
            padding: '12px 16px',
            fontWeight: 700,
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>{statusToast.text}</span>
        </motion.div>
      )}

      {/* Guest prompt for Social Groups */}
      {guestMode && !api.isDemo() && groups.length === 0 && (
        <div
          className="card-chunky"
          style={{
            background: 'var(--primary-soft)',
            borderColor: 'var(--primary)',
            borderBottomColor: 'var(--primary-dark)',
            marginBottom: '20px',
            padding: '24px 18px',
            textAlign: 'center',
          }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Users size={26} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
            Arkadaşlarınla Birlikte Takip Et
          </h2>
          <p style={{ margin: '0 auto 18px', maxWidth: '380px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45 }}>
            Grup oluşturmak veya davet linkiyle katılmak için ücretsiz hesabına giriş yap; ya da demo grupları incele.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-3d btn-3d-green"
              style={{ minHeight: '44px', padding: '0 18px', fontSize: '13px', borderRadius: '12px' }}
              onClick={() => onOpenAuth?.()}
            >
              Giriş Yap / Hesap Aç
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '44px', padding: '0 16px', fontSize: '13px', borderRadius: '12px' }}
              onClick={() => api.startDemo()}
            >
              Demo Grupları Gör
            </button>
          </div>
        </div>
      )}

      {/* Incoming Social Inbox Banner */}
      {socialInbox.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {socialInbox.map((item) => (
            <motion.div
              key={item.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                <span style={{ fontSize: '24px' }}>{item.emoji || '👉'}</span>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--orange-dark)', display: 'block' }}>
                    {item.senderDisplayName} {item.reactionType === 'cheer' ? 'seni tebrik etti!' : 'sana hatırlatma gönderdi!'}
                  </strong>
                  {item.message && (
                    <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
                      "{item.message}"
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-green"
                  style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px' }}
                  onClick={() => {
                    playPop();
                    onDismissInbox?.(item.id);
                    onGoToday?.();
                  }}
                >
                  Bugüne Git ⚡
                </button>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px' }}
                  onClick={() => {
                    playPop();
                    onDismissInbox?.(item.id);
                  }}
                >
                  Tamam 👍
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
                style={{ flex: 1, minWidth: '110px', minHeight: '44px', fontSize: '13px', padding: '8px 12px' }}
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
      {groups.length === 0 && (!guestMode || api.isDemo()) ? (
        <div className="empty-state card-chunky" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={26} />
          </div>
          <h2 style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '8px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Henüz bir gruba üye değilsin
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '380px', margin: '0 auto 24px' }}>
            Arkadaşlarınla birlikte ortak hedefler belirleyip birbirinizin haftalık ilerlemesini takip edin.
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
        activeGroup && (
          <div className="group-content">
            <div className="card-chunky" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
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
                    {members.length} Üye • {habits.length} Ortak Alışkanlık • Haftalık Uyum %{groupWeeklyAvg}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95, y: 2 }}
                    className="btn-3d btn-3d-gray"
                    style={{ minHeight: '44px', padding: '0 14px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      playPop();
                      handleOpenInviteModal();
                    }}
                  >
                    <UserPlus size={16} />
                    <span>Davet Et</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95, y: 2 }}
                    className="btn-3d btn-3d-gray"
                    aria-label="Haftalık özet kartı"
                    style={{ minHeight: '44px', padding: '0 12px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      playPop();
                      setShowSummaryModal(true);
                    }}
                  >
                    <Share2 size={15} />
                    <span>Özet</span>
                  </motion.button>

                  {confirmLeave ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-3d btn-3d-gray"
                        style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px', borderRadius: '12px' }}
                        onClick={() => setConfirmLeave(false)}
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        className="btn-3d btn-3d-danger"
                        style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px', borderRadius: '12px' }}
                        onClick={handleLeaveGroup}
                      >
                        Ayrıl
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button button-quiet button-icon"
                      aria-label="Gruptan ayrıl"
                      title="Gruptan ayrıl"
                      style={{ minWidth: '44px', minHeight: '44px' }}
                      onClick={() => setConfirmLeave(true)}
                    >
                      <LogOut size={17} />
                    </button>
                  )}

                  {isOwner && (
                    confirmDeleteGroup ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-3d btn-3d-gray"
                          style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px', borderRadius: '12px' }}
                          onClick={() => setConfirmDeleteGroup(false)}
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          className="btn-3d btn-3d-danger"
                          style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px', borderRadius: '12px' }}
                          onClick={handleDeleteGroup}
                        >
                          Grubu Sil
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-quiet button-icon"
                        aria-label="Grubu sil"
                        title="Grubu sil"
                        style={{ minWidth: '44px', minHeight: '44px', color: 'var(--red)' }}
                        onClick={() => setConfirmDeleteGroup(true)}
                      >
                        <Trash2 size={17} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Group Habit Selector Tabs (when >1 habit) */}
              {habits.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {habits.map((h) => {
                    const selected = activeHabit?.id === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        className={`btn-3d ${selected ? 'btn-3d-blue' : 'btn-3d-gray'}`}
                        style={{ minHeight: '44px', padding: '0 14px', fontSize: '13px', borderRadius: '12px' }}
                        onClick={() => {
                          playPop();
                          setSelectedHabitId(h.id);
                        }}
                      >
                        {h.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 1-Tap Own Group Check-in Card */}
              {activeHabit && (
                <div
                  style={{
                    background: myTodayDone ? 'var(--green-soft)' : 'var(--surface-alt)',
                    border: `1.5px solid ${myTodayDone ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: '16px',
                    padding: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 180px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: myTodayDone ? 'var(--green-dark)' : 'var(--muted)', textTransform: 'uppercase' }}>
                      Bugünkü Grup Kaydın
                    </div>
                    <strong style={{ fontSize: '15px', color: 'var(--ink)', display: 'block' }}>
                      {activeHabit.name}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                      {formatTarget(activeHabit)}
                    </span>
                  </div>

                  {activeHabit.tracking === 'quantity' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-3d btn-3d-gray"
                        aria-label="Grup kaydını azalt"
                        disabled={checkingIn || myTodayValue <= 0}
                        style={{ minWidth: '44px', minHeight: '44px', padding: 0, borderRadius: '12px' }}
                        onClick={() => handleGroupCheckin(Math.max(0, myTodayValue - 1))}
                      >
                        <Minus size={18} />
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: 800, minWidth: '48px', textAlign: 'center', color: 'var(--ink)' }}>
                        {myTodayValue} / {activeHabit.target || 1}
                      </span>
                      <button
                        type="button"
                        className={`btn-3d ${myTodayDone ? 'btn-3d-green' : 'btn-3d-blue'}`}
                        aria-label="Grup kaydını artır"
                        disabled={checkingIn}
                        style={{ minWidth: '44px', minHeight: '44px', padding: 0, borderRadius: '12px' }}
                        onClick={() => handleGroupCheckin(myTodayValue + 1)}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={checkingIn}
                      className={`btn-3d ${myTodayDone ? 'btn-3d-green' : 'btn-3d-blue'}`}
                      style={{ minHeight: '44px', padding: '0 18px', fontSize: '13px', borderRadius: '12px' }}
                      onClick={() => handleGroupCheckin(myTodayDone ? 0 : 1)}
                    >
                      {myTodayDone ? '✓ Bugün Tamamlandı' : 'Bugünü Tamamla'}
                    </button>
                  )}
                </div>
              )}

              {/* Group Synergy Banner */}
              {isAllMembersCompletedToday && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--green-soft)',
                    border: '1.5px solid var(--green)',
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
                    <span style={{ fontSize: '22px' }}>🎉</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--green-dark)', display: 'block' }}>
                        Tüm Grup Bugün Tamamladı!
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                        Bugün herkes hedefini işaretleyerek ortak ritmi korudu.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Triad Catalyst Card */}
              {members.length === 2 && (
                <div
                  style={{
                    background: 'var(--primary-soft)',
                    border: '1px solid var(--primary)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
                    <Sparkles size={20} color="var(--primary)" />
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--ink)', display: 'block' }}>
                        3. Arkadaşı Davet Et
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        3 kişilik küçük gruplar ritmi sürdürmeyi ve birbirini desteklemeyi kolaylaştırır.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-3d btn-3d-green"
                    style={{ padding: '0 14px', fontSize: '12px', minHeight: '44px', borderRadius: '12px' }}
                    onClick={() => {
                      playPop();
                      handleOpenInviteModal();
                    }}
                  >
                    Davet Gönder +
                  </button>
                </div>
              )}

              {/* Owner Confirm Bar (Kick / Transfer) */}
              {ownerActionTarget && (
                <div
                  role="alert"
                  style={{
                    background: 'var(--orange-soft)',
                    border: '1.5px solid var(--orange)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                    {ownerActionTarget.type === 'kick'
                      ? `${ownerActionTarget.name} üyesini gruptan çıkarmak istiyor musun?`
                      : `Grup liderliğini ${ownerActionTarget.name} üyesine devretmek istiyor musun?`}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-3d btn-3d-gray"
                      style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px', borderRadius: '10px' }}
                      onClick={() => setOwnerActionTarget(null)}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className={`btn-3d ${ownerActionTarget.type === 'kick' ? 'btn-3d-danger' : 'btn-3d-orange'}`}
                      style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '10px' }}
                      onClick={handleOwnerMemberAction}
                    >
                      Onayla
                    </button>
                  </div>
                </div>
              )}

              {loadingDetail && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                  Grup detayları güncelleniyor…
                </div>
              )}

              {/* Mobile Member Cards (<768px) — zero horizontal overflow */}
              <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {memberWeeklyRows.map(({ member, dayStates, completedCount, percentage, isDoneToday, cheersReceived }) => {
                  const isSelf = member.user_id === myUserId;
                  return (
                    <div
                      key={member.id}
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '16px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{member.display_name || 'Üye'}</strong>
                          {member.role === 'owner' && (
                            <span style={{ fontSize: '11px', color: 'var(--orange-dark)', fontWeight: 700 }}>
                              (Lider)
                            </span>
                          )}
                          {cheersReceived > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--orange-dark)', background: 'var(--orange-soft)', padding: '2px 6px', borderRadius: '8px' }}>
                              👏 {cheersReceived}
                            </span>
                          )}
                        </div>
                        <strong style={{ fontSize: '13px', color: percentage >= 70 ? 'var(--green-dark)' : 'var(--orange-dark)' }}>
                          {completedCount}/7 (%{percentage})
                        </strong>
                      </div>

                      {/* 7-day dot strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '10px', marginBottom: '12px' }}>
                        {WEEKDAY_SHORT.map((label, idx) => {
                          const done = dayStates[idx];
                          const isToday = idx === todayDayIdx;
                          return (
                            <div
                              key={label}
                              style={{
                                textAlign: 'center',
                                padding: '6px 2px',
                                borderRadius: '8px',
                                background: done ? 'var(--green-soft)' : 'var(--surface)',
                                border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              }}
                            >
                              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)' }}>{label}</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: done ? 'var(--green-dark)' : 'var(--muted)' }}>
                                {done ? '✓' : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {!isSelf && (
                          isDoneToday ? (
                            <button
                              type="button"
                              className="btn-3d btn-3d-gray"
                              style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px', flex: '1 1 auto' }}
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
                              style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px', flex: '1 1 auto' }}
                              onClick={() => {
                                playPop();
                                setNudgeModalMember(member);
                              }}
                            >
                              ☕ Nazik Yokla
                            </button>
                          )
                        )}
                        {isOwner && !isSelf && (
                          <>
                            <button
                              type="button"
                              className="btn-3d btn-3d-gray"
                              aria-label={`${member.display_name} üyesini lider yap`}
                              style={{ minWidth: '44px', minHeight: '44px', padding: '0 10px', borderRadius: '12px' }}
                              onClick={() => setOwnerActionTarget({ userId: member.user_id, type: 'transfer', name: member.display_name || 'Üye' })}
                            >
                              <Crown size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-3d btn-3d-gray"
                              aria-label={`${member.display_name} üyesini gruptan çıkar`}
                              style={{ minWidth: '44px', minHeight: '44px', padding: '0 10px', borderRadius: '12px', color: 'var(--red)' }}
                              onClick={() => setOwnerActionTarget({ userId: member.user_id, type: 'kick', name: member.display_name || 'Üye' })}
                            >
                              <UserMinus size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Weekly Matrix Table (>=768px) */}
              <div
                className="table-container desktop-only-table"
                tabIndex={0}
                role="region"
                aria-label="Grup haftalık takip matrisi"
              >
                <table className="table-standard">
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: 'left', width: '180px' }}>Üye</th>
                      <th scope="col" style={{ textAlign: 'left', width: '140px' }}>Alışkanlık</th>
                      {WEEKDAY_SHORT.map((d, idx) => (
                        <th key={idx} scope="col" style={{ textAlign: 'center', width: '38px' }}>
                          {d}
                        </th>
                      ))}
                      <th scope="col" style={{ textAlign: 'center', width: '70px' }}>Haftalık</th>
                      <th scope="col" style={{ textAlign: 'center', width: '130px' }}>Dayanışma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberWeeklyRows.map(({ member, dayStates, percentage, isDoneToday, cheersReceived }) => {
                      const isSelf = member.user_id === myUserId;
                      return (
                        <tr key={member.id}>
                          <th scope="row" style={{ textAlign: 'left', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{member.display_name || 'Üye'}</span>
                              {member.role === 'owner' && (
                                <span style={{ fontSize: '11px', color: 'var(--orange-dark)', fontWeight: 700 }}>
                                  (Lider)
                                </span>
                              )}
                              {cheersReceived > 0 && (
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
                                  👏 {cheersReceived}
                                </span>
                              )}
                            </div>
                          </th>
                          <td style={{ color: 'var(--muted)', fontSize: '13px' }}>{activeHabit?.name || 'Günlük Takip'}</td>
                          {dayStates.map((hasLog, dayIdx) => (
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
                          ))}
                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ color: percentage >= 70 ? 'var(--green-dark)' : 'var(--orange-dark)' }}>
                              %{percentage}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!isSelf ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {isDoneToday ? (
                                  <button
                                    type="button"
                                    className="btn-3d btn-3d-gray"
                                    style={{ minHeight: '44px', padding: '0 10px', fontSize: '12px', borderRadius: '10px' }}
                                    onClick={() => {
                                      playPop();
                                      setCheerModalMember(member);
                                    }}
                                  >
                                    👏 Tebrik
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-3d btn-3d-orange"
                                    style={{ minHeight: '44px', padding: '0 10px', fontSize: '12px', borderRadius: '10px', fontWeight: 800 }}
                                    onClick={() => {
                                      playPop();
                                      setNudgeModalMember(member);
                                    }}
                                  >
                                    ☕ Yokla
                                  </button>
                                )}
                                {isOwner && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-3d btn-3d-gray"
                                      title="Liderliği devret"
                                      aria-label={`${member.display_name} üyesine liderliği devret`}
                                      style={{ minWidth: '44px', minHeight: '44px', padding: 0, borderRadius: '10px' }}
                                      onClick={() => setOwnerActionTarget({ userId: member.user_id, type: 'transfer', name: member.display_name || 'Üye' })}
                                    >
                                      <Crown size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-3d btn-3d-gray"
                                      title="Gruptan çıkar"
                                      aria-label={`${member.display_name} üyesini çıkar`}
                                      style={{ minWidth: '44px', minHeight: '44px', padding: 0, borderRadius: '10px', color: 'var(--red)' }}
                                      onClick={() => setOwnerActionTarget({ userId: member.user_id, type: 'kick', name: member.display_name || 'Üye' })}
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Sen</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
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
          <div className="dialog-sheet" onClick={(e) => e.stopPropagation()}>
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
          <div className="dialog-sheet" onClick={(e) => e.stopPropagation()}>
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
              Bu bağlantıyı arkadaşlarına gönder. Bağlantıya tıklayanlar doğrudan grubuna katılabilir.
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input
                className="form-input"
                readOnly
                value={inviteLinkValue}
                aria-label="Grup davet bağlantısı"
                style={{ flex: '1 1 200px', height: '48px', padding: '0 12px', fontSize: '14px', background: 'var(--surface-alt)' }}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                <button
                  type="button"
                  className="btn-3d btn-3d-blue"
                  style={{ minHeight: '44px', padding: '0 16px', borderRadius: '14px' }}
                  onClick={handleNativeShareInvite}
                >
                  <Share2 size={16} />
                  <span>Paylaş</span>
                </button>
              ) : (
                <span />
              )}
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

      {/* Weekly Shareable Summary Card Modal (P3) */}
      {showSummaryModal && activeGroup && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-modal-title"
          onClick={() => setShowSummaryModal(false)}
        >
          <div className="dialog-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 id="summary-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Haftalık Grup Özeti
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Kapat"
                onClick={() => setShowSummaryModal(false)}
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#F8FAFC',
                borderRadius: '20px',
                padding: '20px',
                borderTop: '5px solid #58CC02',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase' }}>
                PACE • Haftalık Ritim
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>{activeGroup.name}</div>
              {activeHabit && (
                <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                  {activeHabit.name}
                </div>
              )}
              <div style={{ fontSize: '30px', fontWeight: 900, color: '#58CC02', margin: '12px 0' }}>
                %{groupWeeklyAvg} Grup Uyumu
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {memberWeeklyRows.map((row) => (
                  <div
                    key={row.member.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '8px 10px',
                      borderRadius: '10px',
                    }}
                  >
                    <span>{row.member.display_name || 'Üye'}</span>
                    <strong style={{ color: row.percentage >= 70 ? '#58CC02' : '#FF9600' }}>
                      {row.completedCount}/7 (%{row.percentage})
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 16px', borderRadius: '12px' }}
                onClick={() => setShowSummaryModal(false)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-green"
                style={{ minHeight: '44px', padding: '0 18px', borderRadius: '12px' }}
                onClick={handleDownloadSummaryPng}
              >
                <Download size={16} />
                <span>Kartı İndir (PNG)</span>
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
          <div className="dialog-sheet" onClick={(e) => e.stopPropagation()}>
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
                  {guestMode && !api.isDemo() ? 'Giriş Yap & Katıl' : 'Gruba Katıl'}
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
              Arkadaşına küçük bir motivasyon desteği gönder! (+10 XP)
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                className="btn-3d btn-3d-green"
                style={{ minHeight: '48px', padding: '10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => handleSendReaction(cheerModalMember, '👏', 'Harikasın!', 'cheer')}
              >
                👏 Harikasın!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-orange"
                style={{ minHeight: '48px', padding: '10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => handleSendReaction(cheerModalMember, '🔥', 'Aynen devam!', 'cheer')}
              >
                🔥 Aynen Devam!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-blue"
                style={{ minHeight: '48px', padding: '10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => handleSendReaction(cheerModalMember, '💪', 'Süper İlerleme!', 'cheer')}
              >
                💪 Süper İlerleme!
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-purple"
                style={{ minHeight: '48px', padding: '10px', fontSize: '13px', borderRadius: '14px' }}
                onClick={() => handleSendReaction(cheerModalMember, '⭐', 'Gurur Duyduk!', 'cheer')}
              >
                ⭐ Gurur Duyduk!
              </button>
            </div>

            <button
              type="button"
              className="button button-quiet"
              style={{ width: '100%', minHeight: '44px' }}
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

            <div style={{ fontSize: '40px', marginBottom: '8px' }}>☕</div>
            <h2 id="nudge-modal-title" style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              {nudgeModalMember.display_name} İçin Nazik Yoklama
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.4 }}>
              Arkadaşını bunaltmadan destekleyici bir mesaj seç (+5 XP):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {NUDGE_PRESETS.map((preset, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={{ scale: 0.96, y: 2 }}
                  className="btn-3d btn-3d-orange"
                  style={{
                    minHeight: '48px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    borderRadius: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                  }}
                  onClick={() => handleSendReaction(nudgeModalMember, preset.emoji, preset.text, 'nudge')}
                >
                  <span style={{ fontSize: '20px' }}>{preset.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{preset.text}</span>
                </motion.button>
              ))}
            </div>

            <button
              type="button"
              className="button button-quiet"
              style={{ width: '100%', minHeight: '44px' }}
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
