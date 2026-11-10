import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney, calcularBrechaCambiaria } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';
import { ArdillaMascot } from '../components/ArdillaMascot';

interface TasaItem {
  fuente: string;
  tasa: number;
  fecha: string;
}

export function MonitorTasasScreen({ onBack }: { onBack: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasas, setTasas] = useState<TasaItem[]>([]);

  async function fetchTasas() {
    try {
      const { data } = await supabase
        .from('tasas_cambio')
        .select('fuente, tasa, fecha')
        .order('fecha', { ascending: false });

      if (data && data.length > 0) {
        const ultimas = new Map<string, TasaItem>();
        data.forEach((r: any) => {
          if (!ultimas.has(r.fuente)) {
            ultimas.set(r.fuente, {
              fuente: r.fuente,
              tasa: Number(r.tasa),
              fecha: r.fecha
            });
          }
        });
        setTasas(Array.from(ultimas.values()));
      }
    } catch (e) {
      console.warn('Error fetchTasas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTasas();
  }, []);

  const bcv = tasas.find(t => t.fuente.toLowerCase().includes('bcv') || t.fuente.toLowerCase().includes('banco central'))?.tasa || 899.27;
  const p2p = tasas.find(t => t.fuente.toLowerCase().includes('p2p') || t.fuente.toLowerCase().includes('paralelo') || t.fuente.toLowerCase().includes('binance'))?.tasa || 1050.00;
  const brecha = calcularBrechaCambiaria(bcv, p2p);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Monitor de Tasas" onOpenMenu={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasas(); }} tintColor={colors.p500} />}
      >
        <FadeIn>
          {/* Card Brecha Destacada */}
          <View style={[styles.brechaCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.brechaHeader}>
              <View>
                <Text style={styles.brechaSub}>BRECHA CAMBIARIA EN VIVO</Text>
                <Text style={[styles.brechaMain, { color: '#ef4444' }]}>
                  +{brecha.porcentajeBrecha}%
                </Text>
              </View>
              <ArdillaMascot mood="saving" size={56} />
            </View>

            <View style={styles.ratesCompareRow}>
              <View style={styles.rateBox}>
                <Text style={styles.rateBoxLabel}>BCV (Oficial)</Text>
                <Text style={[styles.rateBoxVal, { color: isDarkMode ? '#fff' : '#0f172a' }]}>
                  Bs. {formatMoney(bcv)}
                </Text>
              </View>
              <View style={styles.rateBox}>
                <Text style={styles.rateBoxLabel}>USDT (P2P)</Text>
                <Text style={[styles.rateBoxVal, { color: colors.p500 }]}>
                  Bs. {formatMoney(p2p)}
                </Text>
              </View>
            </View>

            <View style={styles.adviceBox}>
              <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
              <Text style={styles.adviceText}>
                Tus 1.000 Bs rinden un {brecha.porcentajeBrecha}% más en comercios que cobran a tasa BCV si antes cambias divisas por P2P.
              </Text>
            </View>
          </View>

          {/* Lista de Cotizaciones del Mercado */}
          <Text style={[styles.sectionHeading, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            Cotizaciones del Mercado
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.tasasList}>
              {tasas.map((t) => (
                <View
                  key={t.fuente}
                  style={[styles.tasaRow, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tasaFuente, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                      {t.fuente}
                    </Text>
                    <Text style={styles.tasaFecha}>
                      {new Date(t.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.tasaValor, { color: colors.p500 }]}>
                    Bs. {formatMoney(t.tasa)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  brechaCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  brechaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brechaSub: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  brechaMain: { fontSize: 36, fontWeight: '900', marginTop: 2 },
  ratesCompareRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  rateBox: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: 'rgba(100,116,139,0.08)' },
  rateBoxLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  rateBoxVal: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  adviceBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center' },
  adviceText: { fontSize: 12, color: '#d97706', flex: 1, lineHeight: 17, fontWeight: '600' },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  tasasList: { gap: 10 },
  tasaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1 },
  tasaFuente: { fontSize: 15, fontWeight: '700' },
  tasaFecha: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  tasaValor: { fontSize: 17, fontWeight: '900' }
});
