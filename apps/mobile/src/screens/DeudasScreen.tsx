import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { AnimatedSelect } from '../components/AnimatedSelect';
import { FadeIn, AnimatedNumber } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';

interface DeudasScreenProps {
  onOpenMenu: () => void;
}

interface Deuda {
  id: string;
  user_id: string;
  nombre: string;
  monto_total: number;
  saldo_pendiente: number;
  moneda: 'USD' | 'VES';
}

interface CuentaOption {
  id: string;
  nombre: string;
  moneda: 'USD' | 'VES';
  saldo_cache: number;
}

export function DeudasScreen({ onOpenMenu }: DeudasScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cuentas, setCuentas] = useState<CuentaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Crear
  const [modalCreate, setModalCreate] = useState(false);
  const [nombre, setNombre] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Abono
  const [modalAbono, setModalAbono] = useState(false);
  const [selectedDeuda, setSelectedDeuda] = useState<Deuda | null>(null);
  const [cuentaAbonoId, setCuentaAbonoId] = useState('');
  const [montoAbono, setMontoAbono] = useState('');

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [deudasRes, cuentasRes] = await Promise.all([
        supabase
          .from('deudas')
          .select('*')
          .eq('user_id', user.id)
          .order('saldo_pendiente', { ascending: false }),
        supabase
          .from('cuentas')
          .select('id, nombre, moneda, saldo_cache')
          .eq('user_id', user.id)
          .eq('activa', true)
          .order('nombre'),
      ]);

      if (deudasRes.data) {
        setDeudas(deudasRes.data);
      }
      if (cuentasRes.data) {
        setCuentas(cuentasRes.data);
        if (cuentasRes.data.length > 0 && !cuentaAbonoId) {
          setCuentaAbonoId(cuentasRes.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleCreateDeuda() {
    if (!nombre.trim() || !montoTotal || Number(montoTotal) <= 0) {
      setErrorMsg('Nombre y monto total válido son requeridos');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const numericTotal = Number(montoTotal);

      const { error } = await supabase.from('deudas').insert([
        {
          user_id: user.id,
          nombre: nombre.trim(),
          moneda,
          monto_total: numericTotal,
          saldo_pendiente: numericTotal,
        },
      ]);

      if (error) throw error;

      setNombre('');
      setMontoTotal('');
      setModalCreate(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la deuda');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAbonoSubmit() {
    if (!selectedDeuda) return;
    const num = Number(montoAbono);
    if (!montoAbono || isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingrese un monto válido');
      return;
    }

    const c = cuentas.find((acc) => acc.id === cuentaAbonoId);
    if (!c) {
      Alert.alert('Error', 'Seleccione una cuenta de origen');
      return;
    }

    if (c.saldo_cache < num) {
      Alert.alert('Saldo insuficiente', 'La cuenta no tiene suficiente saldo disponible');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'deuda')
        .limit(1)
        .maybeSingle();

      // Exacta RPC de la Web: registrar_pago_deuda
      const { error: rpcErr } = await supabase.rpc('registrar_pago_deuda', {
        p_deuda_id: selectedDeuda.id,
        p_cuenta_id: cuentaAbonoId,
        p_categoria_id: cat?.id || null,
        p_monto: num,
        p_moneda_original: c.moneda,
        p_fecha: new Date().toISOString(),
      });

      if (rpcErr) throw rpcErr;

      setModalAbono(false);
      setMontoAbono('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el abono');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDeuda(deuda: Deuda) {
    Alert.alert(
      '¿Eliminar deuda?',
      `Se eliminará el registro de "${deuda.nombre}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('deudas').delete().eq('id', deuda.id);
            fetchData();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <View
        style={[
          styles.topBar,
          !isDarkMode && { backgroundColor: '#ffffff', borderBottomColor: '#e2e8f0' },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { backgroundColor: `${colors.p500}25` }]}>
            <ApicashLogo size={20} color={colors.p500} />
          </View>
          <Text style={[styles.brandTitle, !isDarkMode && styles.textDark]}>
            Control de Deudas
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenMenu}>
          <Ionicons name="menu" size={26} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={colors.p500}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>Deudas registradas ({deudas.length})</Text>
          <TouchableOpacity
            style={[styles.newDebtBtn, { backgroundColor: colors.p600 }]}
            onPress={() => {
              setNombre('');
              setMontoTotal('');
              setErrorMsg('');
              setModalCreate(true);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newDebtText}>Nueva deuda</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : deudas.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="receipt-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin deudas registradas
            </Text>
            <Text style={styles.emptyDesc}>
              No tienes deudas activas registradas en el sistema.
            </Text>
          </View>
        ) : (
          deudas.map((d, idx) => (
            <FadeIn key={d.id} delay={idx * 80}>
              <View style={[styles.debtCard, !isDarkMode && styles.cardLight]}>
                <View style={styles.debtHeader}>
                  <View style={[styles.debtIcon, { backgroundColor: '#f9731622' }]}>
                    <Ionicons name="receipt-outline" size={22} color="#f97316" />
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={[styles.debtTitle, !isDarkMode && styles.textDark]}>
                      {d.nombre}
                    </Text>
                    <Text style={styles.debtCurrency}>
                      Total original: {d.moneda === 'USD' ? '$' : 'Bs. '}
                      {formatMoney(d.monto_total)}
                    </Text>
                  </View>
                  <View style={styles.debtRight}>
                    <AnimatedNumber
                      value={Number(d.saldo_pendiente || 0)}
                      formatter={(v) => `${d.moneda === 'USD' ? '$' : 'Bs. '}${formatMoney(v)}`}
                      duration={1100}
                      style={styles.pendingAmount}
                    />
                    <Text style={styles.pendingBadge}>
                      {d.saldo_pendiente === 0 ? 'PAGADA' : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.actionsRow,
                    !isDarkMode && { borderTopColor: '#e2e8f0' },
                  ]}
                >
                  {d.saldo_pendiente > 0 ? (
                    <TouchableOpacity
                      style={[styles.actionBtnOrange, { backgroundColor: `${colors.p500}22` }]}
                      onPress={() => {
                        setSelectedDeuda(d);
                        setMontoAbono('');
                        setModalAbono(true);
                      }}
                    >
                      <Ionicons name="card-outline" size={16} color={colors.p500} />
                      <Text style={[styles.actionTextOrange, { color: colors.p500 }]}>
                        Abonar / Pagar
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.actionBtnRed}
                    onPress={() => handleDeleteDeuda(d)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>

      {/* Modal Crear Deuda */}
      <Modal visible={modalCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Nueva Deuda
              </Text>
              <TouchableOpacity onPress={() => setModalCreate(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Concepto o acreedor
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="Ej. Tarjeta de crédito, Préstamo..."
                placeholderTextColor="#64748b"
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Monto total adeudado
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={montoTotal}
                onChangeText={setMontoTotal}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>Moneda</Text>
              <View style={styles.chipRow}>
                {(['USD', 'VES'] as const).map((mon) => {
                  const active = moneda === mon;
                  return (
                    <TouchableOpacity
                      key={mon}
                      style={[
                        styles.chip,
                        !isDarkMode && styles.inputLight,
                        active && { borderColor: colors.p500, backgroundColor: `${colors.p500}22` },
                      ]}
                      onPress={() => setMoneda(mon)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          !isDarkMode && styles.textDark,
                          active && { color: colors.p500, fontWeight: '700' },
                        ]}
                      >
                        {mon}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.p600 },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleCreateDeuda}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Registrar Deuda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Abonar a Deuda */}
      <Modal visible={modalAbono} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Abonar a: {selectedDeuda?.nombre}
              </Text>
              <TouchableOpacity onPress={() => setModalAbono(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Cuenta con la que pagas
              </Text>
              <AnimatedSelect
                value={cuentaAbonoId}
                onChange={setCuentaAbonoId}
                placeholder="Seleccione una cuenta"
                options={cuentas.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.moneda === 'USD' ? '$' : 'Bs.'}${formatMoney(c.saldo_cache)})`,
                }))}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Monto del abono — Pendiente: {selectedDeuda?.moneda === 'USD' ? '$' : 'Bs. '}
                {formatMoney(selectedDeuda?.saldo_pendiente || 0)}
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={montoAbono}
                onChangeText={setMontoAbono}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.p600 },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleAbonoSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Registrar Pago</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  newDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newDebtText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  debtCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  debtCurrency: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  debtRight: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f97316',
  },
  pendingBadge: {
    fontSize: 10,
    color: '#fdba74',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  actionBtnOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionTextOrange: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnRed: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#450a0a',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  textDark: {
    color: '#0f172a',
  },
});
