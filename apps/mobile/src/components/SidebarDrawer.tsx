import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { ApicashLogo } from './ApicashLogo';

export type ScreenTab =
  | 'dashboard'
  | 'cuentas'
  | 'movimientos'
  | 'credito'
  | 'compartidas'
  | 'prestamos'
  | 'subir_factura'
  | 'monitor-tasas'
  | 'calculadora'
  | 'presupuesto'
  | 'categorias'
  | 'ahorros'
  | 'deudas'
  | 'guia'
  | 'perfil';

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  onLogout: () => void;
}

const navItems: { id: ScreenTab; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'dashboard', name: 'Dashboard', icon: 'grid-outline' },
  { id: 'cuentas', name: 'Mis Cuentas', icon: 'wallet-outline' },
  { id: 'movimientos', name: 'Movimientos', icon: 'swap-horizontal-outline' },
  { id: 'credito', name: 'Compras a Cuotas', icon: 'card-outline' },
  { id: 'compartidas', name: 'Compartidas', icon: 'people-outline' },
  { id: 'prestamos', name: 'Préstamos', icon: 'cash-outline' },
  { id: 'subir_factura', name: 'Subir Comprobante', icon: 'cloud-upload-outline' },
  { id: 'monitor-tasas', name: 'Monitor de Tasas', icon: 'trending-up-outline' },
  { id: 'calculadora', name: 'Calculadora', icon: 'calculator-outline' },
  { id: 'presupuesto', name: 'Presupuesto', icon: 'flag-outline' },
  { id: 'categorias', name: 'Categorías', icon: 'folder-open-outline' },
  { id: 'ahorros', name: 'Ahorros y Metas', icon: 'cube-outline' },
  { id: 'deudas', name: 'Deudas', icon: 'receipt-outline' },
  { id: 'guia', name: 'Guía', icon: 'book-outline' },
  { id: 'perfil', name: 'Perfil', icon: 'person-outline' },
];

export function SidebarDrawer({
  visible,
  onClose,
  currentTab,
  onSelectTab,
  onLogout,
}: SidebarDrawerProps) {
  const { colors, isDarkMode, toggleDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.drawerContainer,
            {
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            !isDarkMode && { backgroundColor: '#ffffff', borderRightColor: '#e2e8f0' },
          ]}
        >
          {/* Header Drawer */}
          <View
            style={[
              styles.header,
              !isDarkMode && { borderBottomColor: '#e2e8f0' },
            ]}
          >
            <View style={styles.brandRow}>
              <View style={[styles.logoBadge, { backgroundColor: `${colors.p500}25` }]}>
                <ApicashLogo size={20} color={colors.p500} />
              </View>
              <Text style={[styles.brandTitle, !isDarkMode && { color: '#0f172a' }]}>
                El Sencillo
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Navigation Links */}
          <ScrollView contentContainerStyle={styles.navList}>
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    active && { backgroundColor: `${colors.p500}22` },
                  ]}
                  onPress={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? colors.p500 : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.navText,
                      !isDarkMode && { color: '#475569' },
                      active && { color: colors.p500, fontWeight: '700' },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer: Toggle Dark/Light & Logout */}
          <View
            style={[
              styles.footer,
              !isDarkMode && { borderTopColor: '#e2e8f0' },
            ]}
          >
            <TouchableOpacity style={styles.themeToggleBtn} onPress={toggleDarkMode}>
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color="#94a3b8"
              />
              <Text style={[styles.themeToggleText, !isDarkMode && { color: '#475569' }]}>
                {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tapping outside the drawer closes it */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#0f172a',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  closeBtn: {
    padding: 4,
  },
  navList: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  themeToggleText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
