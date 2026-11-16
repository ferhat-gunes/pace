import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage + window mocks for Node test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const captured = [];
globalThis.window = {
  location: { origin: 'https://pace.example' },
  posthog: {
    capture: (event, properties) => captured.push({ event, properties }),
  },
};

const {
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabled,
  setFeatureFlagOverride,
  trackEvent,
  getTelemetryEvents,
  clearTelemetryEvents,
} = await import('../src/lib/telemetry.js');

const {
  DISCOVER_CATEGORIES,
  DISCOVER_PRESETS,
  findDiscoverPreset,
  buildDiscoverShareUrl,
} = await import('../src/lib/discoverCatalog.js');

test('Feature flags enforce 5-agent consensus defaults (league & mini-group off)', () => {
  localStorage.clear();
  assert.equal(DEFAULT_FEATURE_FLAGS.discover_rhythm_trials, true);
  assert.equal(DEFAULT_FEATURE_FLAGS.tally_churn_microsurvey, true);
  assert.equal(DEFAULT_FEATURE_FLAGS.weekly_league, false);
  assert.equal(DEFAULT_FEATURE_FLAGS.mini_group_match, false);

  assert.equal(isFeatureEnabled('discover_rhythm_trials'), true);
  assert.equal(isFeatureEnabled('weekly_league'), false);

  setFeatureFlagOverride('weekly_league', true);
  assert.equal(isFeatureEnabled('weekly_league'), true);
});

test('trackEvent stores bounded local events and forwards to PostHog if available', () => {
  localStorage.clear();
  clearTelemetryEvents();
  captured.length = 0;

  trackEvent('discover_template_added', { preset_id: 'focus-sprint-25' });
  const events = getTelemetryEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'discover_template_added');
  assert.equal(events[0].properties.preset_id, 'focus-sprint-25');

  assert.equal(captured.length, 1);
  assert.equal(captured[0].event, 'discover_template_added');
});

test('Discover catalog presets have valid categories, schedules, and share URLs', () => {
  assert.ok(DISCOVER_CATEGORIES.includes('Tümü'));
  assert.ok(DISCOVER_PRESETS.length >= 4);

  for (const preset of DISCOVER_PRESETS) {
    assert.ok(DISCOVER_CATEGORIES.includes(preset.category));
    assert.ok(preset.name && preset.description);
    assert.ok(['check', 'quantity'].includes(preset.tracking));
    assert.ok(['at_least', 'at_most'].includes(preset.direction));
    assert.ok(preset.schedule && preset.schedule.type);
  }

  const found = findDiscoverPreset('morning-walk-15');
  assert.equal(found?.name, 'Açık Hava Yürüyüşü');
  assert.equal(findDiscoverPreset('non-existent'), null);

  const shareUrl = buildDiscoverShareUrl('morning-walk-15', 'https://pace.ferhatgunes.com.tr');
  assert.equal(shareUrl, 'https://pace.ferhatgunes.com.tr/?view=discover&preset=morning-walk-15');
});
