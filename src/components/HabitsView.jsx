import React, { useState } from 'react';
import { Plus, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTarget } from '../lib/rules';

export default function HabitsView({ habits = [], onOpenAddModal, archiveHabit }) {
  const [showArchived, setShowArchived] = useState(false);

  const activeHabits = habits.filter((h) => !h.archived_at);
  const archivedHabits = habits.filter((h) => Boolean(h.archived_at));

  return (
    <section className="page-view" id="view-habits" aria-labelledby="habits-title">
      <div className="page-heading">
        <div>
          <h1 id="habits-title">Alışkanlıklar</h1>
          <p className="section-subtitle">{activeHabits.length} aktif rutin</p>
        </div>
        <button
          type="button"
          className="button button-primary add-habit-trigger"
          onClick={onOpenAddModal}
        >
          Alışkanlık ekle +
        </button>
      </div>

      <div id="all-habits-list" className="habit-list">
        {activeHabits.map((h) => (
          <div key={h.id} className="habit-row">
            <div className="habit-main">
              <strong className="habit-name">{h.name}</strong>
              <span className="habit-meta">{formatTarget(h)}</span>
            </div>
            <div className="habit-actions">
              <button
                type="button"
                className="button button-quiet"
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => archiveHabit?.(h.id)}
              >
                Arşivle
              </button>
            </div>
          </div>
        ))}
      </div>

      {archivedHabits.length > 0 && (
        <details
          id="archived-habits"
          className="archive-section"
          open={showArchived}
          onToggle={(e) => setShowArchived(e.target.open)}
          style={{ marginTop: '24px' }}
        >
          <summary>Arşivlenenler ({archivedHabits.length})</summary>
          <div id="archive-list" className="habit-list" style={{ marginTop: '12px' }}>
            {archivedHabits.map((h) => (
              <div key={h.id} className="habit-row" style={{ opacity: 0.7 }}>
                <div className="habit-main">
                  <strong className="habit-name">{h.name}</strong>
                  <span className="habit-meta">{formatTarget(h)} • Arşivlendi</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
