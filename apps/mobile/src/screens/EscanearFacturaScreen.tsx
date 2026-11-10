import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { ArdillaMascot } from '../components/ArdillaMascot';
import { formatMoney } from '@apicash/shared';
import { TopBar } from '../components/TopBar';

interface ItemFactura {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
}

export function EscanearFacturaScreen({ onBack }: { onBack: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [escaneando, setEscaneando] = useState(false);
  const [facturaDetectada, setFacturaDetectada] = useState(false);

  // Datos simulados de escaneo OCR inteligente
  const [comercio, setComercio] = useState('Automercados Plaza');
  const [rif, setRif] = useState('J-00012345-6');
  const [fecha, setFecha] = useState('10 nov 2026 · 14:32');
  const [items, setItems] = useState<ItemFactura[]>([
    { id: '1', nombre: 'Leche Descremada 1L', precio: 1.85, categoria: 'Alimentación' },
    { id: '2', nombre: 'Pan de Sándwich Integral', precio: 2.40, categoria: 'Alimentación' },
    { id: '3', nombre: 'Café Molido 250g', precio: 3.50, categoria: 'Alimentación' },
    { id: '4', nombre: 'Detergente Líquido 1L', precio: 4.25, categoria: 'Hogar' }
  ]);

  function simularEscaneoCamara() {
    setEscaneando(true);
    setTimeout(() => {
      setEscaneando(false);
      setFacturaDetectada(true);
      Alert.alert('¡Factura Escaneada!', 'Se han detectado los ítems, precios y categorías automáticamente.');
    }, 1500);
  }

  const subtotal = items.reduce((acc, it) => acc + it.precio, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Escanear Factura" onOpenMenu={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!facturaDetectada ? (
          <View style={[styles.scannerBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: colors.p500 }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: colors.p500 }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: colors.p500 }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: colors.p500 }]} />

              <ArdillaMascot mood="searching" size={90} />
              <Text style={[styles.scanPrompt, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                Apunta la cámara a tu factura
              </Text>
              <Text style={styles.scanSub}>
                Detectamos automáticamente el comercio, la fecha, cada producto y su categoría.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.captureBtn, { backgroundColor: colors.p500 }]}
              disabled={escaneando}
              onPress={simularEscaneoCamara}
            >
              {escaneando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                  <Text style={styles.captureBtnText}>Escanear con Cámara</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultadoContainer}>
            {/* Cabecera del ticket detectado */}
            <View style={[styles.ticketHeader, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.ticketBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.ticketBadgeText}>Factura Digitalizada</Text>
              </View>
              <Text style={[styles.comercioText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{comercio}</Text>
              <Text style={styles.rifText}>RIF: {rif} • {fecha}</Text>
            </View>

            {/* Ítems extraídos */}
            <Text style={[styles.sectionHeading, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              Productos Desglosados ({items.length})
            </Text>

            <View style={[styles.itemsList, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              {items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemNombre, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{it.nombre}</Text>
                    <Text style={[styles.itemCat, { color: colors.p500 }]}>{it.categoria}</Text>
                  </View>
                  <Text style={[styles.itemPrecio, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                    ${formatMoney(it.precio)}
                  </Text>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>${formatMoney(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA (16%)</Text>
                <Text style={styles.totalVal}>${formatMoney(iva)}</Text>
              </View>
              <View style={[styles.totalRow, { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' }]}>
                <Text style={[styles.totalLabelBold, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>Total Factura</Text>
                <Text style={[styles.totalValBold, { color: colors.p500 }]}>${formatMoney(total)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveExpenseBtn, { backgroundColor: colors.p500 }]}
              onPress={() => {
                Alert.alert('Guardado', 'Los gastos han sido registrados con sus categorías.');
                onBack();
              }}
            >
              <Text style={styles.saveExpenseBtnText}>Guardar como gasto en mis cuentas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reintentarBtn}
              onPress={() => setFacturaDetectada(false)}
            >
              <Text style={styles.reintentarBtnText}>Escanear otra factura</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  scannerBox: { padding: 24, borderRadius: 28, borderWidth: 1, alignItems: 'center' },
  viewfinder: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  corner: { position: 'absolute', width: 28, height: 28 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 },
  scanPrompt: { fontSize: 18, fontWeight: '800', marginTop: 14 },
  scanSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20, marginTop: 4, lineHeight: 18 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  captureBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  resultadoContainer: { gap: 14 },
  ticketHeader: { padding: 18, borderRadius: 20, borderWidth: 1 },
  ticketBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ticketBadgeText: { fontSize: 11, fontWeight: '800', color: '#10b981', textTransform: 'uppercase' },
  comercioText: { fontSize: 20, fontWeight: '900' },
  rifText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sectionHeading: { fontSize: 16, fontWeight: '800' },
  itemsList: { padding: 16, borderRadius: 20, borderWidth: 1, gap: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNombre: { fontSize: 14, fontWeight: '600' },
  itemCat: { fontSize: 11, fontWeight: '700' },
  itemPrecio: { fontSize: 14, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  totalLabel: { fontSize: 12, color: '#94a3b8' },
  totalVal: { fontSize: 12, fontWeight: '700' },
  totalLabelBold: { fontSize: 15, fontWeight: '800' },
  totalValBold: { fontSize: 17, fontWeight: '900' },
  saveExpenseBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 6 },
  saveExpenseBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  reintentarBtn: { paddingVertical: 10, alignItems: 'center' },
  reintentarBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' }
});
