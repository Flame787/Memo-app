// Native platforms: React Native's built-in hook already reports the correct
// light/dark scheme, so re-export it directly. The web build overrides this
// file with use-color-scheme.web.ts, which adds hydration handling.
export { useColorScheme } from 'react-native';
