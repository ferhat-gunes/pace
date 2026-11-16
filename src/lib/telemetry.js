/**
 * Privacy-first telemetry & feature-flag layer (PostHog-compatible).
 * Stores a bounded local event log offline and forwards to window.posthog
 * only if an analytics client is explicitly initialized.
 */

const EVENTS_KEY = 'pace_telemetry_events';
const FLAGS_KEY = 'pace_feature_flags';
const MAX_LOCAL_EVENTS = 200;

export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  discover_rhythm_trials: true,
  tally_churn_microsurvey: true,
  // Explicitly disabled per 5-agent critical debate & 6-persona survey consensus
  weekly_league: false,
  mini_group_match: false,
});

function safeReadJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function getFeatureFlags() {
  const overrides = safeReadJson(FLAGS_KEY, {});
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...(overrides && typeof overrides === 'object' ? overrides : {}),
  };
}

export function isFeatureEnabled(flagName) {
  const flags = getFeatureFlags();
  return Boolean(flags[flagName]);
}

export function setFeatureFlagOverride(flagName, enabled) {
  const overrides = safeReadJson(FLAGS_KEY, {});
  const next = {
    ...(overrides && typeof overrides === 'object' ? overrides : {}),
    [flagName]: Boolean(enabled),
  };
  safeWriteJson(FLAGS_KEY, next);
  return getFeatureFlags();
}

export function trackEvent(eventName, properties = {}) {
  if (!eventName || typeof eventName !== 'string') return null;

  const entry = {
    event: eventName,
    properties: properties && typeof properties === 'object' ? { ...properties } : {},
    timestamp: new Date().toISOString(),
  };

  const existing = safeReadJson(EVENTS_KEY, []);
  const list = Array.isArray(existing) ? existing : [];
  const next = [...list.slice(-(MAX_LOCAL_EVENTS - 1)), entry];
  safeWriteJson(EVENTS_KEY, next);

  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, entry.properties);
    }
  } catch {
    // Never let analytics throw into UI
  }

  return entry;
}

export function getTelemetryEvents() {
  const list = safeReadJson(EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function clearTelemetryEvents() {
  safeWriteJson(EVENTS_KEY, []);
}
