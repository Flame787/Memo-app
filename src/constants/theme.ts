/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import type { FolderColor } from '@/lib/types';

export const Colors = {
  light: {
    text: '#000000',
    // A soft, low-saturation blue instead of flat white — enough tint to
    // feel intentional without competing with note/folder colors laid on
    // top of it. backgroundElement (cards/panels) stays a touch lighter so
    // they still read as "elevated" above this.
    background: '#D9E5F0',
    backgroundElement: '#F5F8FB',
    backgroundSelected: '#DCE7F0',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

// Union of valid color names, so `useTheme()[name]` is type-checked against the
// palette. Requires each name to exist in both light and dark.
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Shared spacing/radius scale (in px). Screens reference these named steps
// instead of hard-coded numbers so padding, gaps, and radii stay consistent.
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Swatches offered in the folder color picker (create + edit). Shared by both
// screens so they can never drift out of sync with each other.
export const FOLDER_COLORS: FolderColor[] = [
  '#E8617D',
  '#EE9B3A',
  '#E3C567',
  '#46B67F',
  '#33A6C4',
  '#6E63E5',
  '#B863C9',
  '#E888B4',
  '#D6453F',
  '#E8752E',
  '#8FAE3C',
  '#2E9E8A',
  '#2F86D6',
  '#4A4FB8',
  '#7A4FC9',
  '#A6795A',
];

// Shared "destructive action" red — every ✕ that closes a panel or removes/
// deletes something (note editor's checklist/calc rows, folder screen's
// delete-category row) uses this same tone, so red always means the same
// thing across the app. One of FOLDER_COLORS' existing tones, not a new one.
export const DESTRUCTIVE_COLOR = '#D6453F';

// Extra bottom padding to clear the OS tab bar / home indicator, per platform.
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
// Cap layout width on large/web screens so content stays readable.
export const MaxContentWidth = 800;
