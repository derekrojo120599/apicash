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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { AnimatedSelect } from '../components/AnimatedSelect';
import { FadeIn, AnimatedNumber, AnimatedProgressBar } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';

interface AhorrosScreenProps {
  onOpenMenu: () => void;
}

interface Meta {
  id: string;
  user_id: string;
  nombre: string;
  monto_actual: number;
  monto_objetivo: number | null;
  moneda: 'USD' | 'VES';
  fecha_objetivo?: string | null;
}

interface CuentaOption {
  id: string;
  nombre: string;
  moneda: 'USD' | 'VES';
  saldo_cache: number;
}

export function AhorrosScreen({ onOpenMenu }: AhorrosScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [cuentas, setCuentas] = useState<CuentaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Crear
  const [modalCreate, setModalCreate] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [sinMetaFija, setSinMetaFija] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Aporte
  const [modalAporte, setModalAporte] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null);
  const [cuentaAporteId, setCuentaAporteId] = useState('');
  const [montoAporte, setMontoAporte] = useState('');
  const [esFuenteExterna, setEsFuenteExterna] = useState(false);

  // Modal Retiro
  const [modalRetiro, setModalRetiro] = useState(false);
  const [cuentaRetiroId, setCuentaRetiroId] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [descRetiro, setDescRetiro] = useState('');

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [metasRes, cuentasRes] = await Promise.all([
        supabase
          .from('metas')
          .select('*')
          .eq('user_id', user.id)
          .order('monto_actual', { ascending: false }),
        supabase
          .from('cuentas')
          .select('id, nombre, moneda, saldo_cache')
          .eq('user_id', user.id)
          .eq('activa', true)
          .order('nombre'),
      ]);

      if (metasRes.data) {
        setMetas(metasRes.data);
      }
      if (cuentasRes.data) {
        setCuentas(cuentasRes.data);
        if (cuentasRes.data.length > 0 && !cuentaAporteId) {
          setCuentaAporteId(cuentasRes.data[0].id);
          setCuentaRetiroId(cuentasRes.data[0].id);
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

  async function handleCreateMeta() {
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la meta es requerido');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await supabase.from('metas').insert([
        {
          user_id: user.id,
          nombre: nombre.trim(),
          moneda,
          monto_objetivo: sinMetaFija || !objetivo ? null : Number(objetivo),
          monto_actual: 0,
        },
      ]);

      if (error) throw error;

      setNombre('');
      setObjetivo('');
      setSinMetaFija(false);
      setModalCreate(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la meta');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAporteSubmit() {
    if (!selectedMeta) return;
    const num = Number(montoAporte);
    if (!montoAporte || isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingrese un monto válido');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      if (esFuenteExterna) {
        // Aporte de fuente externa directo
        const { error: updErr } = await supabase
          .from('metas')
          .update({ monto_actual: Number(selectedMeta.monto_actual) + num })
          .eq('id', selectedMeta.id);

        if (updErr) throw updErr;
      } else {
        const c = cuentas.find((acc) => acc.id === cuentaAporteId);
        if (!c) {
          Alert.alert('Error', 'Seleccione una cuenta de origen');
          setSubmitting(false);
          return;
        }
        if (c.saldo_cache < num) {
          Alert.alert('Saldo insuficiente', 'La cuenta no tiene suficiente saldo disponible');
          setSubmitting(false);
          return;
        }

        const { data: cat } = await supabase
          .from('categorias')
          .select('id')
          .eq('user_id', user.id)
          .eq('tipo', 'ahorro')
          .limit(1)
          .maybeSingle();

        // Exacta RPC de la Web: registrar_aporte_meta
        const { error: rpcErr } = await supabase.rpc('registrar_aporte_meta', {
          p_meta_id: selectedMeta.id,
          p_cuenta_id: cuentaAporteId,
          p_categoria_id: cat?.id || null,
          p_monto: num,
          p_moneda_original: c.moneda,
          p_fecha: new Date().toISOString(),
        });

        if (rpcErr) throw rpcErr;
      }

      setModalAporte(false);
      setMontoAporte('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el aporte');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetiroSubmit() {
    if (!selectedMeta) return;
    const num = Number(montoRetiro);
    if (!montoRetiro || isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingrese un monto válido');
      return;
    }

    if (num > selectedMeta.monto_actual) {
      Alert.alert('Error', 'El monto a retirar supera el total ahorrado');
      return;
    }

    const c = cuentas.find((acc) => acc.id === cuentaRetiroId);
    if (!c) {
      Alert.alert('Error', 'Seleccione una cuenta destino');
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
        .eq('tipo', 'ahorro')
        .limit(1)
        .maybeSingle();

      // Exacta RPC de la Web: retirar_ahorro
      const { error: rpcErr } = await supabase.rpc('retirar_ahorro', {
        p_meta_id: selectedMeta.id,
        p_cuenta_id: cuentaRetiroId,
        p_categoria_id: cat?.id || null,
        p_monto: num,
        p_moneda_cuenta: c.moneda,
        p_fecha: new Date().toISOString(),
        p_descripcion: descRetiro.trim() || `Retiro de ahorro: ${selectedMeta.nombre}`,
      });

      if (rpcErr) throw rpcErr;

      setModalRetiro(false);
      setMontoRetiro('');
      setDescRetiro('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo retirar el ahorro');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteMeta(meta: Meta) {
    Alert.alert(
      '¿Eliminar meta?',
      `Se eliminará la meta "${meta.nombre}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('metas').delete().eq('id', meta.id);
            fetchData();
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Ahorros y Metas" onOpenMenu={onOpenMenu} />

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
          <Text style={styles.subtitle}>Metas de Ahorro activas ({metas.length})</Text>
          <TouchableOpacity
            style={[styles.newGoalBtn, { backgroundColor: colors.p600 }]}
            onPress={() => {
              setNombre('');
              setObjetivo('');
              setSinMetaFija(false);
              setErrorMsg('');
              setModalCreate(true);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newGoalText}>Nueva meta</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : metas.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="cube-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin metas de ahorro
            </Text>
            <Text style={styles.emptyDesc}>
              Cree una meta de ahorro para apartar fondos para sus objetivos.
            </Text>
          </View>
        ) : (
          metas.map((m, idx) => {
            const tieneObjetivo = m.monto_objetivo !== null && m.monto_objetivo > 0;
            const progreso = tieneObjetivo
              ? Math.min(100, Math.round((m.monto_actual / m.monto_objetivo!) * 100))
              : 0;
            const completado = tieneObjetivo ? progreso >= 100 : false;
            const puedeRetirar = (m.monto_actual || 0) > 0;

            return (
              <FadeIn key={m.id} delay={idx * 80}>
                <View style={[styles.metaCard, !isDarkMode && styles.cardLight]}>
                  {/* Fila superior: Título + Badge + Botón de eliminar */}
                  <View style={styles.metaHeaderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.metaTitle, !isDarkMode && styles.textDark]} numberOfLines={1}>
                        {m.nombre}
                      </Text>
                      {m.fecha_objetivo ? (
                        <Text style={styles.metaDueDate}>
                          Objetivo: {new Date(m.fecha_objetivo).toLocaleDateString('es-ES')}
                        </Text>
                      ) : null}
                    </View>

                    {/* Badge de porcentaje / Ahorro Libre */}
                    <View
                      style={[
                        styles.metaPctBadge,
                        {
                          backgroundColor: tieneObjetivo
                            ? (isDarkMode ? '#1e3a8a30' : '#eff6ff')
                            : (isDarkMode ? `${colors.p500}22` : colors.p100),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metaPctText,
                          {
                            color: tieneObjetivo
                              ? (isDarkMode ? '#60a5fa' : '#2563eb')
                              : (isDarkMode ? colors.p400 : colors.p600),
                          },
                        ]}
                      >
                        {tieneObjetivo ? `${Math.round(progreso)}%` : 'Ahorro Libre'}
                      </Text>
                    </View>

                    {/* Botón eliminar */}
                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => handleDeleteMeta(m)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* Fila de montos: Actual vs Objetivo */}
                  <View style={styles.metaAmountsRow}>
                    <Text style={[styles.metaCurrentLabel, !isDarkMode && { color: '#475569' }]}>
                      {tieneObjetivo ? (
                        <Text style={[styles.metaCurrentBold, !isDarkMode && styles.textDark]}>
                          {m.moneda === 'USD' ? '$' : 'Bs. '}{formatMoney(m.monto_actual)}
                        </Text>
                      ) : (
                        <Text style={[styles.metaCurrentLabel, !isDarkMode && { color: '#475569' }]}>
                          Total ahorrado:{' '}
                          <Text style={[styles.metaCurrentBold, !isDarkMode && styles.textDark]}>
                            {m.moneda === 'USD' ? '$' : 'Bs. '}{formatMoney(m.monto_actual)}
                          </Text>
                        </Text>
                      )}
                    </Text>
                    {tieneObjetivo ? (
                      <Text style={styles.metaTargetLabel}>
                        / {m.moneda === 'USD' ? '$' : 'Bs. '}{formatMoney(m.monto_objetivo!)}
                      </Text>
                    ) : null}
                  </View>

                  {/* Barra de progreso */}
                  {tieneObjetivo ? (
                    <AnimatedProgressBar
                      progress={progreso}
                      color={completado ? colors.p500 : '#3b82f6'}
                      bgColor={isDarkMode ? '#1e293b' : '#e2e8f0'}
                      height={10}
                      delay={idx * 80}
                    />
                  ) : (
                    <View style={{ height: 6 }} />
                  )}

                  {/* Botones de acción idénticos a la Web */}
                  <View style={styles.metaActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.aporteBtn,
                        completado && styles.aporteBtnCompleted,
                        !isDarkMode && styles.aporteBtnLight,
                      ]}
                      disabled={completado}
                      onPress={() => {
                        setSelectedMeta(m);
                        setMontoAporte('');
                        setEsFuenteExterna(false);
                        setModalAporte(true);
                      }}
                      activeOpacity={0.8}
                    >
                      {completado ? (
                        <Text style={[styles.aporteBtnCompletedText, { color: colors.p500 }]}>
                          🎉 ¡Meta Completada!
                        </Text>
                      ) : (
                        <>
                          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.p500} />
                          <Text style={[styles.aporteBtnText, !isDarkMode && styles.textDark]}>
                            Agregar Aporte
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {puedeRetirar ? (
                      <TouchableOpacity
                        style={[styles.retiroBtn, !isDarkMode && styles.retiroBtnLight]}
                        onPress={() => {
                          setSelectedMeta(m);
                          setMontoRetiro('');
                          setDescRetiro('');
                          setModalRetiro(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="arrow-down-circle-outline" size={18} color="#f97316" />
                        <Text style={styles.retiroBtnText}>Retirar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>

      {/* Modal Crear Meta */}
      <Modal visible={modalCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Nueva Meta de Ahorro
              </Text>
              <TouchableOpacity onPress={() => setModalCreate(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Nombre del objetivo
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="Ej. Fondo de emergencia, Viaje..."
                placeholderTextColor="#64748b"
                value={nombre}
                onChangeText={setNombre}
              />

              <View style={styles.switchRow}>
                <Switch
                  value={sinMetaFija}
                  onValueChange={setSinMetaFija}
                  trackColor={{ false: '#334155', true: colors.p500 }}
                />
                <Text style={[styles.switchLabel, !isDarkMode && styles.textDark]}>
                  Sin meta fija (alcancía libre)
                </Text>
              </View>

              {!sinMetaFija ? (
                <>
                  <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                    Monto objetivo
                  </Text>
                  <TextInput
                    style={[styles.textInput, !isDarkMode && styles.inputLight]}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    value={objetivo}
                    onChangeText={setObjetivo}
                  />
                </>
              ) : null}

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
                onPress={handleCreateMeta}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Crear Meta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Aporte */}
      <Modal visible={modalAporte} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Aportar a: {selectedMeta?.nombre}
              </Text>
              <TouchableOpacity onPress={() => setModalAporte(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Monto ({selectedMeta?.moneda})
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={montoAporte}
                onChangeText={setMontoAporte}
              />

              <View style={styles.switchRow}>
                <Switch
                  value={esFuenteExterna}
                  onValueChange={setEsFuenteExterna}
                  trackColor={{ false: '#334155', true: colors.p500 }}
                />
                <Text style={[styles.switchLabel, !isDarkMode && styles.textDark]}>
                  Aporte de fuente externa (no descuenta de mis cuentas)
                </Text>
              </View>

              {!esFuenteExterna ? (
                <>
                  <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                    Cuenta Origen
                  </Text>
                  <AnimatedSelect
                    value={cuentaAporteId}
                    onChange={setCuentaAporteId}
                    placeholder="Seleccione una cuenta"
                    options={cuentas.map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda === 'USD' ? '$' : 'Bs.'}${formatMoney(c.saldo_cache)})`,
                    }))}
                  />
                </>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.p600 },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleAporteSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmar Aporte</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Retiro */}
      <Modal visible={modalRetiro} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Retirar de: {selectedMeta?.nombre}
              </Text>
              <TouchableOpacity onPress={() => setModalRetiro(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Monto a retirar ({selectedMeta?.moneda})
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={montoRetiro}
                onChangeText={setMontoRetiro}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Cuenta Destino
              </Text>
              <AnimatedSelect
                value={cuentaRetiroId}
                onChange={setCuentaRetiroId}
                placeholder="Seleccione una cuenta"
                options={cuentas.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.moneda})`,
                }))}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Motivo / Descripción
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="Ej. Uso de emergencia..."
                placeholderTextColor="#64748b"
                value={descRetiro}
                onChangeText={setDescRetiro}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: '#0284c7' },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleRetiroSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmar Retiro</Text>
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
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newGoalText: {
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
  metaCard: {
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
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metaDueDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  metaPctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  metaPctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteIconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  metaAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaCurrentLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  metaCurrentBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metaTargetLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  metaActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  aporteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  aporteBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  aporteBtnCompleted: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  aporteBtnCompletedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aporteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  retiroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  retiroBtnLight: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  retiroBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ea580c',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'right',
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
  actionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionTextGreen: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionTextBlue: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnRed: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#450a0a',
    marginLeft: 'auto',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
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
