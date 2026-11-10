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
  calcularPagoMinimoTarjeta,
  calcularDisponibleTarjeta,
  formatMoney,
  type Moneda
} from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { ArdillaMascot } from '../components/ArdillaMascot';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';

const BANCOS = [
  'Banesco',
  'Banco de Venezuela (BDV)',
  'Mercantil',
  'BBVA Provincial',
  'Bancamiga',
  'Banco Nacional de Crédito (BNC)',
  'Bancaribe',
  'Banco Exterior',
  'Otro banco'
];

export function CreditoScreen({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'cuotas' | 'tarjetas'>('cuotas');
  const [loading, setLoading] = useState(true);

  const [compras, setCompras] = useState<any[]>([]);
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);

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

  // Modal Tarjeta
  const [modalTarjetaOpen, setModalTarjetaOpen] = useState(false);
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [bancoTarjeta, setBancoTarjeta] = useState('Banesco');
  const [limiteTarjeta, setLimiteTarjeta] = useState('');
  const [monedaTarjeta, setMonedaTarjeta] = useState<Moneda>('USD');
  const [diaCorte, setDiaCorte] = useState('15');
  const [diaPago, setDiaPago] = useState('30');
  const [pagoMinimoPct, setPagoMinimoPct] = useState('5');
  const [savingTarjeta, setSavingTarjeta] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: comprasData } = await supabase
        .from('compras_credito')
        .select('*, cuotas_compra(*)')
        .order('created_at', { ascending: false });

      const { data: tarjetasData } = await supabase
        .from('tarjetas_credito')
        .select('*')
        .eq('activa', true)
        .order('created_at', { ascending: false });

      const { data: cuentasData } = await supabase
        .from('cuentas')
        .select('*')
        .eq('activa', true);

      setCompras(comprasData || []);
      setTarjetas(tarjetasData || []);
      setCuentas(cuentasData || []);
    } catch (e) {
      console.warn('Error al cargar datos de crédito:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
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

      Alert.alert('Éxito', 'Compra a crédito programada exitosamente.');
      setModalCompraOpen(false);
      setCompraPaso(1);
      setComercio('');
      setDescripcion('');
      setMontoTotal('');
      setMontoInicial('0');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la compra');
    } finally {
      setSavingCompra(false);
    }
  }

  async function handleCrearTarjeta() {
    if (!nombreTarjeta || !limiteTarjeta || Number(limiteTarjeta) <= 0) {
      Alert.alert('Error', 'Indica el nombre de la tarjeta y límite de crédito.');
      return;
    }

    setSavingTarjeta(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase.from('tarjetas_credito').insert({
        user_id: user.id,
        nombre: nombreTarjeta,
        banco: bancoTarjeta,
        moneda: monedaTarjeta,
        limite_credito: Number(limiteTarjeta),
        dia_corte: Number(diaCorte),
        dia_pago: Number(diaPago),
        pago_minimo_pct: Number(pagoMinimoPct) || 5.0,
        activa: true
      });

      if (error) throw error;

      Alert.alert('Éxito', 'Tarjeta de crédito agregada.');
      setModalTarjetaOpen(false);
      setNombreTarjeta('');
      setLimiteTarjeta('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la tarjeta');
    } finally {
      setSavingTarjeta(false);
    }
  }

  const saldoPendienteTotal = compras.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0);
  const deudaTarjetasTotal = tarjetas.reduce((acc, t) => acc + (t.saldo_deuda || 0), 0);
  const limiteTarjetasTotal = tarjetas.reduce((acc, t) => acc + (t.limite_credito || 0), 0);
  const disponibleTarjetasTotal = Math.max(0, limiteTarjetasTotal - deudaTarjetasTotal);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Crédito y Cuotas" onOpenMenu={onOpenMenu} />

      {/* Tabs Selector estilo Chekea */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabWrapper, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cuotas' && { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}
            onPress={() => setActiveTab('cuotas')}
          >
            <Ionicons name="time-outline" size={16} color={activeTab === 'cuotas' ? colors.p500 : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'cuotas' ? (isDarkMode ? '#ffffff' : '#0f172a') : '#64748b' }]}>
              Cuotas ({compras.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tarjetas' && { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}
            onPress={() => setActiveTab('tarjetas')}
          >
            <Ionicons name="card-outline" size={16} color={activeTab === 'tarjetas' ? colors.p500 : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'tarjetas' ? (isDarkMode ? '#ffffff' : '#0f172a') : '#64748b' }]}>
              Tarjetas ({tarjetas.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ================================================================= */}
        {/* TAB 1: CUOTAS (CASHEA)                                            */}
        {/* ================================================================= */}
        {activeTab === 'cuotas' && (
          <FadeIn>
            {/* Tarjeta Resumen */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.summaryLabel}>PENDIENTE POR PAGAR</Text>
              <Text style={[styles.summaryAmount, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                ${formatMoney(saldoPendienteTotal)}
              </Text>
              <Text style={styles.summarySub}>Total en compras financiadas</Text>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.p500 }]}
                onPress={() => { setCompraPaso(1); setModalCompraOpen(true); }}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Agregar compra a cuotas</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              Compras Activas
            </Text>

            {loading ? (
              <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
            ) : compras.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
                <ArdillaMascot mood="saving" size={64} />
                <Text style={styles.emptyText}>No tienes compras a crédito registradas.</Text>
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

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: colors.p500 }]} />
                    </View>

                    <Text style={styles.progressText}>
                      {Math.round(pct)}% pagado • {compra.numero_cuotas} cuotas quincenales
                    </Text>
                  </View>
                );
              })
            )}
          </FadeIn>
        )}

        {/* ================================================================= */}
        {/* TAB 2: TARJETAS DE CRÉDITO                                        */}
        {/* ================================================================= */}
        {activeTab === 'tarjetas' && (
          <FadeIn>
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.summaryLabel}>DEUDA TOTAL EN TARJETAS</Text>
              <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
                ${formatMoney(deudaTarjetasTotal)}
              </Text>
              <Text style={styles.summarySub}>
                Disponible: ${formatMoney(disponibleTarjetasTotal)} de ${formatMoney(limiteTarjetasTotal)}
              </Text>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.p500 }]}
                onPress={() => setModalTarjetaOpen(true)}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Agregar tarjeta de crédito</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              Tus Tarjetas
            </Text>

            {loading ? (
              <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
            ) : tarjetas.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
                <ArdillaMascot mood="zen" size={64} />
                <Text style={styles.emptyText}>No tienes tarjetas de crédito registradas.</Text>
              </View>
            ) : (
              tarjetas.map((t) => {
                const limite = t.limite_credito || 1;
                const deuda = t.saldo_deuda || 0;
                const disp = Math.max(0, limite - deuda);
                const pctUsado = (deuda / limite) * 100;
                const minPago = calcularPagoMinimoTarjeta(deuda, t.pago_minimo_pct);

                return (
                  <View
                    key={t.id}
                    style={[styles.cardItem, { backgroundColor: '#0f172a', borderColor: '#334155' }]}
                  >
                    <View style={styles.itemHeader}>
                      <View>
                        <Text style={styles.cardBank}>{t.banco || 'Tarjeta'}</Text>
                        <Text style={styles.cardName}>{t.nombre}</Text>
                      </View>
                      <View style={styles.currencyBadge}>
                        <Text style={styles.currencyBadgeText}>{t.moneda}</Text>
                      </View>
                    </View>

                    <View style={styles.cardNumbersRow}>
                      <View>
                        <Text style={styles.cardLabel}>Deuda</Text>
                        <Text style={[styles.cardValue, { color: '#f87171' }]}>${formatMoney(deuda)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.cardLabel}>Disponible</Text>
                        <Text style={[styles.cardValue, { color: '#4ade80' }]}>${formatMoney(disp)}</Text>
                      </View>
                    </View>

                    {/* Barra de uso */}
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${Math.min(100, pctUsado)}%`, backgroundColor: pctUsado > 80 ? '#ef4444' : '#10b981' }]} />
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardFooterText}>Corte: día {t.dia_corte} • Pago: día {t.dia_pago}</Text>
                      {minPago > 0 && (
                        <Text style={styles.cardMinPago}>Pago mín: ${formatMoney(minPago)}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </FadeIn>
        )}
      </ScrollView>

      {/* MODAL CREAR COMPRA (WIZARD 2 PASOS) */}
      <Modal visible={modalCompraOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                {compraPaso === 1 ? 'Paso 1: ¿Cuánto costó?' : 'Paso 2: Plan de cuotas'}
              </Text>
              <TouchableOpacity onPress={() => setModalCompraOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {compraPaso === 1 ? (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Monto total ($ USD)</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="Ej: 100"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={montoTotal}
                  onChangeText={setMontoTotal}
                />

                <Text style={styles.inputLabel}>¿Dónde compraste? (Comercio)</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="Ej: Tienda Cashea, Daka..."
                  placeholderTextColor="#94a3b8"
                  value={comercio}
                  onChangeText={setComercio}
                />

                <Text style={styles.inputLabel}>¿Qué compraste? (Concepto)</Text>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                  placeholder="Ej: Zapatos deportivos..."
                  placeholderTextColor="#94a3b8"
                  value={descripcion}
                  onChangeText={setDescripcion}
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                  onPress={() => {
                    if (!comercio || !descripcion || !montoTotal) {
                      Alert.alert('Faltan datos', 'Llena todos los campos');
                      return;
                    }
                    setCompraPaso(2);
                  }}
                >
                  <Text style={styles.modalSubmitBtnText}>Siguiente: Cuotas</Text>
                </TouchableOpacity>
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
                    <Text style={styles.modalSubmitBtnText}>Confirmar y Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR TARJETA */}
      <Modal visible={modalTarjetaOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                Nueva Tarjeta de Crédito
              </Text>
              <TouchableOpacity onPress={() => setModalTarjetaOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nombre de la tarjeta</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="Ej: Banesco Master, Mercantil Visa..."
                placeholderTextColor="#94a3b8"
                value={nombreTarjeta}
                onChangeText={setNombreTarjeta}
              />

              <Text style={styles.inputLabel}>Límite de crédito ($ USD)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="500.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={limiteTarjeta}
                onChangeText={setLimiteTarjeta}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Día corte</Text>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                    placeholder="15"
                    keyboardType="numeric"
                    value={diaCorte}
                    onChangeText={setDiaCorte}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Día pago</Text>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                    placeholder="30"
                    keyboardType="numeric"
                    value={diaPago}
                    onChangeText={setDiaPago}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                disabled={savingTarjeta}
                onPress={handleCrearTarjeta}
              >
                {savingTarjeta ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Guardar Tarjeta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  tabWrapper: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  summaryAmount: { fontSize: 32, fontWeight: '900', marginVertical: 4 },
  summarySub: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  emptyCard: { padding: 30, borderRadius: 20, alignItems: 'center', gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  itemCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeComercio: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  itemTitle: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '800' },
  itemSub: { fontSize: 11, color: '#94a3b8' },
  progressContainer: { height: 6, backgroundColor: '#334155', borderRadius: 3, marginVertical: 10, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#94a3b8' },
  cardItem: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 14 },
  cardBank: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' },
  cardName: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  currencyBadge: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  currencyBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  cardNumbersRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 },
  cardLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' },
  cardValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  cardFooterText: { fontSize: 11, color: '#94a3b8' },
  cardMinPago: { fontSize: 11, color: '#fde047', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 28, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  formContainer: { gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  cuotasRow: { flexDirection: 'row', gap: 8 },
  cuotaChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center' },
  cuotaChipText: { color: '#94a3b8', fontWeight: '800' },
  modalSubmitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 }
});
