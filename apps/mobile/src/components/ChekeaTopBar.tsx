import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { ApicashLogo } from './ApicashLogo';

interface ChekeaTopBarProps {
  onOpenProfile?: () => void;
  onOpenSupport?: () => void;
  onOpenNotifications?: () => void;
  onOpenMenu: () => void;
}

export function ChekeaTopBar({
  onOpenProfile,
  onOpenSupport,
  onOpenNotifications,
  onOpenMenu,
}: ChekeaTopBarProps) {
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.topBar,
        {
          paddingTop: Math.max(insets.top, 20) + 6,
          backgroundColor: isDarkMode ? '#0a0e1a' : '#ffffff',
          borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
        },
      ]}
    >
      {/* 1. Mi cuenta (Avatar / Icono perfil izquierda) */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onOpenProfile || onOpenMenu}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
          <Ionicons name="person-circle-outline" size={24} color={isDarkMode ? '#cbd5e1' : '#475569'} />
        </View>
      </TouchableOpacity>

      {/* 2. Logo Central "Apicash" */}
      <View style={styles.centerBrand}>
        <ApicashLogo size={22} color={colors.p500} />
        <Text style={[styles.brandText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
          Apicash
        </Text>
      </View>

      {/* 3. Acciones Derecha (Soporte, Notificaciones, Menú lateral) */}
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={onOpenSupport}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubbles-outline" size={22} color={colors.p500} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionIcon}
          onPress={onOpenNotifications || onOpenMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View>
            <Ionicons name="notifications-outline" size={21} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionIcon}
          onPress={onOpenMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu-outline" size={24} color={isDarkMode ? '#ffffff' : '#0f172a'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  iconBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },
});
