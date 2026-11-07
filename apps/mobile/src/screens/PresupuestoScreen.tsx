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
import { FadeIn, AnimatedProgressBar, AnimatedNumber } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';
import { LinearGradient } from 'expo-linear-gradient';

interface PresupuestoScreenProps {
  onOpenMenu: () => void;
}

interface ProgresoPresupuesto {
  categoria_id: string;
  categoria_nombre: string;
  monto_planeado: number;
  monto_gastado: number;
  porcentaje_usado: number;
  restante: number;
}

interface CategoriaItem {
  id: string;
  nombre: string;
}

export function PresupuestoScreen({ onOpenMenu }: PresupuestoScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [mesActual, setMesActual] = useState(new Date());
  const [progreso, setProgreso] = useState<ProgresoPresupuesto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [montoPlaneado, setMontoPlaneado] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchPresupuesto() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const mesFormat = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;

      const [rpcRes, catsRes] = await Promise.all([
        supabase.rpc('obtener_progreso_presupuesto', {
          p_user_id: user.id,
          p_mes: mesFormat,
        }),
        supabase
          .from('categorias')
          .select('id, nombre')
          .eq('user_id', user.id)
          .eq('tipo', 'gasto')
          .order('nombre'),
      ]);

      if (rpcRes.data) {
        setProgreso(
          rpcRes.data.map((r: any) => ({
            categoria_id: r.categoria_id,
            categoria_nombre: r.categoria_nombre,
            monto_planeado: Number(r.monto_planeado),
            monto_gastado: Number(r.monto_gastado),
            porcentaje_usado: Number(r.porcentaje_usado),
            restante: Number(r.restante),
          }))
        );
      }

      if (catsRes.data) {
        setCategorias(catsRes.data);
        if (catsRes.data.length > 0 && !selectedCatId) {
          setSelectedCatId(catsRes.data[0].id);
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
    fetchPresupuesto();
  }, [mesActual]);

  async function handleSavePresupuesto() {
    if (!selectedCatId || !montoPlaneado || Number(montoPlaneado) <= 0) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const mesFormat = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;

      const { error } = await supabase.from('presupuestos').upsert(
        [
          {
            user_id: user.id,
            categoria_id: selectedCatId,
            monto_planeado: Number(montoPlaneado),
            moneda: 'USD',
            mes: mesFormat,
          },
        ],
        { onConflict: 'user_id,categoria_id,mes' }
      );

      if (error) throw error;

      setModalOpen(false);
      setMontoPlaneado('');
      fetchPresupuesto();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el presupuesto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopiarMesAnterior() {
    const mesAnterior = new Date(mesActual);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);

    const mesOrigenFormat = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}-01`;
    const mesDestinoFormat = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}-01`;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('copiar_presupuesto_anterior', {
        p_mes_origen: mesOrigenFormat,
        p_mes_destino: mesDestinoFormat,
      });
      if (error) throw error;
      fetchPresupuesto();
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error al copiar', e.message || 'No se pudieron copiar los presupuestos');
    }
  }

  const handleMoverMes = (offset: number) => {
    const d = new Date(mesActual);
    d.setMonth(d.getMonth() + offset);
    setMesActual(d);
  };

  const totalPlaneado = progreso.reduce((acc, curr) => acc + curr.monto_planeado, 0);
  const totalGastado = progreso.reduce((acc, curr) => acc + curr.monto_gastado, 0);

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Presupuesto" onOpenMenu={onOpenMenu} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPresupuesto();
            }}
            tintColor={colors.p500}
          />
        }
      >
        {/* Selector de Mes */}
        <View style={[styles.monthSelector, !isDarkMode && styles.cardLight]}>
          <TouchableOpacity onPress={() => handleMoverMes(-1)} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={18} color={colors.p500} />
            <Text style={[styles.monthText, !isDarkMode && styles.textDark]}>
              {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleMoverMes(1)} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Resumen Card Global con Gradiente */}
        <FadeIn delay={50}>
          <LinearGradient
            colors={[colors.p600, colors.p800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, { color: colors.p100 }]}>
                Presupuesto Planeado
              </Text>
              <AnimatedNumber
                value={totalPlaneado}
                formatter={(v) => `$${formatMoney(v)}`}
                duration={1300}
                style={styles.summaryAmount}
              />
            </View>
            <View style={styles.dividerVertical} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={[styles.summaryLabel, { color: colors.p100 }]}>Total Gastado</Text>
              <AnimatedNumber
                value={totalGastado}
                formatter={(v) => `$${formatMoney(v)}`}
                duration={1300}
                delay={150}
                style={styles.summaryAmount}
              />
            </View>
          </LinearGradient>
        </FadeIn>

        <View style={styles.headerRow}>
          <Text style={[styles.sectionHeading, !isDarkMode && styles.textDark]}>
            Categorías ({progreso.length})
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.copyBtn, !isDarkMode && styles.cardLight]}
              onPress={handleCopiarMesAnterior}
            >
              <Ionicons name="copy-outline" size={14} color={colors.p500} />
              <Text style={[styles.copyBtnText, { color: colors.p500 }]}>Copiar ant.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.newPresBtn, { backgroundColor: colors.p600 }]}
              onPress={() => {
                setMontoPlaneado('');
                setModalOpen(true);
              }}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.newPresText}>Fijar límite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : progreso.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="flag-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin presupuesto programado
            </Text>
            <Text style={styles.emptyDesc}>
              Define límites de gasto mensual para cada categoría o copia el del mes anterior.
            </Text>
          </View>
        ) : (
          progreso.map((p, idx) => {
            const isOver = p.porcentaje_usado >= 100;
            const isWarning = p.porcentaje_usado >= 90;
            const progress = Math.min(100, Math.round(p.porcentaje_usado));
            const barColor = isOver ? '#ef4444' : isWarning ? '#f97316' : colors.p500;

            return (
              <FadeIn key={p.categoria_id} delay={idx * 70}>
                <View style={[styles.progCard, !isDarkMode && styles.cardLight]}>
                  {/* Fila superior: Categoría + Alerta + Montos */}
                  <View style={styles.progHeader}>
                    <View style={styles.progTitleGroup}>
                      <Text style={[styles.progName, !isDarkMode && styles.textDark]}>
                        {p.categoria_nombre}
                      </Text>
                      {isWarning ? (
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color={isOver ? '#ef4444' : '#f97316'}
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.progAmount, !isDarkMode && styles.textDark]}>
                      ${formatMoney(p.monto_gastado)}{' '}
                      <Text style={styles.progAmountSub}>
                        / ${formatMoney(p.monto_planeado)}
                      </Text>
                    </Text>
                  </View>

                  {/* Barra de progreso */}
                  <AnimatedProgressBar
                    progress={progress}
                    color={barColor}
                    bgColor={isDarkMode ? '#1e293b' : '#e2e8f0'}
                    height={10}
                  />

                  {/* Fila inferior: % Usado + Restante + Botón Editar */}
                  <View style={styles.progFooter}>
                    <Text style={[styles.percentText, { color: barColor }]}>
                      {p.porcentaje_usado}% utilizado
                    </Text>
                    <View style={styles.progFooterRight}>
                      <Text style={[styles.restanteText, p.restante < 0 && styles.restanteAlert]}>
                        {p.restante < 0
                          ? `Excedido por $${formatMoney(Math.abs(p.restante))}`
                          : `Restante: $${formatMoney(p.restante)}`}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCatId(p.categoria_id);
                          setMontoPlaneado(p.monto_planeado.toString());
                          setModalOpen(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.editLinkText, { color: colors.p500 }]}>Editar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>

      {/* Modal Fijar / Editar Presupuesto */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                Presupuestar Categoría
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Categoría de gasto
              </Text>
              <AnimatedSelect
                value={selectedCatId}
                onChange={setSelectedCatId}
                placeholder="Seleccione una categoría"
                options={categorias.map((c) => ({
                  value: c.id,
                  label: c.nombre,
                }))}
              />

              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Monto límite mensual (USD)
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={montoPlaneado}
                onChangeText={setMontoPlaneado}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.p600 },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleSavePresupuesto}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Límite</Text>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navArrow: {
    padding: 6,
  },
  monthText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newPresBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newPresText: {
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
  progCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
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
  progHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  progName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progAmount: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  progAmountSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'normal',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restanteAlert: {
    color: '#ef4444',
    fontWeight: '600',
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  restanteText: {
    fontSize: 12,
    color: '#94a3b8',
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
