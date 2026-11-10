import React, { useMemo, useState } from 'react';
import { Award, Zap, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

const dateIso = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function ProgressView({ habits = [], checkins = [] }) {
  const [period, setPeriod] = useState('30'); // '7' | '30' | 'all'

  const activeHabits = habits.filter((h) => !h.archived_at);

  const stats = useMemo(() => {
    const today = new Date();
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

    const habitBreakdown = activeHabits.map((h) => {
      const hLogs = scopedCheckins.filter((c) => c.habit_id === h.id);
      totalLogs += hLogs.length;

      const completedLogs = hLogs.filter((c) => {
        if (h.tracking === 'check') return Number(c.value) >= 1;
        return Number(c.value) >= (h.target || 1);
      });
      completedCount += completedLogs.length;

      // Real streak calculation: consecutive calendar days backwards
      let currentStreak = 0;
      let checkDate = new Date();
      // Check if today is completed or yesterday
      const allHabitLogs = checkins.filter(c => !c.deleted && c.habit_id === h.id);
      for (let i = 0; i < 365; i++) {
        const iso = dateIso(checkDate);
        const log = allHabitLogs.find(c => c.habit_date === iso);
        const isDone = log ? (h.tracking === 'check' ? Number(log.value) >= 1 : Number(log.value) >= (h.target || 1)) : false;
        if (isDone) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          // If today isn't done yet, check if yesterday was done
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        id: h.id,
        name: h.name,
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
  }, [activeHabits, checkins, period]);

  return (
    <section className="page-view" id="view-progress" aria-labelledby="progress-title">
      <div className="page-heading">
        <div>
          <h1 id="progress-title">İlerleme</h1>
          <p className="section-subtitle">Ritim ve serilerini analiz et</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="period-select" htmlFor="progress-period" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--muted)' }} />
            <span className="sr-only">İlerleme dönemi</span>
            <select
              id="progress-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              <option value="7">Son 7 gün</option>
              <option value="30">Son 30 gün</option>
              <option value="all">Tüm zamanlar</option>
            </select>
          </label>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div
          className="stat-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(36, 76, 58, 0.04)',
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--orange-soft)', color: 'var(--orange-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              {stats.completedCount}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Tamamlanan Hedef</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(36, 76, 58, 0.04)',
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--sage-soft)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              %{stats.overallRate}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Başarı Oranı</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(36, 76, 58, 0.04)',
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--forest-soft)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--forest)' }}>
              {stats.totalLogs}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Toplam Kayıt</div>
          </div>
        </div>
      </div>

      {/* Progress Table */}
      <div
        className="progress-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Alışkanlık ilerleme tablosu (yatay kaydırılabilir)"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(36, 76, 58, 0.04)',
        }}
      >
        <table className="progress-table" id="progress-table" aria-label="Alışkanlık istatistikleri özeti" style={{ width: '100%', minWidth: '540px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
              <th scope="col" style={{ textAlign: 'left', padding: '14px 16px' }}>Alışkanlık</th>
              <th scope="col" style={{ textAlign: 'center', padding: '14px 16px' }}>Tamamlanan</th>
              <th scope="col" style={{ textAlign: 'center', padding: '14px 16px' }}>Toplam</th>
              <th scope="col" style={{ textAlign: 'center', padding: '14px 16px' }}>Başarı</th>
              <th scope="col" style={{ textAlign: 'center', padding: '14px 16px' }}>Güncel Seri</th>
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
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <th scope="row" style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>
                    {item.name}
                  </th>
                  <td style={{ textAlign: 'center', padding: '14px 16px' }}>{item.completedCount}</td>
                  <td style={{ textAlign: 'center', padding: '14px 16px' }}>{item.logsCount}</td>
                  <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                    <span style={{ fontWeight: 700, color: item.completionRate >= 80 ? 'var(--forest)' : 'var(--orange-dark)' }}>
                      %{item.completionRate}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px 16px' }}>
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
