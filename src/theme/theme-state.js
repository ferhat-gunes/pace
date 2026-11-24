export const THEME_STORAGE_KEY = 'pace_theme';
export const normalizeThemePreference = value => ['light', 'dark', 'playful', 'playful-dark'].includes(value) ? value : 'system';
export const resolveThemeMode = (preference, systemDark = false) => {
  const normalized = normalizeThemePreference(preference);
  return normalized === 'system' ? (systemDark ? 'dark' : 'light') : normalized;
};
export function readThemePreference(storage) {
  try { return normalizeThemePreference(storage?.getItem(THEME_STORAGE_KEY)); } catch { return 'system'; }
}
