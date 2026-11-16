import React, { useMemo, useState } from 'react';
import { Compass, Plus, Check, Share2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  DISCOVER_CATEGORIES,
  DISCOVER_PRESETS,
  findDiscoverPreset,
  buildDiscoverShareUrl,
} from '../lib/discoverCatalog';
import { trackEvent } from '../lib/telemetry';
import { playPop, playSuccess } from '../lib/soundFx';

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
    const shareText = `PACE'te "${preset.name}" ritim denemesine birlikte başlayalım mı?`;
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

  return (
    <section className="page-view" id="view-discover" aria-labelledby="discover-title">
      <div
        className="page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            id="discover-title"
            style={{
              margin: 0,
              fontSize: 'clamp(22px, 4vw, 28px)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Compass size={24} aria-hidden="true" style={{ color: 'var(--primary)' }} />
            <span>Ritim Denemeleri</span>
          </h1>
          <p className="section-subtitle" style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Yarış veya sıralama baskısı olmadan, tek dokunuşla kendi hızında yeni rutinler dene.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-soft"
          style={{ minHeight: '44px', padding: '0 14px', fontSize: '13px' }}
          onClick={() => onGoToday?.()}
        >
          Bugün’e Dön
        </button>
      </div>

      {highlightedPreset && (
        <div
          className="card-chunky"
          style={{
            background: 'var(--primary-soft)',
            borderColor: 'var(--primary)',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
            <Sparkles size={18} style={{ color: 'var(--primary-dark)' }} aria-hidden="true" />
            <span>
              Paylaşılan öneri: <strong>{highlightedPreset.name}</strong>
            </span>
          </div>
          {onClearHighlight && (
            <button
              type="button"
              className="btn btn-soft"
              style={{ minHeight: '36px', padding: '0 10px', fontSize: '12px' }}
              onClick={onClearHighlight}
            >
              Tümünü Gör
            </button>
          )}
        </div>
      )}

      {/* Category Filter Pills */}
      <div
        role="tablist"
        aria-label="Ritim kategorileri"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}
      >
        {DISCOVER_CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                playPop();
                setSelectedCategory(category);
              }}
              style={{
                minHeight: '40px',
                padding: '0 14px',
                borderRadius: '999px',
                border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: active ? 'var(--primary-soft)' : 'var(--surface)',
                color: active ? 'var(--primary-dark)' : 'var(--ink)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Presets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '14px',
        }}
      >
        {visiblePresets.map((preset) => {
          const alreadyAdded = existingNames.has(preset.name.toLowerCase());
          const isAdding = addingId === preset.id;
          const isShared = sharedId === preset.id;

          return (
            <motion.article
              key={preset.id}
              layout
              className="card-chunky"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                borderColor: highlightedPresetId === preset.id ? 'var(--primary)' : undefined,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--primary-dark)',
                      background: 'var(--primary-soft)',
                      padding: '3px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {preset.category}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                    {preset.durationLabel}
                  </span>
                </div>

                <h2 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                  {preset.name}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: 'var(--muted)' }}>
                  {preset.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={alreadyAdded || isAdding}
                  className={alreadyAdded ? 'btn btn-soft' : 'btn-3d btn-3d-green'}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    padding: '0 12px',
                    fontSize: '13px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onClick={() => handleAdd(preset)}
                >
                  {alreadyAdded ? (
                    <>
                      <Check size={16} aria-hidden="true" />
                      <span>Listende Var</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} aria-hidden="true" />
                      <span>{isAdding ? 'Ekleniyor...' : 'Ritimime Ekle'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-soft"
                  aria-label={`${preset.name} ritimini arkadaşına öner`}
                  title="Arkadaşına Öner"
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: '0 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  onClick={() => handleShare(preset)}
                >
                  {isShared ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
                  {isShared && <span>Kopyalandı</span>}
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
