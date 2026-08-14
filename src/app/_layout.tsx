import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotesStoreProvider } from '@/hooks/use-notes-store';

// Root layout wrapping every screen. It sets up, from outermost to innermost:
// safe-area insets, the navigation color theme, the shared notes store, and the
// stack navigator that defines the app's three routes.
export default function RootLayout() {
  const colorScheme = useColorScheme(); // follows the OS light/dark setting

  return (
    <SafeAreaProvider>
      {/* Match the navigation chrome (headers, backgrounds) to the OS theme. */}
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
    </SafeAreaProvider>
  );
}
