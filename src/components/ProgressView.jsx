import React, { useMemo, useState } from 'react';
import { CheckCircle2, TrendingUp, ClipboardList, Zap } from 'lucide-react';
import { habitStatistics, habitStreak } from '../lib/statistics.js';
import { dateKey, addDays, formatNumber, latestCheckins } from '../lib/rules.js';
import { useLocalDate } from '../lib/local-date.js';

const displayDate = key => key ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(key + 'T12:00:00')) : '—';

export default function ProgressView({ habits = [], checkins = [], weekStart = 1 }) {
  const today = useLocalDate();
  const [period, setPeriod] = useState(() => {
    try { const saved = sessionStorage.getItem('pace_progress_period'); return ['7', '30', 'all'].includes(saved) ? saved : '30'; } catch { return '30'; }
  });
  const choosePeriod = value => { setPeriod(value); try { sessionStorage.setItem('pace_progress_period', value); } catch {} };
  const stats = useMemo(() => {
    const start = period === 'all' ? '' : addDays(today, -(Number(period) - 1));
    const latest = latestCheckins(checkins);
    const habitBreakdown = habits.filter(h => !h.archived_at || latest.some(c => !c.deleted && c.habit_id === h.id)).map(h => {
      const summary = habitStatistics(h, latest, { start, end: today, weekStart });
      const streak = habitStreak(h, latest, { today, weekStart });
      return { ...summary, id: h.id, name: h.name, isArchived: Boolean(h.archived_at), streak, completionRate: summary.recordedDays ? Math.round(summary.completedDays / summary.recordedDays * 100) : null };
    });
    const totalLogs = habitBreakdown.reduce((sum, h) => sum + h.recordedDays, 0);
    const completedCount = habitBreakdown.reduce((sum, h) => sum + h.completedDays, 0);
    return { start, habitBreakdown, totalLogs, completedCount, overallRate: totalLogs ? Math.round(completedCount / totalLogs * 100) : null };
  }, [habits, checkins, period, today, weekStart]);

  return <section className="page-view" id="view-progress" aria-labelledby="progress-title">
    <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
      <div><h1 id="progress-title" style={{ margin: 0 }}>İlerleme & Ritim</h1><p className="section-subtitle">Kayıtlarını, birimli toplamlarını ve devamlılığını incele.</p></div>
      <div className="segmented-control" role="group" aria-label="Zaman aralığı seç">
        {[['7', 'Son 7 Gün'], ['30', 'Son 30 Gün'], ['all', 'Tümü']].map(([value, label], index, items) => <button key={value} type="button" className={`segmented-item ${period === value ? 'is-selected' : ''}`} aria-pressed={period === value} onClick={() => choosePeriod(value)} onKeyDown={e => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
          e.preventDefault();
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
          choosePeriod(items[next][0]); e.currentTarget.parentElement.querySelectorAll('button')[next]?.focus();
        }}>{label}</button>)}
      </div>
    </div>
    <p className="table-hint">{stats.start ? `${displayDate(stats.start)} – ${displayDate(today)}` : `Başlangıçtan ${displayDate(today)} tarihine kadar`}. Tamamlama oranı, kayıt girilen günler içinde günlük hedefine ulaşanların oranıdır; kayıt girilmeyen günler bu orana dahil değildir.</p>
    <div className="stat-grid">
      <div className="stat-card"><div className="stat-icon is-orange"><CheckCircle2 aria-hidden="true" size={24} /></div><div><div className="stat-value">{stats.completedCount}</div><div className="stat-label">Hedefe ulaşan günlük kayıt</div></div></div>
      <div className="stat-card"><div className="stat-icon is-sage"><TrendingUp aria-hidden="true" size={24} /></div><div><div className="stat-value">{stats.overallRate === null ? '—' : `%${stats.overallRate}`}</div><div className="stat-label">Kayıtlarda tamamlama</div></div></div>
      <div className="stat-card"><div className="stat-icon is-forest"><ClipboardList aria-hidden="true" size={24} /></div><div><div className="stat-value">{stats.totalLogs}</div><div className="stat-label">Kaydedilmiş alışkanlık günü</div></div></div>
    </div>
    <p className="table-hint">Seri, günlük programlarda ardışık planlı günleri; haftalık kotada ardışık tamamlanan haftaları gösterir. Henüz tamamlanmamış bugün/açık hafta önceki seriyi bozmaz. Seri tüm geçmişten hesaplanır; seçilen dönem yalnız kayıt özetlerini filtreler.</p>
    <div className="table-container" tabIndex={0} role="region" aria-label="Alışkanlık ilerleme tablosu (yatay kaydırılabilir)">
      <table className="table-standard" id="progress-table" aria-label="Alışkanlık istatistikleri özeti">
        <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Alışkanlık</th><th scope="col">Tamamlanan</th><th scope="col">Kayıtlı gün</th><th scope="col">Tamamlama</th><th scope="col">Güncel seri</th><th scope="col">Son kayıt</th></tr></thead>
        <tbody id="progress-table-body">{!stats.habitBreakdown.length ? <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center' }}>İlk kaydından sonra ilerlemen burada görünecek.</td></tr> : stats.habitBreakdown.map(item => <tr key={item.id}>
          <th scope="row" style={{ textAlign: 'left' }}>{item.name}{item.isArchived && <span style={{ display: 'block', fontWeight: 400, fontSize: 13 }}>Arşivlendi · geçmiş korunuyor</span>}</th>
          <td style={{ textAlign: 'center' }}>{item.completedDays}</td><td style={{ textAlign: 'center' }}>{item.recordedDays}</td>
          <td style={{ textAlign: 'center' }}>{item.completionRate === null ? '—' : `%${item.completionRate}`}</td>
          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{item.isArchived ? 'Arşivlendi' : <><Zap size={14} aria-hidden="true" /> {item.streak.count} {item.streak.unit}</>}</td>
          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{displayDate(item.lastDate)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="quantity-statistics" style={{ display: 'grid', gap: 20, marginTop: 24 }}>
      {stats.habitBreakdown.map(item => <section className="panel-card" key={item.id} aria-labelledby={`summary-${item.id}`}>
        <h2 id={`summary-${item.id}`} style={{ margin: '0 0 12px', fontSize: 19 }}>{item.name}</h2>
        {!item.recordedDays ? <p className="table-hint">Seçilen dönemde kayıt yok. Toplam ve ortalama henüz hesaplanmadı.</p> : item.groups.length ? <>
          {item.groups.length > 1 && <p className="table-hint">Geçmişte farklı birimler kullanılmış. Birimler birbirine eklenmeden ayrı gösterilir.</p>}
          {item.groups.map(group => <dl key={group.unit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, margin: '16px 0' }}>
            <div><dt>Toplam ({group.unit})</dt><dd style={{ margin: '6px 0 0', fontWeight: 700 }}>{formatNumber(group.total)}</dd></div>
            <div><dt>Günlük ortalama ({group.unit})</dt><dd style={{ margin: '6px 0 0', fontWeight: 700 }}>{formatNumber(group.average)}</dd></div>
            <div><dt>En yüksek ({group.unit})</dt><dd style={{ margin: '6px 0 0', fontWeight: 700 }}>{formatNumber(group.best)}</dd></div>
            <div><dt>Kayıtlı gün</dt><dd style={{ margin: '6px 0 0', fontWeight: 700 }}>{group.days}</dd></div>
          </dl>)}
          <p className="table-hint">Ortalama yalnız ilgili birimle kayıt girilen günlerden hesaplanır; açık sıfır kayıtları dahildir.</p>
        </> : <p>{item.checkDays} günde “yaptım” kaydı · {item.recordedDays} kayıtlı gün</p>}
      </section>)}
    </div>
  </section>;
}
