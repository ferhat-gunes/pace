import React, { useState } from 'react';
import { useHabits } from './state/useHabits.js';
import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import ProgressView from './components/ProgressView.jsx';
import GroupsView from './components/GroupsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import HabitModal from './components/HabitModal.jsx';
import AuthModal from './components/AuthModal.jsx';

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
          />

          <div className="content-wrap">
            {currentView === 'today' && (
              <TodayView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                todayHabits={todayHabits}
                checkins={checkins}
                logCheckin={logCheckin}
                completionStats={completionStats}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                onOpenAddModal={() => setHabitModalOpen(true)}
              />
            )}

            {currentView === 'habits' && (
              <HabitsView
                habits={habits}
                onOpenAddModal={() => setHabitModalOpen(true)}
                archiveHabit={archiveHabit}
              />
            )}

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
                onSignOut={handleSignOut}
              />
            )}
          </div>

          <MobileNav currentView={currentView} setView={setView} />
        </main>

        <HabitModal
          isOpen={isHabitModalOpen}
          onClose={() => setHabitModalOpen(false)}
          onAddHabit={addHabit}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={(u) => setUser(u)}
        />
      </div>
  );
}
