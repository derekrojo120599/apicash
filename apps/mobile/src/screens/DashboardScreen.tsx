import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { FadeIn, AnimatedNumber, AnimatedScalePressable } from '../components/Animations';
import { useMobileRealtime } from '../context/RealtimeContext';
import { ApicashLogo } from '../components/ApicashLogo';
import { ArdillaMascot } from '../components/ArdillaMascot';
import { TopBar } from '../components/TopBar';
import { ChekeaTopBar } from '../components/ChekeaTopBar';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { LinearGradient } from 'expo-linear-gradient';

interface DashboardScreenProps {
  onLogout: () => void;
  onOpenMenu: () => void;
  onNavigateTab?: (tab: any) => void;
}

interface BalanceNetoRPC {
  usd_fijo: number;
  ves_total: number;
  ves_en_usd: number;
  balance_neto: number;
  tasa_usada: number;
  tasa_fecha: string;
}

interface ResumenMes {
  ingresos: number;
  gastos: number;
  ahorros: number;
  deuda: number;
}

interface Transaccion {
  id: string;
  descripcion: string;
  tipo: string;
  transferencia_direccion?: string | null;
  monto_original: number;
  moneda_original: 'USD' | 'VES';
  monto_usd_calculado: number;
  fecha: string;
  anulada: boolean;
  cuentas?: { nombre: string };
  categorias?: { nombre: string; icono: string };
}

