import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { ScreenTab } from './SidebarDrawer';

interface BottomFloatingBarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  onOpenQuickActions: () => void;
}

export function BottomFloatingBar({
  currentTab,
  onSelectTab,
  onOpenQuickActions,
}: BottomFloatingBarProps) {
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isTabActive = (tab: ScreenTab) => currentTab === tab;

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: Math.max(16, insets.bottom + 8),
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pillContainer,
          {
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
            shadowColor: '#000000',
          },
        ]}
      >
        {/* 1. Inicio */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isTabActive('dashboard') ? 'home' : 'home-outline'}
            size={20}
            color={isTabActive('dashboard') ? colors.p500 : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isTabActive('dashboard') ? colors.p500 : '#94a3b8' },
            ]}
          >
            Inicio
          </Text>
        </TouchableOpacity>

        {/* 2. Presupuesto */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('presupuesto')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isTabActive('presupuesto') ? 'flag' : 'flag-outline'}
            size={20}
            color={isTabActive('presupuesto') ? colors.p500 : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isTabActive('presupuesto') ? colors.p500 : '#94a3b8' },
            ]}
          >
            Presupuesto
          </Text>
        </TouchableOpacity>

        {/* 3. Botón Central Elevado (+) */}
        <TouchableOpacity
          style={[styles.centerActionBtn, { backgroundColor: colors.p500 }]}
          onPress={onOpenQuickActions}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>

        {/* 4. Metas / Ahorros */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('ahorros')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isTabActive('ahorros') ? 'cube' : 'cube-outline'}
            size={20}
            color={isTabActive('ahorros') ? colors.p500 : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isTabActive('ahorros') ? colors.p500 : '#94a3b8' },
            ]}
          >
            Metas
          </Text>
        </TouchableOpacity>

        {/* 5. Cuentas Compartidas */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onSelectTab('compartidas')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isTabActive('compartidas') ? 'people' : 'people-outline'}
            size={20}
            color={isTabActive('compartidas') ? colors.p500 : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isTabActive('compartidas') ? colors.p500 : '#94a3b8' },
            ]}
          >
            Compartidas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 420,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  centerActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
