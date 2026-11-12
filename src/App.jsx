import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useHabits } from './state/useHabits.js';
import { useGamification } from './state/useGamification.js';
import * as api from './lib/api.js';
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
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  const {
    habits,
    checkins,
    groups,
    user,
    setUser,
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
    logCheckin,
    addHabit,
    archiveHabit,
    restoreHabit,
    lastArchivedHabit,
    setLastArchivedHabit,
    importBackup,
    loadData,
  } = useHabits();

  const gamification = useGamification(checkins, habits);

  // Check URL query parameters for deep linking (e.g. ?join= or ?invite=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('join') || params.get('invite');
      if (token) {
        setInviteToken(token);
        setView('groups');
      }
    } catch (e) {}
  }, []);

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
    } catch {}
    setUser(null);
    window.location.reload();
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
          <ErrorBoundary>
          <PwaInstallBanner />
          {loading && habits.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Alışkanlıklar yükleniyor…</div>
            </div>
          ) : (
            <>
              {currentView === 'today' && (
                <TodayView
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  todayHabits={todayHabits}
                  habits={habits}
                  checkins={checkins}
                  logCheckin={logCheckin}
                  completionStats={completionStats}
                  filterMode={filterMode}
                  setFilterMode={setFilterMode}
                  onOpenAddModal={() => setHabitModalOpen(true)}
                  weekStart={weekStart}
                  questTarget={gamification.questTarget}
                  todayCompletedCount={gamification.todayCompletedCount}
                  isQuestCompleted={gamification.isQuestCompleted}
                  isQuestClaimed={gamification.isQuestClaimed}
                  claimDailyChest={gamification.claimDailyChest}
                  addXp={gamification.addXp}
                  streakFreezes={gamification.streakFreezes}
                  isStreakFrozenToday={gamification.isStreakFrozenToday}
                  streak={gamification.streak}
                />
              )}

              {currentView === 'habits' && (
                <HabitsView
                  habits={habits}
                  onOpenAddModal={() => setHabitModalOpen(true)}
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
                  />
                )}
              </Suspense>
            </>
          )}
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav currentView={currentView} setView={setView} />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onAddHabit={addHabit}
        existingHabitsCount={habits.length}
      />

      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={(u) => setUser(u)}
          />
        )}
      </Suspense>

      {gamification.levelCelebrationPending && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={gamification.clearLevelCelebration}
        >
          <div
            className="dialog-sheet card-chunky"
            style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '32px 24px', background: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'flamePulse 1.2s infinite ease-in-out' }}>
              ⚡
            </div>
            <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--forest)', margin: '0 0 8px' }}>
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
