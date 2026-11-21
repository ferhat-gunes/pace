import React, { useEffect, useState, useCallback } from 'react';
import { Check, Plus, Users, ArrowUpRight } from 'lucide-react';
import * as api from '../../lib/api.js';
import {
  latestGroupLog,
  groupDayState,
  groupWriteBody,
  requireGroupDetail,
} from '../../lib/group-ui.js';
import { Button, StatusMarker, Icon, InlineFeedback } from '../ui/index.js';

export default function TodaySharedHabits({
  groups = [],
  user,
  selectedDate,
  today,
  onOpenGroup,
}) {
  const [details, setDetails] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const groupIdsKey = groups.map((g) => g.id).join(',');

  const loadAllDetails = useCallback(async () => {
    if (!groups.length || !user?.id) {
      setDetails([]);
      return;
    }
    const results = await Promise.allSettled(
      groups.map(async (g) => {
        const raw = await api.getGroup(g.id);
        return requireGroupDetail(raw, g.id);
      }),
    );
    const valid = results
      .filter((r) => r.status === 'fulfilled' && r.value?.group)
      .map((r) => r.value);
    setDetails(valid);
  }, [groupIdsKey, user?.id]);

  useEffect(() => {
    let active = true;
    if (!groups.length || !user?.id) {
      setDetails([]);
      return undefined;
    }
    Promise.allSettled(
      groups.map(async (g) => requireGroupDetail(await api.getGroup(g.id), g.id)),
    ).then((results) => {
      if (!active) return;
      const valid = results
        .filter((r) => r.status === 'fulfilled' && r.value?.group)
        .map((r) => r.value);
      setDetails(valid);
    });
    return () => {
      active = false;
    };
  }, [groupIdsKey, user?.id]);

  const items = details.flatMap((d) =>
    (d.habits || []).map((habit) => ({
      group: d.group,
      members: d.members || [],
      checkins: d.checkins || [],
      habit,
    })),
  );

  if (!items.length) return null;

  const isFuture = selectedDate > today;

  async function writeQuick(item, nextValue, remove = false) {
    const key = `${item.group.id}:${item.habit.id}`;
    if (busyKey) return;
    setBusyKey(key);
    setError('');
    try {
      const log = latestGroupLog(item.checkins, item.habit.id, user.id, selectedDate);
      const revision = log?.revision || 0;
      const body = groupWriteBody(remove ? 0 : nextValue, revision, crypto.randomUUID());
      if (remove) {
        await api.request(
          `groups/${encodeURIComponent(item.group.id)}/habits/${encodeURIComponent(item.habit.id)}/check-ins/${selectedDate}`,
          { method: 'DELETE', body: JSON.stringify(body) },
        );
      } else {
        await api.setGroupCheckin(item.group.id, item.habit.id, selectedDate, body);
      }
      await loadAllDetails();
    } catch (err) {
      setError(err?.message || 'Ortak alışkanlık kaydı güncellenemedi.');
      await loadAllDetails();
    } finally {
      setBusyKey('');
    }
  }

  return (
    <section
      aria-labelledby="today-shared-habits-title"
      style={{
        marginTop: 'var(--space-6)',
        borderTop: '1px solid var(--border)',
        paddingTop: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icon icon={Users} size={15} />
          <h2
            id="today-shared-habits-title"
            className="mono"
            style={{ margin: 0, fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Ortak Alışkanlıklar ({items.length})
          </h2>
        </div>
        <Button variant="tertiary" size="sm" onClick={() => onOpenGroup?.(items[0]?.group?.id)}>
          Gruplar
          <Icon icon={ArrowUpRight} size={14} />
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <InlineFeedback message={error} tone="danger" />
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {items.map((item) => {
          const { group, habit, members, checkins } = item;
          const log = latestGroupLog(checkins, habit.id, user?.id, selectedDate);
          const state = groupDayState(habit, log, selectedDate, today);
          const done = state === 'Tamamlandı';
          const currentVal = log && !log.deleted ? Number(log.value || 0) : 0;
          const completedMembers = members.filter(
            (m) => groupDayState(habit, latestGroupLog(checkins, habit.id, m.user_id, selectedDate), selectedDate, today) === 'Tamamlandı',
          ).length;
          const rowKey = `${group.id}:${habit.id}`;
          const isBusy = busyKey === rowKey;

          return (
            <div
              key={rowKey}
              style={{
                border: `1px solid ${done ? 'var(--signal)' : 'var(--border)'}`,
                backgroundColor: done ? 'var(--surface-2)' : 'var(--surface-1)',
                padding: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <StatusMarker status={done ? 'done' : 'missed'} size={10} />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{habit.name}</span>
                  <button
                    type="button"
                    onClick={() => onOpenGroup?.(group.id)}
                    className="mono"
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-2)',
                      color: 'var(--fg-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {group.name}
                  </button>
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '4px' }}>
                  {habit.tracking === 'quantity'
                    ? `${currentVal} / ${habit.target} ${habit.unit || ''}`.trim()
                    : done
                      ? 'Tamamlandı'
                      : 'Bekliyor'}
                  {members.length > 0 ? ` · ${completedMembers}/${members.length} üye` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {habit.tracking === 'check' ? (
                  <Button
                    variant={done ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={isFuture || Boolean(busyKey)}
                    loading={isBusy}
                    onClick={() => writeQuick(item, 1, done)}
                    aria-label={`${habit.name} ortak alışkanlığını ${done ? 'geri al' : 'tamamla'}`}
                  >
                    <Icon icon={Check} size={14} />
                    {done ? 'Tamamlandı' : 'Tamamla'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isFuture || Boolean(busyKey)}
                      loading={isBusy}
                      onClick={() => writeQuick(item, Number((currentVal + 1).toFixed(4)), false)}
                      aria-label={`${habit.name} değerini 1 artır`}
                    >
                      <Icon icon={Plus} size={14} />
                      1
                    </Button>
                    {!done && habit.direction !== 'at_most' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isFuture || Boolean(busyKey)}
                        onClick={() => writeQuick(item, Number(habit.target), false)}
                        aria-label={`${habit.name} hedefini tamamla`}
                      >
                        <Icon icon={Check} size={14} />
                        Hedef
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
