import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: 'transaccion' | 'subir_factura' | 'credito' | 'compartidas' | 'cuentas') => void;
}

export function QuickActionsSheet({
  visible,
  onClose,
  onSelectAction,
}: QuickActionsSheetProps) {
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  const actions = [
    {
      id: 'transaccion' as const,
      title: 'Agregar movimiento',
      subtitle: 'Ingreso o gasto manual',
      icon: 'add-circle-outline' as const,
      color: colors.p500,
    },
    {
      id: 'subir_factura' as const,
      title: 'Subir captura de pago',
      subtitle: 'Extraer datos de recibo o Pago Móvil',
      icon: 'cloud-upload-outline' as const,
      color: '#8b5cf6',
    },
    {
      id: 'credito' as const,
      title: 'Compra a cuotas (Cashea)',
      subtitle: 'Financiamiento quincenal o mensual',
      icon: 'time-outline' as const,
      color: '#3b82f6',
    },
    {
      id: 'compartidas' as const,
      title: 'Gasto compartido',
      subtitle: 'Dividir cuenta en un grupo',
      icon: 'people-outline' as const,
      color: '#ec4899',
    },
    {
      id: 'cuentas' as const,
      title: 'Nueva cuenta bancaria',
      subtitle: 'Banco, efectivo o exchange',
      icon: 'wallet-outline' as const,
      color: '#10b981',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  paddingBottom: Math.max(24, insets.bottom + 16),
                },
              ]}
            >
              {/* Pill Handle */}
              <View style={styles.handleWrapper}>
                <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />
              </View>

              <Text style={[styles.sheetTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                ¿Qué quieres agregar?
              </Text>

              <View style={styles.actionList}>
                {actions.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.actionRow,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onSelectAction(act.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: `${act.color}18` }]}>
                      <Ionicons name={act.icon} size={22} color={act.color} />
                    </View>
                    <View style={styles.actionTextBox}>
                      <Text style={[styles.actionRowTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                        {act.title}
                      </Text>
                      <Text style={styles.actionRowSub}>{act.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 4,
  },
  actionList: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextBox: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionRowSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
