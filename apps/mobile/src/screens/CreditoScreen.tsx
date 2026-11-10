import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  generarCronogramaCuotas,
  formatMoney,
  type Moneda
} from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';
import { FinancialKeypad } from '../components/FinancialKeypad';
import { ArdillaMascot } from '../components/ArdillaMascot';

export function CreditoScreen({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState<any[]>([]);

  // Modal Compra
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [compraPaso, setCompraPaso] = useState<1 | 2>(1);
  const [comercio, setComercio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [montoInicial, setMontoInicial] = useState('0');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [numeroCuotas, setNumeroCuotas] = useState(3);
  const [intervaloDias, setIntervaloDias] = useState(14);
  const [savingCompra, setSavingCompra] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);

  async function fetchCompras() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: comprasData, error } = await supabase
        .from('compras_credito')
        .select('*, cuotas_compra(*)')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.warn('Error fetchCompras:', error);
      }
      setCompras(comprasData || []);
    } catch (e) {
      console.warn('Error al cargar compras:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCompras();
  }, []);

  async function handleCrearCompra() {
    if (!comercio || !descripcion || !montoTotal || Number(montoTotal) <= 0) {
      Alert.alert('Error', 'Indica el comercio, concepto y monto total.');
      return;
    }

    setSavingCompra(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const inicial = Number(montoInicial) || 0;
      const total = Number(montoTotal);
      const plan = generarCronogramaCuotas(total, inicial, numeroCuotas, new Date(), intervaloDias);

      const { data: compra, error: cErr } = await supabase
        .from('compras_credito')
        .insert({
          user_id: user.id,
          comercio,
          descripcion,
          moneda,
          monto_total: total,
          monto_inicial: inicial,
          saldo_pendiente: plan.saldoAFinanciar,
          numero_cuotas: numeroCuotas,
          intervalo_dias: intervaloDias,
          fecha_compra: new Date().toISOString().split('T')[0],
          estado: 'activa'
        })
        .select()
        .single();

      if (cErr) throw cErr;

      const cuotasPayload = plan.cuotas.map((c) => ({
        compra_credito_id: compra.id,
        user_id: user.id,
        numero_cuota: c.numeroCuota,
        monto: c.monto,
        fecha_vencimiento: c.fechaVencimiento,
        estado: 'pendiente'
      }));

      await supabase.from('cuotas_compra').insert(cuotasPayload);

      Alert.alert('Éxito', 'Compra a cuotas registrada exitosamente.');
      setModalCompraOpen(false);
      setCompraPaso(1);
      setComercio('');
      setDescripcion('');
      setMontoTotal('');
      setMontoInicial('0');
      fetchCompras();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la compra');
    } finally {
      setSavingCompra(false);
    }
  }

  const saldoPendienteTotal = compras.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Compras a Cuotas" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FadeIn>
          {/* Tarjeta Resumen */}
          <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={styles.summaryLabel}>TOTAL PENDIENTE EN CUOTAS</Text>
            <Text style={[styles.summaryAmount, { color: colors.p500 }]}>
              ${formatMoney(saldoPendienteTotal)}
            </Text>
            <Text style={styles.summarySub}>Financiamiento activo (Cashea / Krece)</Text>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.p500 }]}
              onPress={() => { setCompraPaso(1); setModalCompraOpen(true); }}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Agregar compra a cuotas</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            Compras Activas ({compras.length})
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
          ) : compras.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
              <ArdillaMascot mood="saving" size={68} />
              <Text style={styles.emptyTitle}>Sin compras a cuotas</Text>
              <Text style={styles.emptyText}>Registra compras financiadas para llevar el cronograma de vencimientos.</Text>
            </View>
          ) : (
            compras.map((compra) => {
              const total = compra.monto_total || 1;
              const pagado = total - (compra.saldo_pendiente || 0);
              const pct = Math.min(100, (pagado / total) * 100);

              return (
                <View
                  key={compra.id}
                  style={[styles.itemCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
                >
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={[styles.badgeComercio, { color: colors.p500 }]}>{compra.comercio}</Text>
                      <Text style={[styles.itemTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{compra.descripcion}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.itemAmount, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                        ${formatMoney(compra.monto_total)}
                      </Text>
                      <Text style={styles.itemSub}>Pend: ${formatMoney(compra.saldo_pendiente)}</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: colors.p500 }]} />
                  </View>

                  <Text style={styles.progressText}>
                    {Math.round(pct)}% pagado • {compra.numero_cuotas} cuotas cada {compra.intervalo_dias} días
                  </Text>
                </View>
              );
            })
          )}
        </FadeIn>
      </ScrollView>

      {/* MODAL CREAR COMPRA CON FINANCIAL KEYPAD */}
      <Modal visible={modalCompraOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                {compraPaso === 1 ? '¿Cuánto costó la compra?' : 'Plan de cuotas'}
              </Text>
              <TouchableOpacity onPress={() => setModalCompraOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {compraPaso === 1 ? (
              <View style={styles.formContainer}>
                {/* Visualizador de Monto Táctil */}
                <View style={styles.amountDisplayBox}>
                  <Text style={styles.amountDisplayCurrency}>{moneda === 'USD' ? '$' : 'Bs.'}</Text>
                  <Text style={[styles.amountDisplayText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                    {montoTotal || '0.00'}
                  </Text>
                </View>

                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="¿Dónde compraste? (Comercio)"
                  placeholderTextColor="#94a3b8"
                  value={comercio}
                  onChangeText={setComercio}
                />

                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="¿Qué compraste? (Concepto)"
                  placeholderTextColor="#94a3b8"
                  value={descripcion}
                  onChangeText={setDescripcion}
                />

                {/* Teclado Financiero Embebido */}
                <FinancialKeypad
                  value={montoTotal}
                  onChangeValue={setMontoTotal}
                  onConfirm={() => {
                    if (!comercio || !descripcion || !montoTotal || Number(montoTotal) <= 0) {
                      Alert.alert('Faltan datos', 'Llena comercio, concepto y monto.');
                      return;
                    }
                    setCompraPaso(2);
                  }}
                  confirmLabel="SIGUIENTE"
                />
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Inicial pagada hoy ($)</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={montoInicial}
                  onChangeText={setMontoInicial}
                />

                <Text style={styles.inputLabel}>Número de cuotas</Text>
                <View style={styles.cuotasRow}>
                  {[2, 3, 4, 6].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[styles.cuotaChip, numeroCuotas === num && { backgroundColor: colors.p500 }]}
                      onPress={() => setNumeroCuotas(num)}
                    >
                      <Text style={[styles.cuotaChipText, numeroCuotas === num && { color: '#fff' }]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                  disabled={savingCompra}
                  onPress={handleCrearCompra}
                >
                  {savingCompra ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Guardar Compra a Cuotas</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  summaryAmount: { fontSize: 32, fontWeight: '900', marginVertical: 4 },
  summarySub: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  emptyCard: { padding: 30, borderRadius: 20, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
  emptyText: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  itemCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeComercio: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  itemTitle: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '800' },
  itemSub: { fontSize: 11, color: '#94a3b8' },
  progressContainer: { height: 6, backgroundColor: '#334155', borderRadius: 3, marginVertical: 10, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  formContainer: { gap: 10 },
  amountDisplayBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 10 },
  amountDisplayCurrency: { fontSize: 24, fontWeight: '800', color: '#94a3b8' },
  amountDisplayText: { fontSize: 36, fontWeight: '900' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  cuotasRow: { flexDirection: 'row', gap: 8 },
  cuotaChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center' },
  cuotaChipText: { color: '#94a3b8', fontWeight: '800' },
  modalSubmitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 }
});
