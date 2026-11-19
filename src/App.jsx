import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useNavigation, clearInviteQuery } from './state/useNavigation.js';
import { useGamification } from './state/useGamification.js';
import { localDateIso } from './lib/date.js';
import { checkAndTriggerDailyReminder, updateAppBadge, fetchSocialInbox, dismissNudge } from './lib/notifications.js';
import { isFeatureEnabled } from './lib/telemetry.js';
import { stateFor, isPlannedOn } from './lib/rules.js';
import { useHabits } from './state/useHabits.js';
import * as api from './lib/api.js';
import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import HabitFormView from './components/HabitFormView.jsx';
import HabitDetailView from './components/HabitDetailView.jsx';
import { ErrorBoundary } from './components/Common/ErrorBoundary.jsx';
import { useDialogAccessibility } from './state/useDialogAccessibility.js';
import UpdateBanner from './components/Navigation/UpdateBanner.jsx';
import PwaInstallBanner from './components/Navigation/PwaInstallBanner.jsx';
import { InlineFeedback, Button, LoadingState, ErrorState } from './components/ui/index.js';

// Code splitting for secondary routes
const ProgressView = lazy(() => import('./components/ProgressView.jsx'));
const GroupsView = lazy(() => import('./components/GroupsView.jsx'));
const SettingsView = lazy(() => import('./components/SettingsView.jsx'));
const DiscoverView = lazy(() => import('./components/DiscoverView.jsx'));
const AuthModal = lazy(() => import('./components/AuthModal.jsx'));

