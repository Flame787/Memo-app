import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotesStoreProvider } from '@/hooks/use-notes-store';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-preference';

// Root layout wrapping every screen. It sets up, from outermost to innermost:
// safe-area insets, the dark/light preference (REQ-10), the shared notes
// store, and the stack navigator that defines the app's three routes.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Must sit above Navigation (below) so it can read the resolved scheme. */}
      <ThemePreferenceProvider>
        <Navigation />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

// Split out so it can call useThemePreference() — that hook only works inside
// ThemePreferenceProvider, which wraps this component, not the other way round.
function Navigation() {
  const { scheme } = useThemePreference();

  return (
    // Match the navigation chrome (headers, backgrounds) to the resolved theme.
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Provider must sit above the Stack so every screen can read the store. */}
      <NotesStoreProvider>
        <Stack>
          {/* Home: list of folders. */}
          <Stack.Screen name="index" options={{ title: 'Memo' }} />
          {/* Folder detail: title is set dynamically from the folder name. */}
          <Stack.Screen name="folder/[id]" options={{ title: '' }} />
          {/* Note editor: presented as a card (modal-style) over the stack. */}
          <Stack.Screen name="note/[id]" options={{ title: '', presentation: 'card' }} />
        </Stack>
      </NotesStoreProvider>
    </ThemeProvider>
  );
}
