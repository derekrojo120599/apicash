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
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { useAppTheme } from '../context/ThemeContext';
import { AnimatedSelect } from '../components/AnimatedSelect';
import { FadeIn } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { useMobileRealtime } from '../context/RealtimeContext';

interface MovimientosScreenProps {
  onOpenMenu: () => void;
}

interface Transaccion {
  id: string;
  descripcion: string;
  tipo: string;
  categoria_id: string | null;
  transferencia_direccion?: string | null;
  monto_original: number;
  moneda_original: 'USD' | 'VES';
  tasa_al_momento: number | null;
  monto_usd_calculado: number;
  fecha: string;
  anulada: boolean;
  cuentas?: { nombre: string };
  categorias?: { nombre: string; icono: string; tipo: string };
}

interface CategoriaOption {
  id: string;
  nombre: string;
}

export function MovimientosScreen({ onOpenMenu }: MovimientosScreenProps) {
  const { colors, isDarkMode } = useAppTheme();
  const { syncTick } = useMobileRealtime();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterCatId, setFilterCatId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaccion | null>(null);

  async function fetchTransacciones() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString();

      const [txRes, catRes] = await Promise.all([
        supabase
          .from('transacciones')
          .select(`
            id,
            descripcion,
            tipo,
            categoria_id,
            transferencia_direccion,
            monto_original,
            moneda_original,
            tasa_al_momento,
            monto_usd_calculado,
            fecha,
            anulada,
            cuentas!cuenta_id(nombre),
            categorias(nombre, icono, tipo)
          `)
          .eq('user_id', user.id)
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth)
          .order('fecha', { ascending: false }),
        supabase.from('categorias').select('id, nombre').eq('user_id', user.id).order('nombre'),
      ]);

      if (!txRes.error && txRes.data) {
        setTransacciones(txRes.data as unknown as Transaccion[]);
      }
      if (catRes.data) {
        setCategorias(catRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTransacciones();
  }, [currentMonth, syncTick]);

  const handleMoverMes = (offset: number) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d);
  };

  async function handleToggleAnulada(tx: Transaccion) {
    const esRestaurar = tx.anulada;
    Alert.alert(
      esRestaurar
        ? '¿Desea restaurar esta transacción?'
        : '¿Confirma la anulación de esta transacción?',
      esRestaurar
        ? 'Esto restablecerá el balance previo a la anulación.'
        : 'Esto revertirá el impacto en el saldo de la cuenta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: esRestaurar ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('transacciones')
                .update({ anulada: !esRestaurar })
                .eq('id', tx.id);

              if (error) throw error;

              if (selectedTx?.id === tx.id) {
                setSelectedTx({ ...tx, anulada: !esRestaurar });
              }
              fetchTransacciones();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo actualizar la transacción.');
            }
          },
        },
      ]
    );
  }

  const filtered = transacciones.filter((t) => {
    if (filterTipo !== 'todos') {
      if (filterTipo === 'ahorro') {
        if (t.categorias?.tipo !== 'ahorro') return false;
      } else if (t.tipo !== filterTipo) {
        return false;
      }
    }
    if (filterCatId && t.categoria_id !== filterCatId) return false;
    return true;
  });

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
          <Text style={[styles.brandTitle, !isDarkMode && styles.textDark]}>Transacciones</Text>
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
              fetchTransacciones();
            }}
            tintColor={colors.p500}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>Movimientos del mes ({filtered.length})</Text>
          <TouchableOpacity
            style={[styles.newTxBtn, { backgroundColor: colors.p600 }]}
            onPress={() => setModalOpen(true)}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newTxText}>Nueva transacción</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de Mes */}
        <View style={[styles.monthSelector, !isDarkMode && styles.cardLight]}>
          <TouchableOpacity onPress={() => handleMoverMes(-1)} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={18} color={colors.p500} />
            <Text style={[styles.monthText, !isDarkMode && styles.textDark]}>
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleMoverMes(1)} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Filtros con AnimatedSelect */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <AnimatedSelect
              value={filterTipo}
              onChange={setFilterTipo}
              placeholder="Todos los tipos"
              options={[
                { value: 'todos', label: 'Todos los tipos' },
                { value: 'gasto', label: 'Gastos' },
                { value: 'ingreso', label: 'Ingresos' },
                { value: 'transferencia', label: 'Transferencias' },
                { value: 'ahorro', label: 'Ahorros' },
                { value: 'ajuste', label: 'Ajustes' },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AnimatedSelect
              value={filterCatId}
              onChange={setFilterCatId}
              placeholder="Todas las categorías"
              options={[
                { value: '', label: 'Todas las categorías' },
                ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="receipt-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin transacciones
            </Text>
            <Text style={styles.emptyDesc}>
              No hay movimientos en este mes que coincidan con el filtro.
            </Text>
          </View>
        ) : (
          filtered.map((tx, idx) => {
            const isPositive =
              tx.tipo === 'ingreso' ||
              (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada');
            const isNegative =
              tx.tipo === 'gasto' ||
              (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'salida');

            return (
              <FadeIn key={tx.id} delay={Math.min(idx * 50, 400)}>
                <TouchableOpacity
                  style={[
                    styles.txCard,
                    !isDarkMode && styles.cardLight,
                    tx.anulada && styles.txAnuladaCard,
                  ]}
                  onPress={() => setSelectedTx(tx)}
                  onLongPress={() => handleToggleAnulada(tx)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.txIcon,
                      isPositive
                        ? { backgroundColor: `${colors.p500}22` }
                        : isNegative
                        ? styles.bgRed
                        : styles.bgBlue,
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
                      size={20}
                      color={isPositive ? colors.p500 : isNegative ? '#ef4444' : '#3b82f6'}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text
                      style={[
                        styles.txTitle,
                        !isDarkMode && styles.textDark,
                        tx.anulada && styles.lineThrough,
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
                          ? styles.textDark
                          : styles.textWhite,
                        tx.anulada && styles.lineThrough,
                      ]}
                    >
                      {isPositive ? '+' : isNegative ? '-' : ''}
                      {tx.moneda_original === 'USD' ? '$' : 'Bs. '}
                      {formatMoney(tx.monto_original)}
                    </Text>
                    {tx.moneda_original === 'VES' ? (
                      <Text style={styles.txUsd}>
                        ≈ ${formatMoney(tx.monto_usd_calculado)}
                      </Text>
                    ) : null}
                    {tx.anulada ? (
                      <View style={styles.badgeAnuladaWrap}>
                        <Text style={styles.badgeAnulada}>ANULADA</Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggleAnulada(tx)}
                    style={styles.voidBtn}
                  >
                    <Ionicons
                      name={tx.anulada ? 'refresh-outline' : 'ban-outline'}
                      size={18}
                      color={tx.anulada ? colors.p500 : '#ef4444'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </FadeIn>
            );
          })
        )}
      </ScrollView>

      {/* Modal Crear Transacción */}
      <NewTransactionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchTransacciones()}
      />

      {/* Modal de Detalle del Movimiento (Idéntico al de la versión Web) */}
      <Modal visible={selectedTx !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          {selectedTx ? (
            <View style={[styles.detailModalCard, !isDarkMode && styles.cardLight]}>
              {/* Header */}
              <View
                style={[
                  styles.detailHeader,
                  !isDarkMode && {
                    backgroundColor: '#f8fafc',
                    borderBottomColor: '#e2e8f0',
                  },
                ]}
              >
                <Text style={[styles.detailHeaderTitle, !isDarkMode && styles.textDark]}>
                  Detalle del Movimiento
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedTx(null)}
                  style={[styles.closeCircleBtn, !isDarkMode && styles.inputLight]}
                >
                  <Ionicons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Main Amount */}
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
                    (selectedTx.tipo === 'transferencia' &&
                      selectedTx.transferencia_direccion === 'entrada')
                      ? { color: colors.p500 }
                      : !isDarkMode
                      ? styles.textDark
                      : styles.textWhite,
                    selectedTx.anulada && styles.lineThrough,
                  ]}
                >
                  {selectedTx.tipo === 'ingreso' ||
                  (selectedTx.tipo === 'transferencia' &&
                    selectedTx.transferencia_direccion === 'entrada')
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

              {/* Details Grid 2x2 */}
              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Fecha</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && styles.textDark]}>
                    {new Date(selectedTx.fecha).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Categoría</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && styles.textDark]}>
                    {selectedTx.categorias?.nombre || 'Sin categoría'}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Cuenta</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && styles.textDark]}>
                    {selectedTx.cuentas?.nombre || '-'}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={styles.detailFieldLabel}>Tasa usada</Text>
                  <Text style={[styles.detailFieldVal, !isDarkMode && styles.textDark]}>
                    {selectedTx.tasa_al_momento
                      ? `${formatMoney(selectedTx.tasa_al_momento)} VES/USD`
                      : '-'}
                  </Text>
                </View>
              </View>

              {/* Descripción */}
              <View style={[styles.descBox, !isDarkMode && styles.inputLight]}>
                <Text style={styles.descBoxLabel}>DESCRIPCIÓN</Text>
                <Text style={[styles.descBoxText, !isDarkMode && styles.textDark]}>
                  {selectedTx.descripcion || 'Sin descripción'}
                </Text>
              </View>

              {/* Footer con botón Anular/Restaurar y Cerrar */}
              <View
                style={[
                  styles.detailFooter,
                  !isDarkMode && {
                    backgroundColor: '#f8fafc',
                    borderTopColor: '#e2e8f0',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.footerActionBtn,
                    selectedTx.anulada
                      ? { backgroundColor: `${colors.p500}22` }
                      : { backgroundColor: '#ef444422' },
                  ]}
                  onPress={() => handleToggleAnulada(selectedTx)}
                >
                  <Ionicons
                    name={selectedTx.anulada ? 'refresh-outline' : 'ban-outline'}
                    size={16}
                    color={selectedTx.anulada ? colors.p500 : '#ef4444'}
                  />
                  <Text
                    style={{
                      color: selectedTx.anulada ? colors.p500 : '#ef4444',
                      fontWeight: 'bold',
                      fontSize: 13,
                    }}
                  >
                    {selectedTx.anulada ? 'Restaurar' : 'Anular'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeFooterBtn, !isDarkMode && styles.inputLight]}
                  onPress={() => setSelectedTx(null)}
                >
                  <Text style={[styles.closeFooterText, !isDarkMode && styles.textDark]}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  newTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newTxText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 14,
    marginBottom: 12,
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
  txCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  txAnuladaCard: {
    opacity: 0.55,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bgRed: {
    backgroundColor: '#450a0a',
  },
  bgBlue: {
    backgroundColor: '#172554',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  lineThrough: {
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
    marginRight: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  txUsd: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  badgeAnuladaWrap: {
    backgroundColor: '#ef444425',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  badgeAnulada: {
    fontSize: 9,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  voidBtn: {
    padding: 8,
    borderRadius: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b66',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
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
  textRed: {
    color: '#ef4444',
  },
  textWhite: {
    color: '#ffffff',
  },
  textDark: {
    color: '#0f172a',
  },
});