export default function App() {
  useDialogAccessibility();
  const [currentView, setView] = useNavigation(); // 'today' | 'habits' | 'progress' | 'groups' | 'settings' | 'habit-form' | 'habit-detail'
  const [detailHabitId, setDetailHabitId] = useState(null);
  const [formReturnView, setFormReturnView] = useState('today');
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [pendingAction,setPendingAction] = useState(null);
  const [authMode,setAuthMode] = useState('login');
  const [capabilities,setCapabilities] = useState({email_code_enabled:false,push_enabled:false});
  const [socialInbox,setSocialInbox] = useState([]);
  const [highlightedPresetId,setHighlightedPresetId] = useState(null);
  const [migrationRequest,setMigrationRequest] = useState(null);
  const [migrationBusy,setMigrationBusy] = useState(false);
  const [migrationError,setMigrationError] = useState('');

  const {
    habits,
    checkins,
    groups,
    groupsError,
    user,
    guestMode, guestBackup, serverGamification, confirmedCheckins, guestDraftCount, migrateGuestToCloud, setAuthRequired,
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

  const inboxOwner=useRef(null);inboxOwner.current=api.isDemo()?'demo-user':user?.id;
  const confirmed = confirmedCheckins || checkins.filter(c => !c.sync_status || c.sync_status === 'saved');
  const gamification = useGamification(confirmed, habits, serverGamification, Boolean(user && !api.isDemo()), user?.id || (api.isDemo() ? 'demo-user' : 'guest'), weekStart);
  useEffect(() => {
    Promise.resolve(api.getAuthCapabilities?.()).then(res => { if(res) setCapabilities({email_code_enabled:Boolean(res.email_code_enabled),push_enabled:Boolean(res.push_enabled)}); }).catch(()=>{});
  }, []);
  const refreshInbox = useCallback(async () => {
    const id=api.isDemo()?'demo-user':user?.id;
    if(!id){setSocialInbox([]);return;}
    const items=await fetchSocialInbox(id);if(inboxOwner.current===id)setSocialInbox(items);
  }, [user?.id]);
  useEffect(()=>{let active=true;const refresh=async()=>{if(active)await refreshInbox()};void refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer)}},[refreshInbox]);
  const dismissInbox = id => { dismissNudge(id);setSocialInbox(items=>items.filter(item=>item.id!==id)); };
  useEffect(()=>{
    const today=localDateIso();
    const unfinished=habits.filter(h=>isPlannedOn(h,today,confirmed,weekStart)&&stateFor(h,today,confirmed,weekStart).status!=='done').length;
    updateAppBadge(unfinished);const remind=()=>{try{checkAndTriggerDailyReminder(habits,confirmed)}catch{}};remind();
    const timer=setInterval(remind,60000);return()=>clearInterval(timer);
  },[habits,confirmedCheckins,weekStart]);
  useEffect(()=>{
    const today=localDateIso();
    const planned=habits.filter(h=>isPlannedOn(h,today,confirmed,weekStart));
    if(planned.length && planned.every(h=>stateFor(h,today,confirmed,weekStart).status==='done'))gamification.awardAllDoneBonus(today);
  },[habits,confirmedCheckins,weekStart,gamification.awardAllDoneBonus]);

  // Check URL query parameters for deep linking (e.g. ?join= or ?invite=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('join') || params.get('invite');
      if (['login','register'].includes(params.get('auth'))) {setAuthMode(params.get('auth'));setAuthModalOpen(true);}
      const requestedView=params.get('view');
      if(!location.hash&&['today','habits','discover','progress','groups','settings'].includes(requestedView))setView(requestedView);
      if(params.get('preset')){setHighlightedPresetId(params.get('preset'));if(!location.hash)setView('discover');}
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

  const openAuth = (mode='login') => { if(api.demoMode){api.exitDemo();return;}setAuthMode(typeof mode==='string'?mode:'login');setAuthModalOpen(true); };
  const openCreateHabit = () => {
    if(!api.demoMode&&!user&&!guestMode){setPendingAction('createHabit');openAuth();return;}
    setEditingHabit(null);
    setFormReturnView(currentView === 'habit-form' || currentView === 'habit-detail' ? 'today' : currentView);
    setView('habit-form');
  };
  const openHabitDetail = (habit) => {
    if (!habit?.id) return;
    setDetailHabitId(habit.id);
    if (currentView !== 'habit-detail' && currentView !== 'habit-form') {
      setFormReturnView(currentView);
    }
    setView('habit-detail');
  };
  const openEditHabit = (habit, fromView = 'habit-detail') => {
    if (!habit?.id) return;
    setEditingHabit(habit);
    setFormReturnView(fromView);
    setView('habit-form');
  };
  const addStarterHabits = async (presets=[],{authorized=false}={}) => {
    if(!authorized&&!api.demoMode&&!user&&!guestMode){setPendingAction({type:'presets',presets});openAuth();return;}
    for(const preset of presets)await addHabit({name:preset.name,tracking:preset.tracking||'check',direction:preset.direction||'at_least',unit:preset.unit||'',target:preset.target||1,schedule:preset.schedule||{type:'daily'},progression:preset.progression||{enabled:false,step:0,cap:null},debt:preset.debt||{enabled:false,cap:null},start_date:selectedDate});
  };
  const confirmGuestMigration=async()=>{if(migrationBusy)return;setMigrationBusy(true);setMigrationError('');try{const result=await migrateGuestToCloud?.({confirmed:true});if(result?.success===false)throw new Error(result.error||'Yerel kayıtlar aktarılamadı.');setMigrationRequest(null);await loadData();}catch(error){setMigrationError(error.message)}finally{setMigrationBusy(false)}};

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
    <div id="app" onKeyDown={handleCompositeKeys} className="app-shell">
      <a href="#main-content" className="skip-link">
        Ana içeriğe atla
      </a>

      <Sidebar currentView={currentView} setView={setView} syncState={syncState} user={user} onOpenAuth={openAuth} />

      <div className="main-area">
        <TopBar
          setView={setView}
          user={user}
          onOpenAuth={openAuth}
          syncState={syncState}
          socialInbox={socialInbox}
          onDismissInbox={dismissInbox}
          inviteToken={inviteToken}
          streak={gamification.streak} streakFreezes={gamification.streakFreezes} isStreakFrozenToday={gamification.isStreakFrozenToday} buyStreakFreeze={gamification.buyStreakFreeze} gems={gamification.gems} level={gamification.level} xp={gamification.xp}
        />

        <main id="main-content" className="content-wrap" tabIndex={-1}>
          <ErrorBoundary key={currentView}>
          <PwaInstallBanner />
          <UpdateBanner blocked={currentView === 'habit-form' || isAuthModalOpen || Boolean(pendingEntries?.length)} />
          {api.demoMode && (
            <InlineFeedback
              tone="neutral"
              action={<Button variant="tertiary" size="sm" onClick={api.exitDemo}>Kendi hesabıma geç</Button>}
            >
              <strong>Örnek görünüm</strong> — Kayıtlar yalnızca bu tarayıcıda saklanır.
            </InlineFeedback>
          )}
          {/kaydedilemedi|Arşivlenemedi|Geri yüklenemedi|Kayıt değişti|Cihazda bekliyor/.test(syncState) && (
            <InlineFeedback tone="neutral" role="status">{syncState}</InlineFeedback>
          )}
          {guestMode && !api.demoMode && (
            <InlineFeedback
              tone="neutral"
              action={<Button variant="tertiary" size="sm" onClick={() => openAuth('register')}>Hesap oluştur</Button>}
            >
              <strong>Misafir olarak deniyorsun</strong> — Rutinlerin bu cihazda saklanır. Hesabına aktarım için girişten sonra ayrıca onayın alınır.
            </InlineFeedback>
          )}
          {migrationRequest && (
            <InlineFeedback
              tone="neutral"
              action={
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm" disabled={migrationBusy} onClick={confirmGuestMigration}>
                    {migrationBusy ? 'Aktarılıyor…' : 'Onayla ve hesabıma aktar'}
                  </Button>
                  <Button variant="tertiary" size="sm" disabled={migrationBusy} onClick={() => setMigrationRequest(null)}>
                    Şimdilik cihazda tut
                  </Button>
                </div>
              }
            >
              <strong>{migrationRequest.count || guestDraftCount} yerel alışkanlığı hesabına aktarmak ister misin?</strong> Aktarım onaylanana kadar misafir kayıtların bu cihazda korunur.
              {migrationError && <div role="alert" style={{ marginTop: 'var(--space-1)' }}>{migrationError}</div>}
            </InlineFeedback>
          )}
          {storageError && <InlineFeedback tone="error" role="alert">{storageError}</InlineFeedback>}
          {signOutError && <InlineFeedback tone="error" role="alert">{signOutError}</InlineFeedback>}
          {pendingEntries?.length > 0 && (
            <InlineFeedback tone="neutral">
              <strong>{pendingEntries.length} kayıt eşitleme bekliyor</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {pendingEntries.map(e => (
                  <div className="pending-entry" key={JSON.stringify([e.id, e.day])}>
                    <span className="mono">{habits.find(h => h.id === e.id)?.name || 'Alışkanlık'} · {e.day}: {e.value} — {e.status === 'conflict' ? 'Başka cihazda değişti' : e.error || 'Kaydediliyor…'}</span>
                    {['error', 'conflict'].includes(e.status) && (
                      <Button variant="tertiary" size="sm" onClick={() => retryEntry(e.id, e.day)}>Taslağı yeniden gönder</Button>
                    )}
                  </div>
                ))}
              </div>
            </InlineFeedback>
          )}
          {loadError && (
            <ErrorState
              title={loadError.unauthorized ? 'Alışkanlıkların için giriş yap' : 'Veriler yüklenemedi'}
              message={loadError.unauthorized ? 'Hesabına giriş yaparak kayıtlarına ulaşabilirsin.' : loadError.message}
              onRetry={loadError.unauthorized ? openAuth : loadData}
              retryLabel={loadError.unauthorized ? 'Giriş yap' : 'Yeniden dene'}
              action={loadError.unauthorized ? (
                <Button variant="tertiary" size="sm" onClick={api.startDemo}>Örnek görünümü dene</Button>
              ) : null}
            />
          )}
          {loading && habits.length === 0 ? (
            <LoadingState label="Alışkanlıklar yükleniyor…" />
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
                  gamification={gamification} socialInbox={socialInbox} onDismissInbox={dismissInbox}
                  onAddStarterHabits={addStarterHabits} guestMode={guestMode&&!api.demoMode} onOpenAuth={openAuth}
                  entryStates={entryStates} retryEntry={retryEntry} undoEntry={undoEntry}
                  completionStats={completionStats}
                  filterMode={filterMode}
                  setFilterMode={setFilterMode}
                  onOpenAddModal={openCreateHabit}
                  onOpenHabitDetail={openHabitDetail}
                  weekStart={weekStart}
                />
              )}

              {currentView === 'habits' && (
                <HabitsView
                  habits={habits}
                  onOpenAddModal={openCreateHabit}
                  onOpenDiscover={isFeatureEnabled('discover_rhythm_trials') ? () => setView('discover') : undefined}
                  onOpenHabitDetail={openHabitDetail}
                  restoreHabit={restoreHabit}
                  lastArchivedHabit={lastArchivedHabit}
                  setLastArchivedHabit={setLastArchivedHabit}
                />
              )}

              {currentView === 'habit-detail' && (
                <HabitDetailView
                  habit={habits.find((h) => h.id === detailHabitId) || null}
                  checkins={checkins}
                  weekStart={weekStart}
                  onBack={() => setView(formReturnView === 'habit-detail' || formReturnView === 'habit-form' ? 'today' : formReturnView)}
                  onEdit={(h) => openEditHabit(h, 'habit-detail')}
                />
              )}

              {currentView === 'habit-form' && (
                <HabitFormView
                  habit={editingHabit ? (habits.find((h) => h.id === editingHabit.id) || editingHabit) : null}
                  initialDate={selectedDate}
                  onBack={(target) => setView(typeof target === 'string' ? target : (formReturnView || 'today'))}
                  onUpdateHabit={updateHabit}
                  onAddHabit={addHabit}
                  onTogglePause={togglePause}
                  onArchiveHabit={archiveHabit}
                  onRestoreHabit={restoreHabit}
                />
              )}

              <Suspense fallback={<LoadingState label="Yükleniyor…" />}>
                {currentView === 'discover' && (isFeatureEnabled('discover_rhythm_trials') ? <DiscoverView habits={habits} onAddPreset={preset=>addStarterHabits([preset])} highlightedPresetId={highlightedPresetId} onClearHighlight={()=>setHighlightedPresetId(null)} onGoToday={()=>setView('today')} /> : <section id="view-discover" className="page-view"><h1>Keşfet</h1><p>Rutin şablonları şu an kapalı.</p></section>)}
                {currentView === 'progress' && (
                  <ProgressView habits={habits} checkins={checkins} weekStart={weekStart} gamification={gamification} />
                )}

                {currentView === 'groups' && (
                  <GroupsView gamification={gamification} socialInbox={socialInbox} onSocialRefresh={refreshInbox} onDismissInbox={dismissInbox} guestMode={guestMode} onOpenAuth={openAuth} weekStart={weekStart} onRequireAuth={openAuth} loadGroupsError={groupsError} groups={groups} user={user} loadData={loadData} initialInviteToken={inviteToken} onClearInviteToken={() => {setInviteToken(null);clearInviteQuery();}} />
                )}

                {currentView === 'settings' && (
                  <SettingsView
                    user={user} setUser={setUser} guestMode={guestMode} guestBackup={guestBackup} onOpenAuth={openAuth} pushEnabled={capabilities.push_enabled}
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

      <Suspense fallback={null}>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            initialMode={authMode} emailCodeEnabled={capabilities.email_code_enabled} guestHabitsCount={guestMode&&!api.demoMode?habits.length:0}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={async(u) => {
              setUser(u);setAuthRequired?.(false);await loadData();
              const migration=await migrateGuestToCloud?.();if(migration?.requiresConfirmation)setMigrationRequest(migration);
              const url=new URL(location.href);url.searchParams.delete('auth');history.replaceState({},'',url.pathname+url.search+url.hash);
              if(pendingAction==='createHabit'){setPendingAction(null);setEditingHabit(null);setFormReturnView('today');setView('habit-form');}
              else if(pendingAction?.type==='presets'){const presets=pendingAction.presets;setPendingAction(null);await addStarterHabits(presets,{authorized:true});}
              void refreshInbox();
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
