import React, { useMemo, useState } from 'react';
import { Award, Zap, CheckCircle2, TrendingUp } from 'lucide-react';

export default function ProgressView({ habits = [], checkins = [] }) {
  const [period, setPeriod] = useState('30'); // '7' | '30' | 'all'

  const activeHabits = habits.filter((h) => !h.archived_at);

  const stats = useMemo(() => {
    let totalLogs = 0;
    let completedCount = 0;

    const habitBreakdown = activeHabits.map((h) => {
      const hLogs = checkins.filter((c) => c.habit_id === h.id);
      totalLogs += hLogs.length;

      const completedLogs = hLogs.filter((c) => {
        if (h.tracking === 'check') return c.value >= 1;
        return c.value >= (h.target || 1);
      });
      completedCount += completedLogs.length;

      return {
        id: h.id,
        name: h.name,
        logsCount: hLogs.length,
        completedCount: completedLogs.length,
        completionRate: hLogs.length > 0 ? Math.round((completedLogs.length / hLogs.length) * 100) : 0,
        streak: completedLogs.length > 0 ? Math.min(completedLogs.length, 14) : 0,
      };
    });

    const overallRate = totalLogs > 0 ? Math.round((completedCount / totalLogs) * 100) : 0;

    return {
      totalLogs,
      completedCount,
      overallRate,
      habitBreakdown,
    };
  }, [activeHabits, checkins]);

  return (
    <section className="page-view" id="view-progress" aria-labelledby="progress-title">
      <div className="page-heading">
        <div>
          <h1 id="progress-title">İlerleme</h1>
          <p className="section-subtitle">Ritim ve serilerini analiz et</p>
        </div>
        <label className="period-select">
          <span className="sr-only">İlerleme dönemi</span>
          <select id="progress-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7">Son 7 gün</option>
            <option value="30">Son 30 gün</option>
            <option value="all">Tüm zamanlar</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="habit-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--orange-soft)', color: 'var(--orange-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              {stats.completedCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Tamamlanan</div>
          </div>
        </div>

        <div className="habit-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--sage-soft)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              %{stats.overallRate}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Başarı Oranı</div>
          </div>
        </div>

        <div className="habit-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--orange-soft)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              {stats.totalLogs}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Toplam Kayıt</div>
          </div>
        </div>
      </div>

      <div className="progress-table-wrap">
        <table className="progress-table" id="progress-table" aria-label="Alışkanlık istatistikleri özeti">
          <thead>
            <tr>
              <th scope="col">Alışkanlık</th>
              <th scope="col">Tamamlanan</th>
              <th scope="col">Toplam</th>
              <th scope="col">Başarı</th>
              <th scope="col">Seri</th>
            </tr>
          </thead>
          <tbody id="progress-table-body">
            {stats.habitBreakdown.map((item) => (
              <tr key={item.id}>
                <th scope="row" style={{ fontWeight: 700 }}>{item.name}</th>
                <td>{item.completedCount}</td>
                <td>{item.logsCount}</td>
                <td>
                  <span style={{ fontWeight: 700, color: item.completionRate >= 80 ? 'var(--forest)' : 'var(--orange-dark)' }}>
                    %{item.completionRate}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--orange)', fontWeight: 700 }}>
                    <Zap size={13} /> {item.streak} gün
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
