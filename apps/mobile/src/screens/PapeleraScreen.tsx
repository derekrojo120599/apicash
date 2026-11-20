import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { useMobileRealtime } from '../context/RealtimeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';

interface PapeleraScreenProps {
  onOpenMenu: () => void;
}

interface PapeleraTransaccion {
  id: string;
  tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste';
  monto_original: number;
  moneda_original: 'USD' | 'VES';
  monto_usd_calculado: number;
  descripcion: string;
  deleted_at: string | null;
  cuentas?: { nombre: string; moneda: string } | null;
  categorias?: { nombre: string; icono: string; tipo: string } | null;
}

export function PapeleraScreen({ onOpenMenu }: PapeleraScreenProps) {
  const { colors, isDarkMode } = useAppTheme();
  const { syncTick } = useMobileRealtime();

  const [transacciones, setTransacciones] = useState<PapeleraTransaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas!cuenta_id(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setTransacciones((data ?? []) as unknown as PapeleraTransaccion[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error al cargar la papelera:', message);
      Alert.alert('Error', 'No se pudo cargar la papelera: ' + message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData, syncTick]);

  async function handleRestaurar(tx: PapeleraTransaccion) {
    setRestoringId(tx.id);
    try {
      const { error } = await supabase.rpc('restaurar_transaccion', {
        p_transaccion_id: tx.id,
      });

      if (error) throw error;

      Alert.alert(
        'Transacción restaurada',
        'El saldo y presupuesto se han recalculado correctamente.'
      );
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('Error al restaurar', message);
    } finally {
      setRestoringId(null);
    }
  }

  async function handlePurgar(tx: PapeleraTransaccion) {
    Alert.alert(
      'Eliminar definitivamente',
      '¿Eliminar definitivamente? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(tx.id);
            try {
              const { error } = await supabase.rpc('purgar_transaccion_definitiva', {
                p_transaccion_id: tx.id,
              });

              if (error) throw error;

              Alert.alert(
                'Eliminada definitivamente',
                'La transacción fue purgada del historial.'
              );
              await fetchData();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Error desconocido';
              Alert.alert('Error al eliminar', message);
            } finally {
              setPurgingId(null);
            }
          },
        },
      ]
    );
  }

  function formatDeletedDate(deletedAt: string | null): string {
    if (!deletedAt) return '';
    return new Date(deletedAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Papelera" onOpenMenu={onOpenMenu} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: '#ef444422' }]}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.heading, !isDarkMode && styles.textDark]}>
              Papelera de reciclaje
            </Text>
            <Text style={styles.subheading}>
              Movimientos eliminados recientemente
            </Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, !isDarkMode && styles.infoBannerLight]}>
          <Ionicons name="warning-outline" size={18} color={isDarkMode ? '#fbbf24' : '#b45309'} />
          <Text style={[styles.infoText, !isDarkMode && styles.infoTextLight]}>
            Los elementos enviados a la papelera revierten su impacto contable en cuentas y
            presupuestos. Permanecen aquí durante 30 días antes de ser eliminados de forma
            definitiva.
          </Text>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.p500} />
            <Text style={styles.loadingText}>Cargando elementos en papelera...</Text>
          </View>
        ) : transacciones.length === 0 ? (
          <FadeIn delay={100}>
            <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
              <Ionicons name="search-outline" size={48} color="#94a3b8" />
              <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
                La papelera está vacía
              </Text>
              <Text style={styles.emptySubtitle}>
                No tienes transacciones eliminadas pendientes de restaurar o purgar.
              </Text>
            </View>
          </FadeIn>
        ) : (
          transacciones.map((tx) => (
            <FadeIn key={tx.id}>
              <View style={[styles.card, !isDarkMode && styles.cardLight]}>
                <View style={styles.cardLeft}>
                  <View style={styles.titleRow}>
                    <View
                      style={[styles.tipoBadge, !isDarkMode && { backgroundColor: '#e2e8f0' }]}
                    >
                      <Text
                        style={[styles.tipoText, !isDarkMode && { color: '#475569' }]}
                      >
                        {tx.tipo}
                      </Text>
                    </View>
                    <Text
                      style={[styles.descripcion, !isDarkMode && styles.textDark]}
                      numberOfLines={1}
                    >
                      {tx.descripcion || tx.categorias?.nombre || 'Sin descripción'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {tx.cuentas?.nombre || 'Cuenta'}
                    </Text>
                    <Text style={styles.metaText}>•</Text>
                    <Text style={styles.metaText}>{formatDeletedDate(tx.deleted_at)}</Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <View style={styles.amountBox}>
                    <Text style={[styles.monto, !isDarkMode && styles.textDark]}>
                      {formatMoney(tx.monto_original)}
                    </Text>
                    <Text style={styles.moneda}>
                      {tx.moneda_original}
                    </Text>
                    {tx.moneda_original === 'VES' ? (
                      <Text style={styles.metaText}>
                        ≈ ${formatMoney(tx.monto_usd_calculado)} USD
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.restoreBtn, { borderColor: `${colors.p500}66` }]}
                      onPress={() => handleRestaurar(tx)}
                      disabled={restoringId !== null || purgingId !== null}
                      activeOpacity={0.7}
                    >
                      {restoringId === tx.id ? (
                        <ActivityIndicator size="small" color={colors.p500} />
                      ) : (
                        <>
                          <Ionicons name="refresh-outline" size={14} color={colors.p500} />
                          <Text style={[styles.restoreText, { color: colors.p500 }]}>
                            Restaurar
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.purgeBtn, !isDarkMode && styles.purgeBtnLight]}
                      onPress={() => handlePurgar(tx)}
                      disabled={restoringId !== null || purgingId !== null}
                      activeOpacity={0.7}
                    >
                      {purgingId === tx.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subheading: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  infoBanner: {
    backgroundColor: '#f59e0b14',
    borderColor: '#f59e0b55',
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  infoBannerLight: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#fde68a',
  },
  infoTextLight: {
    color: '#92400e',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 40,
    alignItems: 'center',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipoBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tipoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  descripcion: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amountBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  monto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cbd5e1',
    textDecorationLine: 'line-through',
  },
  moneda: {
    fontSize: 10,
    color: '#64748b',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  purgeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  purgeBtnLight: {
    backgroundColor: '#fef2f2',
  },
  textDark: {
    color: '#0f172a',
  },
});
