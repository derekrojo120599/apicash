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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { AnimatedSelect } from '../components/AnimatedSelect';
import { FadeIn, AnimatedNumber, AnimatedScalePressable } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';
import { useMobileRealtime } from '../context/RealtimeContext';

interface CuentasScreenProps {
  onOpenMenu: () => void;
}

interface Cuenta {
  id: string;
  nombre: string;
  tipo: 'banco' | 'efectivo' | 'exchange' | 'billetera_digital';
  moneda: 'USD' | 'VES';
  saldo_cache: number;
  activa: boolean;
}

export function CuentasScreen({ onOpenMenu }: CuentasScreenProps) {
  const { colors, isDarkMode } = useAppTheme();
  const { syncTick } = useMobileRealtime();

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'banco' | 'efectivo' | 'exchange' | 'billetera_digital'>('banco');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function fetchCuentas() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cuentasRes, tasaRes] = await Promise.all([
        supabase
          .from('cuentas')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasas_cambio')
          .select('tasa')
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cuentasRes.data) {
        setCuentas(cuentasRes.data);
      }
      if (tasaRes.data?.tasa) {
        setTasaActual(Number(tasaRes.data.tasa));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchCuentas();
  }, [syncTick]);

  function openCreate() {
    setEditingId(null);
    setNombre('');
    setTipo('banco');
    setMoneda('USD');
    setErrorMsg('');
    setModalMode('create');
  }

  function openEdit(c: Cuenta) {
    setEditingId(c.id);
    setNombre(c.nombre);
    setTipo(c.tipo);
    setMoneda(c.moneda);
    setErrorMsg('');
    setModalMode('edit');
  }

  async function handleSaveCuenta() {
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la cuenta es requerido');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      if (modalMode === 'create') {
        const { error } = await supabase.from('cuentas').insert([
          {
            user_id: user.id,
            nombre: nombre.trim(),
            tipo,
            moneda,
          },
        ]);
        if (error) throw error;
      } else if (modalMode === 'edit' && editingId) {
        const { error } = await supabase
          .from('cuentas')
          .update({
            nombre: nombre.trim(),
            tipo,
          })
          .eq('id', editingId);
        if (error) throw error;
      }

      setModalMode(null);
      fetchCuentas();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActiva(cuenta: Cuenta) {
    try {
      const { error } = await supabase
        .from('cuentas')
        .update({ activa: !cuenta.activa })
        .eq('id', cuenta.id);

      if (!error) {
        fetchCuentas();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Mis Cuentas" onOpenMenu={onOpenMenu} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCuentas();
            }}
            tintColor={colors.p500}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.subtitle}>
              Billeteras y cuentas bancarias ({cuentas.length})
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.newAccountBtn, { backgroundColor: colors.p600 }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newAccountText}>Nueva cuenta</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : cuentas.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="wallet-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin cuentas registradas
            </Text>
            <Text style={styles.emptyDesc}>
              Cree una cuenta para comenzar a registrar transacciones.
            </Text>
          </View>
        ) : (
          cuentas.map((c, idx) => (
            <FadeIn key={c.id} delay={idx * 80}>
              <View
                style={[
                  styles.accountCard,
                  !isDarkMode && styles.cardLight,
                  !c.activa && styles.accountCardInactive,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.p500}20` }]}>
                    <Ionicons
                      name={
                        c.tipo === 'banco'
                          ? 'business-outline'
                          : c.tipo === 'efectivo'
                          ? 'cash-outline'
                          : c.tipo === 'exchange'
                          ? 'repeat-outline'
                          : 'phone-portrait-outline'
                      }
                      size={22}
                      color={colors.p500}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, !isDarkMode && styles.textDark]}>
                      {c.nombre}
                    </Text>
                    <Text style={styles.cardType}>{c.tipo.toUpperCase()} • {c.moneda}</Text>
                  </View>

                  <TouchableOpacity onPress={() => openEdit(c)} style={styles.editIconBtn}>
                    <Ionicons name="pencil-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleActiva(c)}
                    style={[styles.statusToggle, !isDarkMode && styles.inputLight]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        c.activa ? { color: colors.p500 } : styles.textGray,
                      ]}
                    >
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.cardDivider,
                    !isDarkMode && { backgroundColor: '#e2e8f0' },
                  ]}
                />

                <View style={styles.cardFooter}>
                  <Text style={styles.balanceLabel}>Saldo Disponible</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={[styles.balanceVal, !isDarkMode && styles.textDark]}>
                      {c.moneda === 'USD' ? '$' : 'Bs. '}
                      {formatMoney(c.saldo_cache)}
                    </Text>
                    {c.moneda === 'VES' && tasaActual && tasaActual > 0 ? (
                      <Text style={styles.usdEquivalent}>
                        ≈ ${formatMoney(c.saldo_cache / tasaActual)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>

      {/* Modal Crear / Editar Cuenta */}
      <Modal visible={modalMode !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                {modalMode === 'edit' ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </Text>
              <TouchableOpacity onPress={() => setModalMode(null)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Nombre de la cuenta
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="Ej. Banesco, Binance, Efectivo..."
                placeholderTextColor="#64748b"
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Tipo de cuenta
              </Text>
              <AnimatedSelect
                value={tipo}
                onChange={(val) => setTipo(val as any)}
                placeholder="Seleccione el tipo"
                options={[
                  { value: 'banco', label: 'Banco' },
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'exchange', label: 'Exchange' },
                  { value: 'billetera_digital', label: 'Billetera Digital' },
                ]}
              />

              {modalMode === 'create' ? (
                <>
                  <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                    Moneda
                  </Text>
                  <AnimatedSelect
                    value={moneda}
                    onChange={(val) => setMoneda(val as any)}
                    placeholder="Seleccione la moneda"
                    options={[
                      { value: 'USD', label: 'Dólares (USD)' },
                      { value: 'VES', label: 'Bolívares (VES)' },
                    ]}
                  />
                </>
              ) : null}

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
                onPress={handleSaveCuenta}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Cuenta'}
                  </Text>
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
  newAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newAccountText: {
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
  accountCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  accountCardInactive: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardType: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  editIconBtn: {
    padding: 8,
    marginRight: 4,
  },
  statusToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  balanceVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  usdEquivalent: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
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
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
  textGray: {
    color: '#64748b',
  },
  textDark: {
    color: '#0f172a',
  },
});
