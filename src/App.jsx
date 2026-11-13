import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHabits } from './state/useHabits.js';
import { useGamification } from './state/useGamification.js';
import * as api from './lib/api.js';
import { localDateIso } from './lib/date.js';
import {
  checkAndTriggerDailyReminder,
  updateAppBadge,
  fetchSocialInbox,
  dismissNudge,
} from './lib/notifications.js';
import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import HabitModal from './components/HabitModal.jsx';
import { ErrorBoundary } from './components/Common/ErrorBoundary.jsx';
import PwaInstallBanner from './components/Navigation/PwaInstallBanner.jsx';

// Code splitting for secondary routes
const ProgressView = lazy(() => import('./components/ProgressView.jsx'));
const GroupsView = lazy(() => import('./components/GroupsView.jsx'));
const SettingsView = lazy(() => import('./components/SettingsView.jsx'));
const AuthModal = lazy(() => import('./components/AuthModal.jsx'));

export default function App() {
  const [currentView, setView] = useState('today'); // 'today' | 'habits' | 'progress' | 'groups' | 'settings'
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [capabilities, setCapabilities] = useState({ email_code_enabled: false, push_enabled: false });
  const [socialInbox, setSocialInbox] = useState([]);

  const {
    habits,
    checkins,
    groups,
    user,
    setUser,
    setAuthRequired,
    guestMode,
    serverGamification,
    migrateGuestToCloud,
    weekStart,
    updateWeekStart,
    loading,
    syncState,
    selectedDate,
    setSelectedDate,
    filterMode,
    setFilterMode,
    todayHabits,
    completionStats,
    checkinErrors,
    clearCheckinError,
    logCheckin,
    addHabit,
    updateHabit,
    togglePauseHabit,
    archiveHabit,
    restoreHabit,
    lastArchivedHabit,
    setLastArchivedHabit,
    importBackup,
    loadData,
  } = useHabits();

  const isAuthenticated = Boolean(user && !api.isDemo());
  const gamification = useGamification(checkins, habits, serverGamification, isAuthenticated);

  // Load auth/push capabilities on mount
  useEffect(() => {
    api.getAuthCapabilities()
      .then((res) => {
        if (res) {
          setCapabilities({
            email_code_enabled: Boolean(res.email_code_enabled),
            push_enabled: Boolean(res.push_enabled),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load social inbox for authenticated or demo user
  const refreshInbox = useCallback(async () => {
    const uid = api.isDemo() ? 'demo-user' : user?.id;
    if (!uid) {
      setSocialInbox([]);
      return;
    }
    const items = await fetchSocialInbox(uid);
    setSocialInbox(items);
  }, [user?.id]);

  useEffect(() => {
    refreshInbox();
    const timer = setInterval(refreshInbox, 30000);
    return () => clearInterval(timer);
  }, [refreshInbox]);

  const handleDismissInbox = useCallback((id) => {
    dismissNudge(id);
    setSocialInbox((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Check URL query parameters for deep linking (?join=, ?invite=, ?view=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('join') || params.get('invite');
      const requestedView = params.get('view');
      if (token) {
        setInviteToken(token);
        setView('groups');
      } else if (requestedView && ['today', 'habits', 'progress', 'groups', 'settings'].includes(requestedView)) {
        setView(requestedView);
      }
    } catch {}
  }, []);

  // Sync PWA App Badging and evaluate daily reminder
  useEffect(() => {
    const todayStr = localDateIso();
    const uncompletedCount = todayHabits.filter((h) => {
      return !checkins.some(
        (c) => !c.deleted && c.habit_id === h.id && c.habit_date === todayStr && Number(c.value) > 0
      );
    }).length;

    updateAppBadge(uncompletedCount);
    checkAndTriggerDailyReminder(todayHabits, checkins);

    const interval = setInterval(() => {
      checkAndTriggerDailyReminder(todayHabits, checkins);
    }, 60000);

    return () => clearInterval(interval);
  }, [todayHabits, checkins]);

  // Escape key closes level celebration modal
  useEffect(() => {
    if (!gamification.levelCelebrationPending) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') gamification.clearLevelCelebration();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gamification.levelCelebrationPending, gamification.clearLevelCelebration]);

  const handleOpenAddModal = () => {
    setEditingHabit(null);
    setHabitModalOpen(true);
  };

  const handleOpenEditModal = (habit) => {
    setEditingHabit(habit);
    setHabitModalOpen(true);
  };

  const handleAddStarterHabits = async (presets = []) => {
    for (const preset of presets) {
      await addHabit({
        name: preset.name,
        tracking: preset.tracking || 'check',
        direction: preset.direction || 'at_least',
        unit: preset.unit || '',
        target: preset.target || 1,
        schedule: preset.schedule || { type: 'daily', days: [], times_per_week: null },
        progression: { enabled: false, step: 0, cap: null },
        debt: { enabled: false, cap: null },
        start_date: selectedDate,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await api.request('auth/logout', { method: 'POST', body: '{}' });
    } catch (err) {
      console.warn('Logout request fallback:', err);
    }
    try {
      localStorage.removeItem('pace_local_drafts');
      localStorage.removeItem('pace_pending_mutations');
      localStorage.removeItem('pace_week_start');
      localStorage.removeItem('pace_gamification_v2');
      localStorage.removeItem('pace_groups_cache');
      localStorage.removeItem('pace_group_cheers');
      localStorage.removeItem('pace_nudges');
      sessionStorage.removeItem('pace_demo');
    } catch {}
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div id="app" className="app-shell astryx-app-shell" data-astryx-component="app-shell">
      <a href="#main-content" className="skip-link">
        Ana içeriğe atla
      </a>

      <Sidebar currentView={currentView} setView={setView} syncState={syncState} />

      <div className="main-area">
        <TopBar
          setView={setView}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          syncState={syncState}
          streak={gamification.streak}
          streakFreezes={gamification.streakFreezes}
          isStreakFrozenToday={gamification.isStreakFrozenToday}
          buyStreakFreeze={gamification.buyStreakFreeze}
          gems={gamification.gems}
          level={gamification.level}
          xp={gamification.xp}
        />

        <main id="main-content" className="content-wrap" tabIndex={-1}>
          <ErrorBoundary resetKey={currentView}>
          <PwaInstallBanner />

          {loading && habits.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Alışkanlıklar yükleniyor…</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: '100%' }}
              >
                {currentView === 'today' && (
                  <TodayView
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    todayHabits={todayHabits}
                    habits={habits}
                    checkins={checkins}
                    logCheckin={logCheckin}
                    checkinErrors={checkinErrors}
                    clearCheckinError={clearCheckinError}
                    completionStats={completionStats}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                    onOpenAddModal={handleOpenAddModal}
                    onAddStarterHabits={handleAddStarterHabits}
                    guestMode={guestMode && !api.isDemo()}
                    onOpenAuth={() => setAuthModalOpen(true)}
                    onGoGroups={() => setView('groups')}
                    socialInbox={socialInbox}
                    onDismissInbox={handleDismissInbox}
                    weekStart={weekStart}
                    questTarget={gamification.questTarget}
                    todayCompletedCount={gamification.todayCompletedCount}
                    isQuestCompleted={gamification.isQuestCompleted}
                    isQuestClaimed={gamification.isQuestClaimed}
                    claimDailyChest={gamification.claimDailyChest}
                    addXp={gamification.addXp}
                    awardAllDoneBonus={gamification.awardAllDoneBonus}
                    streakFreezes={gamification.streakFreezes}
                    isStreakFrozenToday={gamification.isStreakFrozenToday}
                    streak={gamification.streak}
                  />
                )}

                {currentView === 'habits' && (
                  <HabitsView
                    habits={habits}
                    onOpenAddModal={handleOpenAddModal}
                    onEditHabit={handleOpenEditModal}
                    togglePauseHabit={togglePauseHabit}
                    archiveHabit={archiveHabit}
                    restoreHabit={restoreHabit}
                    lastArchivedHabit={lastArchivedHabit}
                    setLastArchivedHabit={setLastArchivedHabit}
                  />
                )}

                <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor…</div>}>
                  {currentView === 'progress' && (
                    <ProgressView
                      habits={habits}
                      checkins={checkins}
                      weekStart={weekStart}
                      gamification={gamification}
                    />
                  )}

                  {currentView === 'groups' && (
                    <GroupsView
                      groups={groups}
                      user={user}
                      loadData={loadData}
                      initialInviteToken={inviteToken}
                      onClearInviteToken={() => setInviteToken(null)}
                      gamification={gamification}
                      socialInbox={socialInbox}
                      onDismissInbox={handleDismissInbox}
                      onGoToday={() => setView('today')}
                      guestMode={guestMode}
                      onOpenAuth={() => setAuthModalOpen(true)}
                    />
                  )}

                  {currentView === 'settings' && (
                    <SettingsView
                      user={user}
                      habits={habits}
                      checkins={checkins}
                      weekStart={weekStart}
                      updateWeekStart={updateWeekStart}
                      importBackup={importBackup}
                      onSignOut={handleSignOut}
                      guestMode={guestMode}
                      onOpenAuth={() => setAuthModalOpen(true)}
                      pushEnabled={capabilities.push_enabled}
                    />
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          )}
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav currentView={currentView} setView={setView} />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => {
          setHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onAddHabit={addHabit}
        onUpdateHabit={updateHabit}
        editingHabit={editingHabit}
        existingHabitsCount={habits.length}
      />

      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            emailCodeEnabled={capabilities.email_code_enabled}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={async (u) => {
              setUser(u);
              setAuthRequired(false);
              await migrateGuestToCloud();
              refreshInbox();
            }}
          />
        )}
      </Suspense>

      {gamification.levelCelebrationPending && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-modal-title"
          style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={gamification.clearLevelCelebration}
        >
          <div
            className="dialog-sheet card-chunky"
            style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '32px 24px', background: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'flamePulse 1.2s infinite ease-in-out' }} aria-hidden="true">
              ⚡
            </div>
            <h2 id="level-modal-title" style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>
              Tebrikler! Seviye {gamification.levelCelebrationPending}!
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>
              Düzenli adımların sayesinde yeni bir ligin kapısını araladın! +15 💎 Elmas kazandın.
            </p>
            <button
              type="button"
              className="btn-3d btn-3d-green"
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              onClick={gamification.clearLevelCelebration}
            >
              Devam Et 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
