import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  formatMoney,
  calcularBrechaCambiaria,
  analizarConvenienciaPago
} from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';
import { LinearGradient } from 'expo-linear-gradient';

interface CalculadoraScreenProps {
  onOpenMenu: () => void;
}

interface TasaFuente {
  fuente: string;
  tasa: number;
}

export function CalculadoraScreen({ onOpenMenu }: CalculadoraScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [monto, setMonto] = useState('10');
  const [direccion, setDireccion] = useState<'USD_A_VES' | 'VES_A_USD'>('USD_A_VES');
  const [fuentes, setFuentes] = useState<TasaFuente[]>([]);
  const [tasaEfectiva, setTasaEfectiva] = useState<number>(0);
  const [fuenteNombre, setFuenteNombre] = useState<string>('Mediana P2P');
  const [customMode, setCustomMode] = useState(false);
  const [customRate, setCustomRate] = useState('');

  async function fetchTasas() {
    try {
      const { data } = await supabase
        .from('tasas_cambio')
        .select('fuente, fecha, tasa')
        .order('fecha', { ascending: false });

      if (data && data.length > 0) {
        const ultimasPorFuente = new Map<string, TasaFuente>();
        data.forEach((row: any) => {
          if (!ultimasPorFuente.has(row.fuente)) {
            ultimasPorFuente.set(row.fuente, {
              fuente: row.fuente,
              tasa: Number(row.tasa),
            });
          }
        });
        const lista = Array.from(ultimasPorFuente.values());
        setFuentes(lista);
        if (lista.length > 0) {
          setTasaEfectiva(lista[0].tasa);
          setFuenteNombre(lista[0].fuente);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchTasas();
  }, []);

  const rateActiva = customMode ? parseFloat(customRate) || 0 : tasaEfectiva;
  const numMonto = parseFloat(monto) || 0;
  const resultado =
    direccion === 'USD_A_VES'
      ? numMonto * rateActiva
      : rateActiva > 0
      ? numMonto / rateActiva
      : 0;

  const presets = direccion === 'USD_A_VES' ? [5, 10, 20, 50, 100] : [200, 500, 1000, 2500, 5000];

  async function compartirResultado() {
    if (!resultado) return;
    await Share.share({
      message: `${direccion === 'USD_A_VES' ? '$' : 'Bs. '}${formatMoney(numMonto)} equivalen a ${
        direccion === 'USD_A_VES' ? 'Bs. ' : '$'
      }${formatMoney(resultado)} (Tasa: Bs. ${formatMoney(rateActiva)})`,
    });
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Calculadora de Divisas" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Switch de Dirección */}
        <View style={[styles.directionRow, !isDarkMode && styles.cardLight]}>
          <TouchableOpacity
            style={[
              styles.directionBtn,
              direccion === 'USD_A_VES' && { backgroundColor: colors.p600 },
            ]}
            onPress={() => setDireccion('USD_A_VES')}
          >
            <Text
              style={[
                styles.directionBtnText,
                direccion === 'USD_A_VES' && styles.textWhite,
              ]}
            >
              USD ➔ VES
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.directionBtn,
              direccion === 'VES_A_USD' && { backgroundColor: colors.p600 },
            ]}
            onPress={() => setDireccion('VES_A_USD')}
          >
            <Text
              style={[
                styles.directionBtnText,
                direccion === 'VES_A_USD' && styles.textWhite,
              ]}
            >
              VES ➔ USD
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Monto */}
        <FadeIn delay={60}>
          <View style={[styles.calcCard, !isDarkMode && styles.cardLight]}>
            <Text style={styles.inputLabel}>
              Monto a convertir ({direccion === 'USD_A_VES' ? 'USD' : 'VES'})
            </Text>
            <View style={[styles.inputWrap, !isDarkMode && styles.inputLight]}>
              <Text style={[styles.currencyPrefix, { color: colors.p500 }]}>
                {direccion === 'USD_A_VES' ? '$' : 'Bs.'}
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.textDark]}
                keyboardType="decimal-pad"
                value={monto}
                onChangeText={setMonto}
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Presets */}
            <View style={styles.presetsRow}>
              {presets.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetChip, !isDarkMode && styles.inputLight]}
                  onPress={() => setMonto(p.toString())}
                >
                  <Text style={[styles.presetChipText, !isDarkMode && styles.textDark]}>
                    +{p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={[
                styles.divider,
                !isDarkMode && { backgroundColor: '#e2e8f0' },
              ]}
            />

            {/* Tarjeta de Resultado Elegante con Gradiente idéntica a la Web */}
            <LinearGradient
              colors={[colors.p600, colors.p700, '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientResultCard}
            >
              <View style={styles.resultCardHeader}>
                <Text style={styles.resultCardSubtitle}>RESULTADO DE LA CONVERSIÓN</Text>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>
                    {customMode ? 'Tasa manual' : fuenteNombre}
                  </Text>
                </View>
              </View>

              <View style={styles.resultAmountRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.resultAmountText} numberOfLines={1} adjustsFontSizeToFit>
                    {direccion === 'USD_A_VES' ? 'Bs. ' : '$'}
                    {formatMoney(resultado)}
                  </Text>
                  <Text style={styles.resultCalcDetail}>
                    {direccion === 'USD_A_VES'
                      ? `$${formatMoney(parseFloat(monto) || 0)} calculados a ${formatMoney(rateActiva)} VES/USD`
                      : `Bs. ${formatMoney(parseFloat(monto) || 0)} divididos entre ${formatMoney(rateActiva)} VES/USD`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.gradientShareBtn}
                  onPress={compartirResultado}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </FadeIn>

        {/* Selector de Tasas Disponibles */}
        <Text style={[styles.sectionHeading, !isDarkMode && styles.textDark]}>
          Tasas del Mercado
        </Text>

        {/* Widget de Brecha en Mobile */}
        {fuentes.length >= 2 && (
          <View style={[styles.brechaCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.brechaHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trending-up" size={18} color={colors.p500} />
                <Text style={[styles.brechaTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>Brecha Cambiaria</Text>
              </View>
              {(() => {
                const bcv = fuentes.find(f => f.fuente.toLowerCase().includes('bcv') || f.fuente.toLowerCase().includes('banco central'))?.tasa || fuentes[0].tasa;
                const p2p = fuentes.find(f => f.fuente.toLowerCase().includes('p2p') || f.fuente.toLowerCase().includes('paralelo'))?.tasa || fuentes[1].tasa;
                const b = calcularBrechaCambiaria(bcv, p2p);
                return (
                  <View style={styles.brechaBadge}>
                    <Text style={styles.brechaBadgeText}>+{b.porcentajeBrecha}%</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={styles.brechaSub}>
              Compara tasa oficial vs P2P en tiempo real para optimizar tus pagos.
            </Text>
          </View>
        )}

        {fuentes.map((f, idx) => {
          const isSelected = !customMode && fuenteNombre === f.fuente;
          return (
            <FadeIn key={f.fuente} delay={120 + idx * 60}>
              <TouchableOpacity
                style={[
                  styles.rateCard,
                  !isDarkMode && styles.cardLight,
                  isSelected && {
                    borderColor: colors.p500,
                    backgroundColor: `${colors.p500}18`,
                  },
                ]}
                onPress={() => {
                  setCustomMode(false);
                  setFuenteNombre(f.fuente);
                  setTasaEfectiva(f.tasa);
                }}
              >
                <View>
                  <Text style={[styles.rateSourceName, !isDarkMode && styles.textDark]}>
                    {f.fuente}
                  </Text>
                  <Text style={styles.rateSourceTag}>Tasa actualizada</Text>
                </View>
                <Text style={[styles.rateSourceVal, { color: colors.p500 }]}>
                  Bs. {formatMoney(f.tasa)}
                </Text>
              </TouchableOpacity>
            </FadeIn>
          );
        })}

        {/* Opción Tasa Personalizada igual a la Web */}
        <TouchableOpacity
          style={[
            styles.rateCard,
            !isDarkMode && styles.cardLight,
            customMode && {
              borderColor: colors.p500,
              backgroundColor: `${colors.p500}18`,
            },
          ]}
          onPress={() => setCustomMode(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rateSourceName, !isDarkMode && styles.textDark]}>
              Tasa personalizada
            </Text>
            {customMode ? (
              <TextInput
                style={[styles.customInput, !isDarkMode && styles.inputLight]}
                placeholder="Ingresa tasa en Bs..."
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={customRate}
                onChangeText={setCustomRate}
              />
            ) : (
              <Text style={styles.rateSourceTag}>Ingresar valor manual</Text>
            )}
          </View>
          <Ionicons name="create-outline" size={20} color={colors.p500} />
        </TouchableOpacity>
      </ScrollView>
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
  directionRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  directionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  calcCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  inputLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    paddingVertical: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 18,
  },
  gradientResultCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultCardSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  sourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultAmountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
  },
  resultCalcDetail: {
    fontSize: 11,
    color: '#e2e8f0',
    marginTop: 4,
    fontWeight: '500',
  },
  gradientShareBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  resultAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  shareBtn: {
    padding: 12,
    borderRadius: 12,
  },
  rateUsedSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  rateCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rateSourceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  rateSourceTag: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  rateSourceVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  brechaCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  brechaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brechaTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  brechaBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  brechaBadgeText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 12,
  },
  brechaSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  customInput: {
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 14,
    maxWidth: 180,
  },
  textWhite: {
    color: '#ffffff',
  },
  textDark: {
    color: '#0f172a',
  },
});
