import React from 'react';
import { Gift, Shield, Flame, Gem } from 'lucide-react';
import { addDays, dateKey } from '../lib/rules.js';
import FrictionMicroSurvey from './Common/FrictionMicroSurvey.jsx';

export default function DailyEngagement({ gamification, checkins = [], socialInbox = [], onDismissInbox }) {
  const today = dateKey();
  const previousDates = checkins.filter(c => !c.deleted && c.habit_date < today).map(c => c.habit_date).sort();
  const comeback = previousDates.length > 0 && previousDates.at(-1) <= addDays(today, -4);
  const g = gamification;
  return <div className="daily-engagement" style={{ display: 'grid', gap: 16, marginBottom: 22 }}>
    {socialInbox.map(item => <aside key={item.id} className="context-banner" aria-label="Arkadaşından mesaj"><span aria-hidden="true">{item.emoji || '👋'}</span><span><strong>{item.sender_display || item.senderDisplayName || 'Arkadaşın'}</strong> {item.message}</span><button type="button" className="button button-quiet" onClick={() => onDismissInbox?.(item.id)}>Okudum</button></aside>)}
    {g && <section className="panel-card daily-quest-banner" aria-labelledby="daily-quest-title" style={{ padding: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div><h2 id="daily-quest-title" style={{ margin: '0 0 6px', fontSize: 18 }}><Gift size={20} aria-hidden="true" /> Günlük ritim sandığı</h2><p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{g.todayCompletedCount} / {g.questTarget} hedef tamamlandı · +40 XP ve 10 elmas</p></div>
        <button type="button" className="button button-primary quest-chest-btn" disabled={!g.isQuestCompleted || g.isQuestClaimed} onClick={g.claimDailyChest}>{g.isQuestClaimed ? 'Bugünün ödülü alındı' : g.isQuestCompleted ? 'Sandığı aç' : 'Hedefleri tamamla'}</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: 14, fontSize: 13 }}><span><Flame size={16} aria-hidden="true" /> {g.streak} günlük seri</span><span><Gem size={16} aria-hidden="true" /> {g.gems} elmas</span><span><Shield size={16} aria-hidden="true" /> {g.streakFreezes} seri kalkanı</span></div>
      {g.isStreakFrozenToday && <p className="table-hint">Seri kalkanın önceki günkü aranı korudu.</p>}
    </section>}
    {comeback && <aside className="panel-card" style={{ padding: 18 }}><strong>Kaldığın yerden hafifçe devam et</strong><p className="table-hint">Ara vermek normaldir. Bugün tek bir küçük adımla başlayabilirsin.</p><FrictionMicroSurvey todayIso={today} /></aside>}
  </div>;
}
