/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/hooks/use-theme-preference';

// Returns the active color palette (an object of named colors) for the
// current scheme. The scheme itself comes from useThemePreference (REQ-10):
// the OS setting until the user manually toggles it, their explicit choice
// after that.
export function useTheme() {
  const { scheme } = useThemePreference();
  return Colors[scheme];
}
