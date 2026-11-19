import React, { useMemo, useState } from 'react';
import { Plus, Check, Share2 } from 'lucide-react';
import {
  DISCOVER_CATEGORIES,
  DISCOVER_PRESETS,
  findDiscoverPreset,
  buildDiscoverShareUrl,
} from '../lib/discoverCatalog';
import { trackEvent } from '../lib/telemetry';
import { playPop, playSuccess } from '../lib/soundFx';
import { Button, Header, InlineFeedback, StatBlock, TabNav } from './ui/index.js';

export default function DiscoverView({
  habits = [],
  onAddPreset,
  highlightedPresetId = null,
  onClearHighlight,
  onGoToday,
}) {
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [addingId, setAddingId] = useState(null);
  const [sharedId, setSharedId] = useState(null);

  const existingNames = useMemo(() => {
    return new Set(
      habits
        .filter((h) => !h.archived_at)
        .map((h) => String(h.name || '').trim().toLowerCase())
    );
  }, [habits]);

  const highlightedPreset = useMemo(
    () => findDiscoverPreset(highlightedPresetId),
    [highlightedPresetId]
  );

  const visiblePresets = useMemo(() => {
    const list =
      selectedCategory === 'Tümü'
        ? DISCOVER_PRESETS
        : DISCOVER_PRESETS.filter((p) => p.category === selectedCategory);
    if (!highlightedPreset) return list;
    return [highlightedPreset, ...list.filter((p) => p.id !== highlightedPreset.id)];
  }, [selectedCategory, highlightedPreset]);

  const handleAdd = async (preset) => {
    if (addingId) return;
    setAddingId(preset.id);
    playPop();
    try {
      await onAddPreset?.(preset);
      playSuccess();
      trackEvent('discover_template_added', {
        preset_id: preset.id,
        category: preset.category,
        tracking: preset.tracking,
      });
    } finally {
      setAddingId(null);
    }
  };

  const handleShare = async (preset) => {
    playPop();
    const url = buildDiscoverShareUrl(preset.id);
    const shareText = `PACE'te "${preset.name}" rutin şablonuna birlikte başlayalım mı?`;
    let shared = false;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `PACE • ${preset.name}`,
          text: shareText,
          url,
        });
        shared = true;
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} ${url}`);
        shared = true;
      }
    } catch {
      // User cancelled native share or clipboard unavailable
    }

    if (shared) {
      setSharedId(preset.id);
      trackEvent('discover_template_shared', {
        preset_id: preset.id,
        category: preset.category,
      });
      setTimeout(() => {
        setSharedId((prev) => (prev === preset.id ? null : prev));
      }, 2400);
    }
  };

  const categoryTabs = useMemo(
    () => DISCOVER_CATEGORIES.map((category) => ({ id: category, label: category })),
    []
  );

  return (
    <section id="view-discover" aria-labelledby="discover-title" style={{ display: 'flex', flexDirection: 'column' }}>
      <Header
        title="Rutin Şablonları"
        subtitle="Yarış veya sıralama baskısı olmadan, tek dokunuşla kendi hızında yeni rutinler dene."
        actions={
          <Button variant="secondary" onClick={() => onGoToday?.()}>
            Bugün’e Dön
          </Button>
        }
      />

      <TabNav
        tabs={categoryTabs}
        activeId={selectedCategory}
        onChange={(id) => {
          playPop();
          setSelectedCategory(id);
        }}
      />

      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {highlightedPreset && (
          <div
            style={{
              border: '2px solid var(--signal)',
              backgroundColor: 'var(--surface-1)',
              padding: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <InlineFeedback message={`Paylaşılan öneri: ${highlightedPreset.name}`} tone="signal" />
            {onClearHighlight && (
              <Button variant="secondary" onClick={onClearHighlight}>
                Tümünü Gör
              </Button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
          <StatBlock label="Şablon" value={visiblePresets.length} />
          <StatBlock label="Listende" value={existingNames.size} highlight={existingNames.size > 0} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {visiblePresets.map((preset) => {
            const alreadyAdded = existingNames.has(preset.name.toLowerCase());
            const isAdding = addingId === preset.id;
            const isShared = sharedId === preset.id;
            const isHighlighted = highlightedPresetId === preset.id;

            return (
              <article
                key={preset.id}
                style={{
                  border: isHighlighted ? '2px solid var(--signal)' : '1px solid var(--border)',
                  backgroundColor: 'var(--surface-1)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                  transition: 'border-color 120ms linear',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--fg)',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--surface-2)',
                        padding: '2px var(--space-2)',
                      }}
                    >
                      {preset.category}
                    </span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                      {preset.durationLabel}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)' }}>
                    {preset.name}
                  </h2>
                  <p style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--fg-muted)' }}>
                    {preset.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <Button
                    variant={alreadyAdded ? 'secondary' : 'primary'}
                    disabled={alreadyAdded || isAdding}
                    loading={isAdding}
                    onClick={() => handleAdd(preset)}
                    style={{ flex: 1 }}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check size={16} aria-hidden="true" />
                        <span>Listende Var</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} aria-hidden="true" />
                        <span>{isAdding ? 'Ekleniyor…' : 'Rutinlerime Ekle'}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    aria-label={`${preset.name} şablonunu arkadaşına öner`}
                    title="Arkadaşına Öner"
                    onClick={() => handleShare(preset)}
                  >
                    {isShared ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
                    {isShared && <span>Kopyalandı</span>}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
