import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigation, clearInviteQuery } from './state/useNavigation.js';
import { useHabits } from './state/useHabits.js';
import * as api from './lib/api.js';
import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import HabitModal from './components/HabitModal.jsx';
import { ErrorBoundary } from './components/Common/ErrorBoundary.jsx';
import { useDialogAccessibility } from './state/useDialogAccessibility.js';
import UpdateBanner from './components/Navigation/UpdateBanner.jsx';
import PwaInstallBanner from './components/Navigation/PwaInstallBanner.jsx';

// Code splitting for secondary routes
const ProgressView = lazy(() => import('./components/ProgressView.jsx'));
const GroupsView = lazy(() => import('./components/GroupsView.jsx'));
const SettingsView = lazy(() => import('./components/SettingsView.jsx'));
const AuthModal = lazy(() => import('./components/AuthModal.jsx'));

export default function App() {
  useDialogAccessibility();
  const [currentView, setView] = useNavigation(); // 'today' | 'habits' | 'progress' | 'groups' | 'settings'
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [pendingAction,setPendingAction] = useState(null);

  const {
    habits,
    checkins,
    groups,
    groupsError,
    user,
    setUser,
    weekStart,
    updateWeekStart,
    loading,
    syncState,
    loadError,
    selectedDate,
    setSelectedDate,
    filterMode,
    setFilterMode,
    todayHabits,
    completionStats,
    logCheckin,
    entryStates, pendingEntries, retryEntry, undoEntry, storageError, clearLocalData,
    updateHabit, togglePause,
    addHabit,
    archiveHabit,
    restoreHabit,
    lastArchivedHabit,
    setLastArchivedHabit,
    importBackup,
    loadData,
  } = useHabits();

  // Check URL query parameters for deep linking (e.g. ?join= or ?invite=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('join') || params.get('invite');
      if (params.get('auth')==='login') setAuthModalOpen(true);
      if (token) {
        setInviteToken(token);
        setView('groups');
      }
    } catch (e) {}
  }, []);

  const handleCompositeKeys = e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const item = e.target.closest('[role="tab"], [role="radio"]');
    const group = item?.closest('[role="tablist"], [role="radiogroup"]');
    if (!item || !group) return;
    const items = [...group.querySelectorAll('[role="tab"], [role="radio"]')].filter(el => !el.disabled);
    const index = items.indexOf(item);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (['ArrowLeft','ArrowUp'].includes(e.key) ? -1 : 1) + items.length) % items.length;
    e.preventDefault();
    items[next]?.focus();
    items[next]?.click();
  };

  const openAuth = () => { if(api.demoMode){api.exitDemo();return;}setAuthModalOpen(true); };
  const openCreateHabit = () => {
    if(!api.demoMode&&!user){setPendingAction('createHabit');openAuth();return;}
    setEditingHabit(null);setHabitModalOpen(true);
  };
  const handleSignOut = async ({accountDeleted=false} = {}) => {
    if(signingOut)return;
    if(api.demoMode){api.exitDemo();return;}
    if(!accountDeleted&&pendingEntries?.length){setSignOutError('Önce eşitleme bekleyen kayıtlarını yeniden gönder veya geri al; taslakların korunuyor.');return;}
    setSigningOut(true);setSignOutError('');
    try {
      if(!accountDeleted)await api.request('auth/logout',{method:'POST',body:'{}'});
      try { clearLocalData?.({discardPending:accountDeleted}); }
      catch { setSignOutError('Oturum kapatıldı; tarayıcı yerel kopyayı silemedi. Paylaşılan cihazda site verilerini temizleyebilirsin.'); }
      finally { setUser(null);setView('today'); }
      await loadData();
    } catch(err){setSignOutError('Çıkış yapılamadı: '+err.message)}
    finally{setSigningOut(false)}
  };

  return (
    <div id="app" onKeyDown={handleCompositeKeys} className="app-shell astryx-app-shell" data-astryx-component="app-shell">
      <a href="#main-content" className="skip-link">
        Ana içeriğe atla
      </a>

      <Sidebar currentView={currentView} setView={setView} syncState={syncState} />

      <div className="main-area">
        <TopBar
          setView={setView}
          user={user}
          onOpenAuth={openAuth}
          syncState={syncState}
        />

        <main id="main-content" className="content-wrap" tabIndex={-1}>
          <ErrorBoundary key={currentView}>
          <PwaInstallBanner />
          <UpdateBanner blocked={isHabitModalOpen || isAuthModalOpen || Boolean(pendingEntries?.length)} />
          {api.demoMode && <aside className="context-banner" aria-label="Demo bilgisi"><strong>Örnek görünüm</strong><span>Değişiklikler yalnızca bu tarayıcıda saklanır; hesabına aktarılmaz.</span><button type="button" className="button button-quiet" onClick={api.exitDemo}>Kendi hesabıma geç</button></aside>}
          {/kaydedilemedi|Arşivlenemedi|Geri yüklenemedi|Kayıt değişti|Cihazda bekliyor/.test(syncState) && <p className="inline-message" role="status">{syncState}</p>}
          {storageError && <p className="inline-message" role="alert">{storageError}</p>}
          {signOutError && <p className="inline-message" role="alert">{signOutError}</p>}
          {pendingEntries?.length > 0 && <aside className="context-banner" aria-label="Kaydetme bekleyen kayıtlar"><strong>{pendingEntries.length} kayıt eşitleme bekliyor</strong>{pendingEntries.map(e=><div className="pending-entry" key={JSON.stringify([e.id,e.day])}><span>{habits.find(h=>h.id===e.id)?.name || 'Alışkanlık'} · {e.day}: {e.value} — {e.status==='conflict'?'Başka cihazda değişti':e.error||'Kaydediliyor…'}</span>{['error','conflict'].includes(e.status)&&<button type="button" className="button button-quiet" onClick={()=>retryEntry(e.id,e.day)}>Taslağı yeniden gönder</button>}</div>)}</aside>}
          {loadError && <aside className="context-banner is-error" role="alert">
            <strong>{loadError.unauthorized ? 'Alışkanlıkların için giriş yap' : 'Veriler yüklenemedi'}</strong>
            <span>{loadError.unauthorized ? 'Hesabına giriş yaparak kayıtlarına ulaşabilirsin.' : loadError.message}</span>
            <button type="button" className="button button-primary" onClick={loadError.unauthorized ? openAuth : loadData}>{loadError.unauthorized ? 'Giriş yap' : 'Yeniden dene'}</button>{loadError.unauthorized&&<button type="button" className="button button-quiet" onClick={api.startDemo}>Örnek görünümü dene</button>}
          </aside>}
          {loading && habits.length === 0 ? (
            <div role="status" aria-live="polite" className="loading-state" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
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
                  entryStates={entryStates} retryEntry={retryEntry} undoEntry={undoEntry}
                  completionStats={completionStats}
                  filterMode={filterMode}
                  setFilterMode={setFilterMode}
                  onOpenAddModal={openCreateHabit}
                  weekStart={weekStart}
                />
              )}

              {currentView === 'habits' && (
                <HabitsView
                  habits={habits}
                  onOpenAddModal={openCreateHabit}
                  onEditHabit={h=>{setEditingHabit(h);setHabitModalOpen(true);}}
                  onTogglePause={togglePause}
                  archiveHabit={archiveHabit}
                  restoreHabit={restoreHabit}
                  lastArchivedHabit={lastArchivedHabit}
                  setLastArchivedHabit={setLastArchivedHabit}
                />
              )}

              <Suspense fallback={<div role="status" aria-live="polite" className="loading-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor…</div>}>
                {currentView === 'progress' && (
                  <ProgressView habits={habits} checkins={checkins} weekStart={weekStart} />
                )}

                {currentView === 'groups' && (
                  <GroupsView weekStart={weekStart} onRequireAuth={openAuth} loadGroupsError={groupsError} groups={groups} user={user} loadData={loadData} initialInviteToken={inviteToken} onClearInviteToken={() => {setInviteToken(null);clearInviteQuery();}} />
                )}

                {currentView === 'settings' && (
                  <SettingsView
                    user={user}
                    habits={habits}
                    checkins={checkins}
                    weekStart={weekStart}
                    updateWeekStart={updateWeekStart}
                    importBackup={importBackup}
                    groups={groups} pendingEntries={pendingEntries} syncState={syncState}
                    onClearLocalData={clearLocalData} signingOut={signingOut}
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
        habit={editingHabit} initialDate={selectedDate}
        onUpdateHabit={updateHabit}
        onAddHabit={addHabit}
      />

      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={async(u) => { setUser(u); await loadData(); const url=new URL(location.href);url.searchParams.delete('auth');history.replaceState({},'',url.pathname+url.search+url.hash);if(pendingAction==='createHabit'){setPendingAction(null);setEditingHabit(null);setHabitModalOpen(true);} }}
          />
        )}
      </Suspense>
    </div>
  );
}