export function DashboardScreen({ onOpenMenu, onNavigateTab }: DashboardScreenProps) {
  const { colors, isDarkMode } = useAppTheme();
  const { syncTick } = useMobileRealtime();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaccion | null>(null);
  const [balanceNeto, setBalanceNeto] = useState<BalanceNetoRPC | null>(null);
  const [summary, setSummary] = useState<ResumenMes>({ ingresos: 0, gastos: 0, ahorros: 0, deuda: 0 });
  const [transactions, setTransactions] = useState<Transaccion[]>([]);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Modo demo / offline: proveer datos locales de muestra
        setBalanceNeto({
          usd_fijo: 1500.0,
          ves_total: 1050000.0,
          ves_en_usd: 1167.61,
          balance_neto: 2667.61,
          tasa_usada: 899.27,
          tasa_fecha: new Date().toISOString()
        });
        setSummary({
          ingresos: 2500.0,
          gastos: 832.39,
          ahorros: 500.0,
          deuda: 150.0
        });
        setTransactions([
          {
            id: 'demo-1',
            descripcion: 'Automercados Plaza - Compra semanal',
            tipo: 'gasto',
            monto_original: 45.5,
            moneda_original: 'USD',
            monto_usd_calculado: 45.5,
            fecha: new Date().toISOString(),
            anulada: false,
            cuentas: { nombre: 'Banesco USD' },
            categorias: { nombre: 'Alimentación', icono: 'restaurant' }
          },
          {
            id: 'demo-2',
            descripcion: 'Pago Freelance UI/UX',
            tipo: 'ingreso',
            monto_original: 800.0,
            moneda_original: 'USD',
            monto_usd_calculado: 800.0,
            fecha: new Date().toISOString(),
            anulada: false,
            cuentas: { nombre: 'Zinli' },
            categorias: { nombre: 'Salario', icono: 'cash' }
          }
        ]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const inicioMesISO = inicioMes.toISOString();

      const rpcPromise = supabase.rpc('obtener_balance_neto', { p_user_id: user.id });

      const ingresosPromise = supabase
        .from('transacciones')
        .select('monto_usd_calculado')
        .eq('user_id', user.id)
        .eq('tipo', 'ingreso')
        .eq('anulada', false)
        .gte('fecha', inicioMesISO);

      const gastosPromise = supabase
        .from('transacciones')
        .select('monto_usd_calculado')
        .eq('user_id', user.id)
        .eq('tipo', 'gasto')
        .eq('anulada', false)
        .gte('fecha', inicioMesISO);

      const metasPromise = supabase
        .from('metas')
        .select('monto_actual, moneda')
        .eq('user_id', user.id);

      const deudasPromise = supabase
        .from('deudas')
        .select('saldo_pendiente, moneda')
        .eq('user_id', user.id);

      const txPromise = supabase
        .from('transacciones')
        .select(`
          id,
          descripcion,
          tipo,
          transferencia_direccion,
          monto_original,
          moneda_original,
          monto_usd_calculado,
          fecha,
          anulada,
          cuentas!cuenta_id(nombre),
          categorias(nombre, icono)
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(5);

      const [rpcRes, ingRes, gasRes, metasRes, deudasRes, txRes] = await Promise.all([
        rpcPromise,
        ingresosPromise,
        gastosPromise,
        metasPromise,
        deudasPromise,
        txPromise,
      ]);

      let tasaRef = 1;
      if (!rpcRes.error && rpcRes.data?.[0]) {
        const item = rpcRes.data[0];
        tasaRef = Number(item.tasa_usada || 1);
        setBalanceNeto({
          usd_fijo: Number(item.usd_fijo || 0),
          ves_total: Number(item.ves_total || 0),
          ves_en_usd: Number(item.ves_en_usd || 0),
          balance_neto: Number(item.balance_neto || 0),
          tasa_usada: tasaRef,
          tasa_fecha: item.tasa_fecha || new Date().toISOString(),
        });
      }

      const totalIngresos = (ingRes.data || []).reduce((acc: number, curr: any) => acc + Number(curr.monto_usd_calculado || 0), 0);
      const totalGastos = (gasRes.data || []).reduce((acc: number, curr: any) => acc + Number(curr.monto_usd_calculado || 0), 0);

      const totalAhorros = (metasRes.data || []).reduce((acc: number, curr: any) => {
        const val = Number(curr.monto_actual || 0);
        return acc + (curr.moneda === 'VES' && tasaRef > 0 ? val / tasaRef : val);
      }, 0);

      const totalDeudas = (deudasRes.data || []).reduce((acc: number, curr: any) => {
        const val = Number(curr.saldo_pendiente || 0);
        return acc + (curr.moneda === 'VES' && tasaRef > 0 ? val / tasaRef : val);
      }, 0);

      setSummary({
        ingresos: totalIngresos,
        gastos: totalGastos,
        ahorros: totalAhorros,
        deuda: totalDeudas,
      });

      if (!txRes.error && txRes.data) {
        setTransactions(txRes.data as unknown as Transaccion[]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [syncTick]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color={colors.p500} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <ChekeaTopBar
        onOpenMenu={onOpenMenu}
        onOpenProfile={() => onNavigateTab && onNavigateTab('perfil')}
        onOpenSupport={() => onNavigateTab && onNavigateTab('asistente')}
        onOpenNotifications={() => onNavigateTab && onNavigateTab('movimientos')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
          {/* Tarjeta de Balance Total con paleta oficial Apicash */}
          <LinearGradient
            colors={[colors.p600, colors.p800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chekeaCardGradient}
          >
            <View style={styles.watermarkArdilla}>
              <ArdillaMascot mood="saving" size={120} />
            </View>

            <View style={styles.chekeaCardTop}>
              <Text style={[styles.chekeaCardSub, { color: colors.p100 }]}>Balance Total</Text>
              <Text style={[styles.chekeaCardCurrencies, { color: colors.p200 }]}>
                {balanceNeto?.tasa_usada ? `Bs. ${formatMoney(balanceNeto.tasa_usada)} / $` : 'USD / VES'}
              </Text>
            </View>

            <AnimatedNumber
              value={balanceNeto?.balance_neto ?? 0}
              formatter={(v) => `$${formatMoney(v)}`}
              duration={1200}
              style={[styles.chekeaMainBalance, { color: '#ffffff' }]}
            />

            {balanceNeto?.ves_total ? (
              <Text style={[styles.chekeaSecondaryBalance, { color: colors.p100 }]}>
                ≈ Bs. {formatMoney(balanceNeto.ves_total)}
              </Text>
            ) : null}
          </LinearGradient>

        {/* Bloque Ingresos y Gastos estilo Chekea (Dos cajas paralelas) */}
        <FadeIn delay={100}>
          <View style={styles.ingresosGastosRow}>
            <View style={[styles.ingresoBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.ingresoLabel}>Ingresos</Text>
              <Text style={[styles.ingresoValue, { color: '#10b981' }]}>
                +${formatMoney(summary.ingresos)}
              </Text>
            </View>

            <View style={[styles.gastoBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.gastoLabel}>Gastos</Text>
              <Text style={[styles.gastoValue, { color: '#ef4444' }]}>
                -${formatMoney(summary.gastos)}
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* Grid de 8 Accesos Rápidos estilo Chekea (Editar, Escanear, Calculadora, Crédito, Préstamos, Categorías, Mover, Recurrentes) */}
        <FadeIn delay={150}>
          <QuickActionsGrid
            onNavigateTab={(tab) => onNavigateTab && onNavigateTab(tab)}
            onOpenNewTransaction={() => setModalOpen(true)}
          />
        </FadeIn>

        {/* Transacciones Recientes */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeading, !isDarkMode && { color: '#0f172a' }]}>
            Transacciones Recientes
          </Text>
          {onNavigateTab ? (
            <TouchableOpacity onPress={() => onNavigateTab('movimientos')}>
              <Text style={{ color: colors.p500, fontSize: 13, fontWeight: '600' }}>
                Ver todas
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.transactionsContainer, !isDarkMode && styles.cardLight]}>
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ArdillaMascot mood="searching" size={68} />
              <Text style={styles.emptyTitle}>Aún no hay transacciones para mostrar.</Text>
              <Text style={styles.emptySubtitle}>
                Registra el primer movimiento para visualizar el historial aquí.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isPositive =
                tx.tipo === 'ingreso' ||
                (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada');
              const isNegative =
                tx.tipo === 'gasto' ||
                (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'salida');

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txRow,
                    !isDarkMode && { borderBottomColor: '#e2e8f0' },
                  ]}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.txIconWrap,
                      isPositive
                        ? { backgroundColor: `${colors.p500}22` }
                        : isNegative
                        ? styles.txIconRed
                        : styles.txIconBlue,
                    ]}
                  >
                    <Ionicons
                      name={
                        isPositive
                          ? 'arrow-down'
                          : isNegative
                          ? 'arrow-up'
                          : 'swap-horizontal'
                      }
                      size={18}
                      color={
                        isPositive ? colors.p500 : isNegative ? '#ef4444' : '#3b82f6'
                      }
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text
                      style={[
                        styles.txTitle,
                        !isDarkMode && { color: '#0f172a' },
                        tx.anulada && styles.txAnulada,
                      ]}
                      numberOfLines={1}
                    >
                      {tx.descripcion || tx.categorias?.nombre || 'Sin categoría'}
                    </Text>
                    <Text style={styles.txSub}>
                      {tx.cuentas?.nombre || 'Cuenta'} • {new Date(tx.fecha).toLocaleDateString('es-ES')}
                    </Text>
                  </View>

                  <View style={styles.txAmountWrap}>
                    <Text
                      style={[
                        styles.txAmount,
                        isPositive
                          ? { color: colors.p500 }
                          : isNegative
                          ? styles.textRed
                          : !isDarkMode
                          ? { color: '#0f172a' }
                          : styles.textWhite,
                      ]}
                    >
                      {isPositive ? '+' : isNegative ? '-' : ''}
                      {tx.moneda_original === 'USD' ? '$' : 'Bs. '}
                      {formatMoney(tx.monto_original)}
                    </Text>
                    {tx.moneda_original === 'VES' ? (
                      <Text style={styles.txUsdEquiv}>
                        ≈ ${formatMoney(tx.monto_usd_calculado)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <NewTransactionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      {/* Modal Detalle de Movimiento desde el Dashboard */}
      <Modal visible={selectedTx !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          {selectedTx ? (
            <View style={[styles.detailModalCard, !isDarkMode && styles.cardLight]}>
              <View
                style={[
                  styles.detailHeader,
                  !isDarkMode && { backgroundColor: '#f8fafc', borderBottomColor: '#e2e8f0' },
                ]}
              >
                <Text style={[styles.detailHeaderTitle, !isDarkMode && { color: '#0f172a' }]}>
                  Detalle del Movimiento
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedTx(null)}
                  style={[styles.closeCircleBtn, !isDarkMode && { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}
                >
                  <Ionicons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.detailAmountBox,
                  !isDarkMode && { borderBottomColor: '#e2e8f0' },
                ]}
              >
                <Text style={styles.detailTypeLabel}>{selectedTx.tipo.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.detailBigAmount,
                    selectedTx.tipo === 'ingreso' ||
                    (selectedTx.tipo === 'transferencia' && selectedTx.transferencia_direccion === 'entrada')
                      ? { color: colors.p500 }
                      : !isDarkMode
                      ? { color: '#0f172a' }
                      : { color: '#ffffff' },
                    selectedTx.anulada && styles.lineThrough,
                  ]}
                >
                  {selectedTx.tipo === 'ingreso' ||
                  (selectedTx.tipo === 'transferencia' && selectedTx.transferencia_direccion === 'entrada')
                    ? '+'
                    : '-'}
                  {selectedTx.moneda_original === 'USD' ? '$' : 'Bs. '}
                  {formatMoney(selectedTx.monto_original)}
                </Text>

                {selectedTx.moneda_original === 'VES' ? (
                  <Text style={styles.detailUsdEquiv}>
                    ≈ ${formatMoney(selectedTx.monto_usd_calculado)} USD
                  </Text>
                ) : null}

                {selectedTx.anulada ? (
                  <View style={styles.anuladaPill}>
                    <Text style={styles.anuladaPillText}>ANULADA</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Fecha</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && { color: '#0f172a' }]}>
                    {new Date(selectedTx.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Categoría</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && { color: '#0f172a' }]}>
                    {selectedTx.categorias?.nombre || 'Sin categoría'}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Cuenta</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && { color: '#0f172a' }]}>
                    {selectedTx.cuentas?.nombre || '-'}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Tasa usada</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && { color: '#0f172a' }]}>
                    {selectedTx.moneda_original === 'VES' && balanceNeto?.tasa_usada
                      ? `${formatMoney(balanceNeto.tasa_usada)} VES/USD`
                      : '-'}
                  </Text>
                </View>
              </View>

              <View style={[styles.descBox, !isDarkMode && { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
                <Text style={styles.descBoxLabel}>DESCRIPCIÓN</Text>
                <Text style={[styles.descBoxText, !isDarkMode && { color: '#0f172a' }]}>
                  {selectedTx.descripcion || 'Sin descripción'}
                </Text>
              </View>

              <View
                style={[
                  styles.detailFooter,
                  !isDarkMode && { backgroundColor: '#f8fafc', borderTopColor: '#e2e8f0' },
                ]}
              >
                <TouchableOpacity
                  style={[styles.closeFooterBtn, !isDarkMode && { backgroundColor: '#e2e8f0' }]}
                  onPress={() => setSelectedTx(null)}
                >
                  <Text style={[styles.closeFooterText, !isDarkMode && { color: '#0f172a' }]}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
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
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  chekeaCardGradient: {
    padding: 22,
    borderRadius: 28,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkArdilla: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    opacity: 0.18,
  },
  chekeaCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chekeaCardSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  chekeaCardCurrencies: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  chekeaMainBalance: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  chekeaSecondaryBalance: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  ingresosGastosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ingresoBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  ingresoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  ingresoValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  gastoBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  gastoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  gastoValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  newMoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newMoveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  gradientCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkLogo: {
    position: 'absolute',
    top: -10,
    right: -10,
    opacity: 0.85,
    zIndex: 0,
  },
  netBalanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  netBalanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  whiteDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 18,
  },
  dualCurrencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dualCol: {
    flex: 1,
  },
  dualLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  dualAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dualSubtext: {
    fontSize: 11,
    marginTop: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCardWrap: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  metricCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    flexShrink: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  txIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txIconRed: {
    backgroundColor: '#450a0a',
  },
  txIconBlue: {
    backgroundColor: '#172554',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  txAnulada: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  txSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txUsdEquiv: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  textRed: {
    color: '#ef4444',
  },
  textWhite: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  detailModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#1e293b66',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailAmountBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  detailTypeLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailBigAmount: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  detailUsdEquiv: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 6,
  },
  anuladaPill: {
    marginTop: 10,
    backgroundColor: '#ef444425',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  anuladaPillText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 18,
    gap: 14,
  },
  detailGridItem: {
    width: '46%',
  },
  detailFieldLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  detailFieldVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  descBox: {
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b88',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  descBoxLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  descBoxText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b66',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  closeFooterBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
  },
  closeFooterText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  lineThrough: {
    textDecorationLine: 'line-through',
  },
});
