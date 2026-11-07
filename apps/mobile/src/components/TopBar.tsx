import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { ApicashLogo } from './ApicashLogo';

interface TopBarProps {
  title?: string;
  onOpenMenu: () => void;
}

export function TopBar({ title = 'El Sencillo', onOpenMenu }: TopBarProps) {
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.topBar,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
        },
        !isDarkMode && { backgroundColor: '#ffffff', borderBottomColor: '#e2e8f0' },
      ]}
    >
      <View style={styles.brandRow}>
        <View style={[styles.logoBadge, { backgroundColor: `${colors.p500}25` }]}>
          <ApicashLogo size={20} color={colors.p500} />
        </View>
        <Text style={[styles.brandTitle, !isDarkMode && { color: '#0f172a' }]}>{title}</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onOpenMenu}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={26} color={isDarkMode ? '#94a3b8' : '#64748b'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    padding: 6,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
  },
});
