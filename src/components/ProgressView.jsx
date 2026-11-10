import React, { useMemo, useState } from 'react';
import { Award, Zap, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

const dateIso = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ProgressView({ habits = [], checkins = [] }) {
  const [period, setPeriod] = useState('30'); // '7' | '30' | 'all'

  const stats = useMemo(() => {
    const periodDays = period === '7' ? 7 : period === '30' ? 30 : null;
    const minDateKey = periodDays
      ? dateIso(new Date(Date.now() - (periodDays - 1) * 86400000))
      : '0000-00-00';

    // Filter checkins within selected period
    const scopedCheckins = checkins.filter(
      (c) => !c.deleted && c.habit_date >= minDateKey
    );

    let totalLogs = 0;
    let completedCount = 0;

    // Include all habits that are either active or have historical records
    const relevantHabits = habits.filter(
      (h) => !h.archived_at || checkins.some((c) => !c.deleted && c.habit_id === h.id)
    );

    const habitBreakdown = relevantHabits.map((h) => {
      const hLogs = scopedCheckins.filter((c) => c.habit_id === h.id);
      totalLogs += hLogs.length;

      const completedLogs = hLogs.filter((c) => {
        if (h.tracking === 'check') return Number(c.value) >= 1;
        return Number(c.value) >= (h.target || 1);
      });
      completedCount += completedLogs.length;

      // Streak calculation
      let currentStreak = 0;
      let checkDate = new Date();
      const allHabitLogs = checkins.filter((c) => !c.deleted && c.habit_id === h.id);
      for (let i = 0; i < 365; i++) {
        const iso = dateIso(checkDate);
        const log = allHabitLogs.find((c) => c.habit_date === iso);
        const isDone = log ? (h.tracking === 'check' ? Number(log.value) >= 1 : Number(log.value) >= (h.target || 1)) : false;
        if (isDone) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        id: h.id,
        name: h.name,
        isArchived: Boolean(h.archived_at),
        logsCount: hLogs.length,
        completedCount: completedLogs.length,
        completionRate: hLogs.length > 0 ? Math.round((completedLogs.length / hLogs.length) * 100) : 0,
        streak: currentStreak,
      };
    });

    const overallRate = totalLogs > 0 ? Math.round((completedCount / totalLogs) * 100) : 0;

    return {
      totalLogs,
      completedCount,
      overallRate,
      habitBreakdown,
    };
  }, [habits, checkins, period]);

  return (
    <section className="page-view" id="view-progress" aria-labelledby="progress-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="progress-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--forest)' }}>
            İlerleme & Ritim
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Zaman içindeki alışkanlık devamlılığın ve tutarlılık özetin.
          </p>
        </div>

        {/* Period Selector */}
        <div className="segmented-control" role="tablist" aria-label="Zaman aralığı seç">
          <button
            type="button"
            role="tab"
            aria-selected={period === '7'}
            className={`segmented-item ${period === '7' ? 'is-selected' : ''}`}
            onClick={() => setPeriod('7')}
          >
            Son 7 Gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === '30'}
            className={`segmented-item ${period === '30' ? 'is-selected' : ''}`}
            onClick={() => setPeriod('30')}
          >
            Son 30 Gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'all'}
            className={`segmented-item ${period === 'all' ? 'is-selected' : ''}`}
            onClick={() => setPeriod('all')}
          >
            Tümü
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon is-orange">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.completedCount}</div>
            <div className="stat-label">Tamamlanan Hedef</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon is-sage">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">%{stats.overallRate}</div>
            <div className="stat-label">Başarı Oranı</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon is-forest">
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalLogs}</div>
            <div className="stat-label">Toplam Kayıt</div>
          </div>
        </div>
      </div>

      {/* Progress Table Container */}
      <div
        className="table-container"
        tabIndex={0}
        role="region"
        aria-label="Alışkanlık ilerleme tablosu (yatay kaydırılabilir)"
      >
        <table className="table-standard" id="progress-table" aria-label="Alışkanlık istatistikleri özeti">
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>Alışkanlık</th>
              <th scope="col" style={{ textAlign: 'center' }}>Tamamlanan</th>
              <th scope="col" style={{ textAlign: 'center' }}>Toplam</th>
              <th scope="col" style={{ textAlign: 'center' }}>Başarı</th>
              <th scope="col" style={{ textAlign: 'center' }}>Güncel Seri</th>
            </tr>
          </thead>
          <tbody id="progress-table-body">
            {stats.habitBreakdown.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Henüz istatistik kaydı bulunmuyor.
                </td>
              </tr>
            ) : (
              stats.habitBreakdown.map((item) => (
                <tr key={item.id}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{item.name}</span>
                      {item.isArchived && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-alt)', color: 'var(--muted)' }}>
                          Arşiv
                        </span>
                      )}
                    </div>
                  </th>
                  <td style={{ textAlign: 'center' }}>{item.completedCount}</td>
                  <td style={{ textAlign: 'center' }}>{item.logsCount}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: item.completionRate >= 80 ? 'var(--forest)' : 'var(--orange-dark)' }}>
                      %{item.completionRate}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: item.streak > 0 ? 'var(--orange-dark)' : 'var(--muted)', fontWeight: 700 }}>
                      <Zap size={14} /> {item.streak} gün
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
