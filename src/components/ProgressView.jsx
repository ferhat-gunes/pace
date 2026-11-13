import React, { useMemo, useState } from 'react';
import { Award, Zap, CheckCircle2, TrendingUp, Calendar, Flame, Gem, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop } from '../lib/soundFx';
import { habitStatistics } from '../lib/statistics';
import { localDateIso, addDaysIso } from '../lib/date';

export default function ProgressView({ habits = [], checkins = [], weekStart = 1, gamification = {} }) {
  const [period, setPeriod] = useState('all'); // '7' | '30' | 'all'

  const {
    streak = 0,
    xp = 0,
    level = 1,
    levelProgress = 0,
    gems = 10,
  } = gamification;

  const stats = useMemo(() => {
    const todayIso = localDateIso();
    const periodDays = period === '7' ? 7 : period === '30' ? 30 : null;
    const minDateKey = periodDays ? addDaysIso(todayIso, -(periodDays - 1)) : '';

    let totalLogs = 0;
    let completedCount = 0;

    // Include all habits that are either active or have historical records
    const relevantHabits = habits.filter(
      (h) => !h.archived_at || checkins.some((c) => !c.deleted && c.habit_id === h.id)
    );

    const habitBreakdown = relevantHabits.map((h) => {
      const summary = habitStatistics(h, checkins, {
        start: minDateKey,
        end: todayIso,
        weekStart,
      });

      totalLogs += summary.recordedDays;
      completedCount += summary.completedDays;

      // Streak calculation
      let currentStreak = 0;
      let checkIso = todayIso;
      const allHabitLogs = checkins.filter((c) => !c.deleted && c.habit_id === h.id);
      for (let i = 0; i < 365; i++) {
        const log = allHabitLogs.find((c) => c.habit_date === checkIso);
        const isDone = log
          ? h.tracking === 'check'
            ? Number(log.value) >= 1
            : h.direction === 'at_most'
            ? Number(log.value) <= (h.target || 1)
            : Number(log.value) >= (h.target || 1)
          : false;
        if (isDone) {
          currentStreak++;
          checkIso = addDaysIso(checkIso, -1);
        } else if (i === 0) {
          checkIso = addDaysIso(checkIso, -1);
        } else {
          break;
        }
      }

      const quantitySummary = summary.groups.length > 0
        ? summary.groups
            .map((g) => `Top: ${Math.round(g.total * 10) / 10} ${g.unit} · Ort: ${Math.round(g.average * 10) / 10} · En iyi: ${Math.round(g.best * 10) / 10}`)
            .join(' | ')
        : summary.checkDays > 0
        ? `${summary.checkDays} tamamlanan gün`
        : 'Henüz kayıt yok';

      return {
        id: h.id,
        name: h.name,
        isArchived: Boolean(h.archived_at),
        logsCount: summary.recordedDays,
        completedCount: summary.completedDays,
        completionRate: summary.recordedDays > 0 ? Math.round((summary.completedDays / summary.recordedDays) * 100) : 0,
        streak: currentStreak,
        quantitySummary,
        lastDate: summary.lastDate,
      };
    });

    const overallRate = totalLogs > 0 ? Math.round((completedCount / totalLogs) * 100) : 0;

    return {
      totalLogs,
      completedCount,
      overallRate,
      habitBreakdown,
    };
  }, [habits, checkins, period, weekStart]);

  return (
    <section className="page-view" id="view-progress" aria-labelledby="progress-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="progress-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            İlerleme & Ritim
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Zaman içindeki alışkanlık devamlılığın, istatistiklerin ve deneyim puanların.
          </p>
        </div>

        {/* Period Selector */}
        <div className="segmented-control" role="tablist" aria-label="Zaman aralığı seç" style={{ maxWidth: '100%' }}>
          <button
            type="button"
            role="tab"
            aria-selected={period === '7'}
            className={`segmented-item ${period === '7' ? 'is-selected' : ''}`}
            style={{ minHeight: '44px', padding: '8px 12px' }}
            onClick={() => {
              playPop();
              setPeriod('7');
            }}
          >
            Son 7 Gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === '30'}
            className={`segmented-item ${period === '30' ? 'is-selected' : ''}`}
            style={{ minHeight: '44px', padding: '8px 12px' }}
            onClick={() => {
              playPop();
              setPeriod('30');
            }}
          >
            Son 30 Gün
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'all'}
            className={`segmented-item ${period === 'all' ? 'is-selected' : ''}`}
            style={{ minHeight: '44px', padding: '8px 12px' }}
            onClick={() => {
              playPop();
              setPeriod('all');
            }}
          >
            Tümü
          </button>
        </div>
      </div>

      {/* Gamification Level Hero Banner */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card-chunky"
        style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, rgba(206, 130, 255, 0.06) 100%)',
          marginBottom: '20px',
          borderColor: '#CE82FF',
          borderBottomColor: '#A85CE5',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FFC800 0%, #FF9600 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 10px rgba(255, 150, 0, 0.3)',
                flexShrink: 0,
              }}
            >
              <Trophy size={26} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#A85CE5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Seviye {level} • Ritim Özeti
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                {xp} XP Toplandı
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div className="gamify-badge flame-badge">
              <span className="flame-icon-pulse">🔥</span> {streak} Gün Seri
            </div>
            <div className="gamify-badge gem-badge">
              💎 {gems}
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
            <span>Sonraki Seviyeye İlerleme</span>
            <span>%{Math.round(levelProgress)}</span>
          </div>
          <div style={{ height: '12px', background: 'rgba(0, 0, 0, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, levelProgress))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #CE82FF 0%, #58CC02 100%)',
                borderRadius: '999px',
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* KPI Summary Cards */}
      <div className="stat-grid">
        <div className="stat-card card-chunky">
          <div className="stat-icon is-orange">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.completedCount}</div>
            <div className="stat-label">Tamamlanan Hedef</div>
          </div>
        </div>

        <div className="stat-card card-chunky">
          <div className="stat-icon is-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">%{stats.overallRate}</div>
            <div className="stat-label">Başarı Oranı</div>
          </div>
        </div>

        <div className="stat-card card-chunky">
          <div className="stat-icon is-green">
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalLogs}</div>
            <div className="stat-label">Toplam Kayıt</div>
          </div>
        </div>
      </div>

      {/* Mobile Habit Breakdown Cards (<768px) */}
      <div className="mobile-only-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stats.habitBreakdown.length === 0 ? (
          <div className="card-chunky" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--muted)' }}>
            Henüz istatistik kaydı bulunmuyor.
          </div>
        ) : (
          stats.habitBreakdown.map((item) => (
            <div key={item.id} className="card-chunky" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{item.name}</strong>
                    {item.isArchived && (
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '6px', background: 'var(--surface-alt)', color: 'var(--muted)' }}>
                        Arşiv
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginTop: '3px' }}>
                    {item.quantitySummary}
                  </div>
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '14px',
                    color: item.completionRate >= 80 ? 'var(--green-dark)' : 'var(--orange-dark)',
                    flexShrink: 0,
                  }}
                >
                  %{item.completionRate}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                <span>{item.completedCount} / {item.logsCount} gün</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: item.streak > 0 ? 'var(--orange-dark)' : 'var(--muted)' }}>
                  <Zap size={13} /> {item.streak} gün seri
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Progress Table Container (>=768px) */}
      <div
        className="table-container card-chunky desktop-only-table"
        tabIndex={0}
        role="region"
        aria-label="Alışkanlık ilerleme tablosu"
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
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginTop: '2px' }}>
                      {item.quantitySummary}
                      {item.lastDate ? ` · Son: ${item.lastDate}` : ''}
                    </div>
                  </th>
                  <td style={{ textAlign: 'center' }}>{item.completedCount}</td>
                  <td style={{ textAlign: 'center' }}>{item.logsCount}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: item.completionRate >= 80 ? 'var(--green-dark)' : 'var(--orange-dark)' }}>
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
