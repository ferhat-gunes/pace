export const THEME_STORAGE_KEY = 'pace_theme';
export const normalizeThemePreference = value => ['light', 'dark', 'yellow'].includes(value) ? value : 'system';
export const resolveThemeMode = (preference, systemDark = false) => normalizeThemePreference(preference) === 'system' ? (systemDark ? 'dark' : 'light') : preference;
export function readThemePreference(storage) {
  try { return normalizeThemePreference(storage?.getItem(THEME_STORAGE_KEY)); } catch { return 'system'; }
}
