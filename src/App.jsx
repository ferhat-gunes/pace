import React, { useState, Suspense, lazy } from 'react';
import { useHabits } from './state/useHabits.js';
import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import HabitModal from './components/HabitModal.jsx';

// Code splitting for secondary routes
const ProgressView = lazy(() => import('./components/ProgressView.jsx'));
const GroupsView = lazy(() => import('./components/GroupsView.jsx'));
const SettingsView = lazy(() => import('./components/SettingsView.jsx'));
const AuthModal = lazy(() => import('./components/AuthModal.jsx'));

export default function App() {
  const [currentView, setView] = useState('today'); // 'today' | 'habits' | 'progress' | 'groups' | 'settings'
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

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

  const handleSignOut = () => {
    setUser(null);
    window.location.reload();
  };

  return (
    <div id="app" className="app-shell astryx-app-shell" data-astryx-component="app-shell">
      <Sidebar currentView={currentView} setView={setView} syncState={syncState} />

      <main className="main-area">
        <TopBar
          setView={setView}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          syncState={syncState}
        />

        <div className="content-wrap">
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
                  <ProgressView habits={habits} checkins={checkins} />
                )}

                {currentView === 'groups' && (
                  <GroupsView groups={groups} user={user} loadData={loadData} />
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
        </div>

        <MobileNav currentView={currentView} setView={setView} />
      </main>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onAddHabit={addHabit}
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
    </div>
  );
}
