import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { ScreenTab } from './SidebarDrawer';

interface QuickActionsGridProps {
  onNavigateTab: (tab: ScreenTab) => void;
  onOpenNewTransaction: () => void;
}

export function QuickActionsGrid({
  onNavigateTab,
  onOpenNewTransaction,
}: QuickActionsGridProps) {
  const { colors, isDarkMode } = useAppTheme();

  const actions = [
    {
      id: 'editar',
      name: 'Editar',
      icon: 'pencil-outline' as const,
      color: '#3b82f6',
      onPress: () => onNavigateTab('cuentas'),
    },
    {
      id: 'escanear',
      name: 'Escanear',
      icon: 'camera-outline' as const,
      color: '#8b5cf6',
      onPress: () => onOpenNewTransaction(),
    },
    {
      id: 'calculadora',
      name: 'Calculadora',
      icon: 'calculator-outline' as const,
      color: '#f59e0b',
      onPress: () => onNavigateTab('calculadora'),
    },
    {
      id: 'credito',
      name: 'Crédito',
      icon: 'card-outline' as const,
      color: '#ec4899',
      onPress: () => onNavigateTab('credito'),
    },
    {
      id: 'prestamos',
      name: 'Préstamos',
      icon: 'cash-outline' as const,
      color: '#06b6d4',
      onPress: () => onNavigateTab('deudas'),
    },
    {
      id: 'categorias',
      name: 'Categorías',
      icon: 'folder-open-outline' as const,
      color: colors.p500,
      onPress: () => onNavigateTab('categorias'),
    },
    {
      id: 'mover',
      name: 'Mover',
      icon: 'swap-horizontal-outline' as const,
      color: '#6366f1',
      onPress: () => onOpenNewTransaction(),
    },
    {
      id: 'recurrentes',
      name: 'Recurrentes',
      icon: 'repeat-outline' as const,
      color: '#10b981',
      onPress: () => onNavigateTab('presupuesto'),
    },
  ];

  return (
    <View style={styles.gridContainer}>
      {actions.map((act) => (
        <TouchableOpacity
          key={act.id}
          style={[
            styles.actionTile,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
            },
          ]}
          onPress={act.onPress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${act.color}18` }]}>
            <Ionicons name={act.icon} size={22} color={act.color} />
          </View>
          <Text
            style={[
              styles.tileLabel,
              { color: isDarkMode ? '#e2e8f0' : '#334155' },
            ]}
          >
            {act.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 14,
  },
  actionTile: {
    width: '22.8%',
    aspectRatio: 0.95,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
