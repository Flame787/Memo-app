// Persistent search input (REQ-09 — text search; voice search stays
// deferred, D-03/D-12), shared by the homepage, folder screen, and note
// editor so all three "look" like the same feature. A normal flex child
// placed as the last sibling in a screen's column layout, not
// `position: absolute` — a flex column's last child already lands right
// after the space its scrollable sibling doesn't use, which reads as
// "pinned at the bottom" without needing z-index or keyboard-avoiding
// workarounds an absolutely-positioned bar would.
import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/appearance';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  resultCount,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // Optional "N found" hint shown while there's a query — used by the note
  // editor, where the result is a highlight/scroll rather than a filtered
  // list the user can just count by eye.
  resultCount?: number;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <Search size={18} color={withAlpha(theme.text, 0.6)} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={withAlpha(theme.text, 0.5)}
        style={[styles.input, { color: theme.text }]}
      />
      {value.length > 0 && resultCount !== undefined && (
        <ThemedText type="small" themeColor="textSecondary">
          {resultCount === 0 ? 'No matches' : `${resultCount} found`}
        </ThemedText>
      )}
      {/* Only clears the query — same ink color as the rest of the bar, never
          red. Red is reserved for "this removes something" (constants/
          theme.ts's DESTRUCTIVE_COLOR); clearing search text doesn't. */}
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <View style={styles.clearButton}>
            <X size={16} color={theme.text} />
          </View>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
    // Symmetric with marginTop — without this the bar sits flush against the
    // screen's bottom edge (SafeAreaView's bottom inset is 0 on web, and
    // even on-device with a real inset it still read as cramped right above
    // it), instead of having its own breathing room like every other panel.
    marginBottom: Spacing.two,
  },
  input: { flex: 1, fontSize: 16 },
  clearButton: { paddingLeft: Spacing.one },
});
