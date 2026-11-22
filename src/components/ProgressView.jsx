import React, { useMemo, useState } from 'react';
import { habitStatistics, habitStreak } from '../lib/statistics.js';
import { addDays, formatNumber, latestCheckins } from '../lib/rules.js';
import { useLocalDate } from '../lib/local-date.js';
import { Header, StatBlock, StreakBadge } from './ui/index.js';

const displayDate = (key) =>
  key ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(key + 'T12:00:00')) : '—';

export default function ProgressView({ habits = [], checkins = [], weekStart = 1 }) {
  const today = useLocalDate();
  const [period, setPeriod] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pace_progress_period');
      return ['7', '30', 'all'].includes(saved) ? saved : '30';
    } catch {
      return '30';
    }
  });

  const choosePeriod = (value) => {
    setPeriod(value);
    try {
      sessionStorage.setItem('pace_progress_period', value);
    } catch {}
  };

  const stats = useMemo(() => {
    const start = period === 'all' ? '' : addDays(today, -(Number(period) - 1));
    const latest = latestCheckins(checkins);
    const habitBreakdown = habits
      .filter((h) => !h.archived_at || latest.some((c) => !c.deleted && c.habit_id === h.id))
      .map((h) => {
        const summary = habitStatistics(h, latest, { start, end: today, weekStart });
        const streak = habitStreak(h, latest, { today, weekStart });
        return {
          ...summary,
          id: h.id,
          name: h.name,
          isArchived: Boolean(h.archived_at),
          streak,
          completionRate: summary.recordedDays ? Math.round((summary.completedDays / summary.recordedDays) * 100) : null,
        };
      });
    const totalLogs = habitBreakdown.reduce((sum, h) => sum + h.recordedDays, 0);
    const completedCount = habitBreakdown.reduce((sum, h) => sum + h.completedDays, 0);
    return {
      start,
      habitBreakdown,
      totalLogs,
      completedCount,
      overallRate: totalLogs ? Math.round((completedCount / totalLogs) * 100) : null,
    };
  }, [habits, checkins, period, today, weekStart]);

  const quantityItems = useMemo(
    () => stats.habitBreakdown.filter((item) => item.recordedDays > 0 && item.groups.length > 0),
    [stats.habitBreakdown]
  );

  return (
    <section className="page-view" id="view-progress" aria-label="İlerleme ve Seri">
      <Header
        title="İlerleme & Seri"
        subtitle="Kayıtlarını, birimli toplamlarını ve devamlılığını incele."
        actions={
          <div className="segmented-control" role="group" aria-label="Zaman aralığı seç">
            {[
              ['7', 'Son 7 Gün'],
              ['30', 'Son 30 Gün'],
              ['all', 'Tümü'],
            ].map(([value, label], index, items) => (
              <button
                key={value}
                type="button"
                className={`segmented-item ${period === value ? 'is-selected' : ''}`}
                aria-pressed={period === value}
                onClick={() => choosePeriod(value)}
                onKeyDown={(e) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                  e.preventDefault();
                  const next =
                    e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? items.length - 1
                        : (index + (e.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
                  choosePeriod(items[next][0]);
                  e.currentTarget.parentElement.querySelectorAll('button')[next]?.focus();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-3)',
          margin: 'var(--space-4) 0',
        }}
      >
        <StatBlock label="Tamamlanan" value={stats.completedCount} />
        <StatBlock label="Başarı Oranı" value={stats.overallRate === null ? '—' : `%${stats.overallRate}`} />
        <StatBlock label="Kayıtlı Gün" value={stats.totalLogs} />
      </div>

      <div className="table-container" tabIndex={0} role="region" aria-label="Alışkanlık ilerleme tablosu (yatay kaydırılabilir)">
        <table className="table-standard" id="progress-table" aria-label="Alışkanlık istatistikleri özeti">
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>
                Alışkanlık
              </th>
              <th scope="col">Tamamlanan</th>
              <th scope="col">Kayıtlı gün</th>
              <th scope="col">Tamamlama</th>
              <th scope="col">Güncel seri</th>
              <th scope="col">Son kayıt</th>
            </tr>
          </thead>
          <tbody id="progress-table-body">
            {!stats.habitBreakdown.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--space-7)', textAlign: 'center' }}>
                  İlk kaydından sonra ilerlemen burada görünecek.
                </td>
              </tr>
            ) : (
              stats.habitBreakdown.map((item) => (
                <tr key={item.id}>
                  <th scope="row" style={{ textAlign: 'left' }}>
                    {item.name}
                    {item.isArchived && (
                      <span className="mono" style={{ display: 'block', fontWeight: 400, fontSize: '12px', color: 'var(--fg-muted)' }}>
                        Arşivlendi · geçmiş korunuyor
                      </span>
                    )}
                  </th>
                  <td className="mono" data-label="Tamamlanan" style={{ textAlign: 'center' }}>
                    {item.completedDays}
                  </td>
                  <td className="mono" data-label="Kayıtlı gün" style={{ textAlign: 'center' }}>
                    {item.recordedDays}
                  </td>
                  <td className="mono" data-label="Tamamlama" style={{ textAlign: 'center' }}>
                    {item.completionRate === null ? '—' : `%${item.completionRate}`}
                  </td>
                  <td className="mono" data-label="Güncel seri" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {item.isArchived ? 'Arşivlendi' : <StreakBadge count={item.streak.count} unit={item.streak.unit} />}
                  </td>
                  <td className="mono" data-label="Son kayıt" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {displayDate(item.lastDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {quantityItems.length > 0 && (
        <div className="quantity-statistics" style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
          {quantityItems.map((item) => (
            <section
              key={item.id}
              aria-labelledby={`summary-${item.id}`}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
                padding: 'var(--space-4)',
              }}
            >
              <h2 id={`summary-${item.id}`} style={{ margin: '0 0 var(--space-3)', fontSize: '16px' }}>
                {item.name}
              </h2>
              {item.groups.length > 1 && (
                <p className="table-hint">Geçmişte farklı birimler kullanılmış. Birimler birbirine eklenmeden ayrı gösterilir.</p>
              )}
              {item.groups.map((group) => (
                <dl
                  key={group.unit}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 'var(--space-4)',
                    margin: 'var(--space-3) 0 0',
                  }}
                >
                  <div>
                    <dt className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      Toplam ({group.unit})
                    </dt>
                    <dd className="mono" style={{ margin: 'var(--space-1) 0 0', fontWeight: 700, fontSize: '18px' }}>
                      {formatNumber(group.total)}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      Günlük ortalama ({group.unit})
                    </dt>
                    <dd className="mono" style={{ margin: 'var(--space-1) 0 0', fontWeight: 700, fontSize: '18px' }}>
                      {formatNumber(group.average)}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      En yüksek ({group.unit})
                    </dt>
                    <dd className="mono" style={{ margin: 'var(--space-1) 0 0', fontWeight: 700, fontSize: '18px' }}>
                      {formatNumber(group.best)}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      Kayıtlı gün
                    </dt>
                    <dd className="mono" style={{ margin: 'var(--space-1) 0 0', fontWeight: 700, fontSize: '18px' }}>
                      {group.days}
                    </dd>
                  </div>
                </dl>
              ))}
            </section>
          ))}
          <p className="table-hint" style={{ margin: 0 }}>
            Ortalama yalnız ilgili birimle kayıt girilen günlerden hesaplanır; açık sıfır kayıtları dahildir.
          </p>
        </div>
      )}
    </section>
  );
}
