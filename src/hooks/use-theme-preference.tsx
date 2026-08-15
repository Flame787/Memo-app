// Dark/light mode preference (REQ-10). Resolves to one of two states:
//   - no manual choice yet -> follow the OS scheme (`useColorScheme()`), so a
//     fresh install matches the phone's current setting on first launch.
//   - a manual choice was made -> that choice wins and persists, and the app
//     stops following OS scheme changes from then on (a user who explicitly
//     picked "Light" should not have the app flip to dark just because their
//     phone's system theme changed later).
// The override is stored in SQLite (storage.ts's `meta` table, the same one
// the first-launch seed flag uses) so it survives app restarts.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeOverride, setThemeOverride } from '@/lib/storage';

type ColorScheme = 'light' | 'dark';

type ThemePreference = {
  scheme: ColorScheme; // the effective scheme to render the app with
  isOverridden: boolean; // whether a manual choice exists (vs. following the OS)
  setScheme: (value: ColorScheme) => void; // pick light or dark explicitly; persists as a manual choice
};

const ThemePreferenceContext = createContext<ThemePreference | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  // Read any previously saved choice once, on mount. Until this resolves, the
  // app simply renders with the OS scheme — the same thing a fresh install
  // would show anyway, so there is nothing to gate rendering on here.
  useEffect(() => {
    getThemeOverride().then(setOverride);
  }, []);

  const scheme: ColorScheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  function setScheme(next: ColorScheme) {
    setOverride(next); // update immediately so the buttons feel instant
    setThemeOverride(next).catch((err) => console.error('[theme] failed to persist override:', err));
  }

  return (
    <ThemePreferenceContext.Provider value={{ scheme, isOverridden: override !== null, setScheme }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreference {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
