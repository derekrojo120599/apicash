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
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  generarCronogramaCuotas,
  formatMoney,
  calculateVesFromUsd,
  type Moneda
} from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';
import { FinancialKeypad } from '../components/FinancialKeypad';

export function CreditoScreen({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState<any[]>([]);
  const [cuentasVes, setCuentasVes] = useState<any[]>([]);
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);

  // Modal Pago de cuota
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [cuotaPagar, setCuotaPagar] = useState<any>(null);
  const [cuentaPagoId, setCuentaPagoId] = useState<string | null>(null);
  const [savingPago, setSavingPago] = useState(false);

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

      const [comprasRes, cuentasRes, tasaRes] = await Promise.all([
        supabase
          .from('compras_credito')
          .select('*, cuotas_compra(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('cuentas')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('tasas_cambio')
          .select('tasa, fecha')
          .eq('fuente', 'Banco Central de Venezuela')
          .order('fecha', { ascending: false })
          .limit(1)
      ]);

      if (comprasRes.error && comprasRes.error.code !== '42P01') {
        console.warn('Error fetchCompras:', comprasRes.error);
      }
      setCompras(comprasRes.data || []);

      // Only VES accounts can pay installments (RPC enforces this too)
      if (cuentasRes.error && cuentasRes.error.code !== '42P01') {
        console.warn('Error fetchCuentasVes:', cuentasRes.error);
      }
      setCuentasVes((cuentasRes.data || []).filter((c: any) => c.moneda === 'VES'));

      if (tasaRes.error && tasaRes.error.code !== '42P01') {
        console.warn('Error fetchTasaBcv:', tasaRes.error);
      }
      setTasaBcv(tasaRes.data && tasaRes.data.length > 0 ? Number(tasaRes.data[0].tasa) : null);
    } catch (e) {
      console.warn('Error al cargar compras:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  function openPagoModal(compra: any, cuota: any) {
    setCuotaPagar({
      ...cuota,
      moneda_compra: compra.moneda,
      comercio: compra.comercio,
      numero_cuotas: compra.numero_cuotas
    });
    setCuentaPagoId(cuentasVes.length === 1 ? cuentasVes[0].id : null);
    setModalPagoOpen(true);
  }

  function closePagoModal() {
    setModalPagoOpen(false);
    setCuotaPagar(null);
    setCuentaPagoId(null);
  }

  async function handlePagarCuota() {
    if (!cuotaPagar || !cuentaPagoId) return;

    setSavingPago(true);
    try {
      const { error } = await supabase.rpc('pagar_cuota_compra', {
        p_cuota_id: cuotaPagar.id,
        p_cuenta_id: cuentaPagoId,
        p_categoria_id: null
      });

      if (error) throw error;

      Alert.alert('Éxito', 'Cuota pagada exitosamente.');
      closePagoModal();
      fetchCompras();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo pagar la cuota');
    } finally {
      setSavingPago(false);
    }
  }

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

                  {(compra.cuotas_compra || [])
                    .filter((cuota: any) => cuota.estado === 'pendiente' || cuota.estado === 'vencida')
                    .sort((a: any, b: any) => a.numero_cuota - b.numero_cuota)
                    .map((cuota: any) => {
                      const vencida = cuota.estado === 'vencida';
                      const esVes = compra.moneda === 'VES';

                      return (
                        <View
                          key={cuota.id}
                          style={[styles.cuotaRow, { borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
                        >
                          <View style={styles.cuotaRowInfo}>
                            <Text style={[styles.cuotaRowTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                              Cuota {cuota.numero_cuota} • {esVes ? `Bs. ${formatMoney(cuota.monto)}` : `$${formatMoney(cuota.monto)}`}
                            </Text>
                            <Text style={[styles.cuotaRowSub, vencida && styles.cuotaRowVencida]}>
                              {vencida ? 'Vencida' : 'Pendiente'} • Vence {String(cuota.fecha_vencimiento).split('T')[0]}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.pagarBtn, { backgroundColor: vencida ? '#ef4444' : colors.p500 }]}
                            onPress={() => openPagoModal(compra, cuota)}
                          >
                            <Text style={styles.pagarBtnText}>Pagar</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                </View>
              );
            })
          )}
        </FadeIn>
      </ScrollView>

      {/* MODAL CREAR COMPRA CON FINANCIAL KEYPAD */}
      <Modal visible={modalCompraOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior="padding"
            style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}
          >
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Inicial pagada hoy ($)</Text>
                  <TouchableOpacity onPress={() => setShowKeypad(prev => !prev)}>
                    <Text style={{ fontSize: 11, color: colors.p500, fontWeight: '700' }}>
                      {showKeypad ? '⌨️ Teclado estándar' : '🔢 Teclado financiero'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  showSoftInputOnFocus={!showKeypad}
                  value={montoInicial}
                  onChangeText={setMontoInicial}
                />
                {showKeypad && (
                  <View style={{ marginTop: 8 }}>
                    <FinancialKeypad
                      value={montoInicial}
                      onChangeValue={setMontoInicial}
                      onConfirm={() => setShowKeypad(false)}
                      confirmLabel="LISTO"
                    />
                  </View>
                )}

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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL PAGAR CUOTA */}
      <Modal visible={modalPagoOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            {cuotaPagar && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                    Pagar cuota {cuotaPagar.numero_cuota}/{cuotaPagar.numero_cuotas}
                  </Text>
                  <TouchableOpacity onPress={closePagoModal}>
                    <Ionicons name="close" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  {/* Amount: VES installment as-is, USD installment approximated at BCV rate */}
                  <View style={[styles.pagoMontoBox, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
                    <Text style={[styles.pagoMontoText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                      {cuotaPagar.moneda_compra === 'VES'
                        ? `Bs. ${formatMoney(cuotaPagar.monto)}`
                        : tasaBcv
                          ? `≈ Bs. ${calculateVesFromUsd(cuotaPagar.monto, tasaBcv)}`
                          : `$${formatMoney(cuotaPagar.monto)}`}
                    </Text>
                    {cuotaPagar.moneda_compra === 'USD' && tasaBcv && (
                      <Text style={styles.pagoMontoAprox}>
                        ≈ ${formatMoney(cuotaPagar.monto)} a tasa BCV
                      </Text>
                    )}
                  </View>

                  {cuentasVes.length === 0 ? (
                    <Text style={styles.pagoAviso}>
                      Necesitas una cuenta en bolivares para pagar la cuota
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.inputLabel}>Pagar desde</Text>
                      {cuentasVes.map((cta: any) => (
                        <TouchableOpacity
                          key={cta.id}
                          style={[
                            styles.cuentaOption,
                            { borderColor: cuentaPagoId === cta.id ? colors.p500 : (isDarkMode ? '#1e293b' : '#cbd5e1') }
                          ]}
                          onPress={() => setCuentaPagoId(cta.id)}
                        >
                          <View style={styles.cuotaRowInfo}>
                            <Text style={[styles.cuentaNombre, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                              {cta.nombre}
                            </Text>
                            <Text style={styles.cuentaSub}>{cta.tipo}</Text>
                          </View>
                          <Text style={styles.cuentaSub}>Bs. {formatMoney(cta.saldo_cache || 0)}</Text>
                          {cuentaPagoId === cta.id && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.p500} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  <Text style={styles.pagoNota}>
                    Las cuotas se pagan en bolivares a tasa BCV, aunque tu perfil prefiera otra fuente.
                  </Text>

                  {cuentasVes.length > 0 && (
                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, { backgroundColor: colors.p500, opacity: cuentaPagoId ? 1 : 0.5 }]}
                      disabled={savingPago || !cuentaPagoId}
                      onPress={handlePagarCuota}
                    >
                      {savingPago ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalSubmitBtnText}>Confirmar pago</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
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
  cuotaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  cuotaRowInfo: { flex: 1 },
  cuotaRowTitle: { fontSize: 13, fontWeight: '700' },
  cuotaRowSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  cuotaRowVencida: { color: '#ef4444', fontWeight: '700' },
  pagarBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  pagarBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  pagoMontoBox: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 2 },
  pagoMontoText: { fontSize: 24, fontWeight: '900' },
  pagoMontoAprox: { fontSize: 12, color: '#94a3b8' },
  pagoAviso: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  pagoNota: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  cuentaOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  cuentaNombre: { fontSize: 14, fontWeight: '700' },
  cuentaSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
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
