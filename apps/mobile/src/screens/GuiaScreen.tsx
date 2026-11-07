import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';
import { LinearGradient } from 'expo-linear-gradient';

interface GuiaScreenProps {
  onOpenMenu: () => void;
  onNavigateTab: (tab: any) => void;
}

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgIcon: string;
  steps: string[];
  tabTarget: string;
  extra: string;
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Panel Principal (Dashboard)',
    subtitle: 'Centro de control financiero',
    icon: 'grid-outline',
    color: '#10b981',
    bgIcon: '#10b98122',
    steps: [
      'Vista panorámica que consolida el Balance Neto en dólares y bolívares.',
      'Permite registrar transacciones instantáneamente con el botón «Nuevo movimiento».',
      'Muestra de un vistazo ingresos, gastos, ahorros acumulados y deudas vigentes.',
      'Lista los últimos movimientos con conversión de moneda calculada al momento.',
    ],
    tabTarget: 'dashboard',
    extra: 'Es el termómetro de tu salud financiera: permite conocer de inmediato el estado global del patrimonio.',
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    subtitle: 'Billeteras, bancos y plataformas',
    icon: 'wallet-outline',
    color: '#3b82f6',
    bgIcon: '#3b82f622',
    steps: [
      'Paso inicial obligatorio: crea tus cuentas antes de registrar transacciones.',
      'Soporta cuentas en USD (dólares) y en VES (bolívares).',
      'Ejemplos: Efectivo, Banco Mercantil/Banesco, Pago Móvil, Zelle o Binance.',
      'Cada movimiento actualiza en tiempo real el saldo de la cuenta asociada.',
    ],
    tabTarget: 'cuentas',
    extra: 'Si manejas fondos en múltiples entidades o billeteras, crea una cuenta independiente para cada una.',
  },
  {
    id: 'calculadora',
    title: 'Calculadora de Divisas',
    subtitle: 'Conversión rápida y consulta de mercado',
    icon: 'calculator-outline',
    color: '#10b981',
    bgIcon: '#10b98122',
    steps: [
      'Herramienta de consulta rápida para calcular conversiones bidireccionales (USD ↔ VES).',
      'Permite elegir entre tasas oficiales registradas o ingresar una tasa manual.',
      'Incluye botones de montos frecuentes (+5, +10, +20, +50...).',
      'Es exclusivamente consultiva: no altera tus balances ni registra movimientos contables.',
    ],
    tabTarget: 'calculadora',
    extra: 'Úsala para verificar presupuestos en la calle o cotizar compras antes de pagar en bolívares o dólares.',
  },
  {
    id: 'transacciones',
    title: 'Movimientos (Transacciones)',
    subtitle: 'Registro continuo de ingresos, gastos y traspasos',
    icon: 'swap-horizontal-outline',
    color: '#f59e0b',
    bgIcon: '#f59e0b22',
    steps: [
      'Registra cada movimiento al momento de producirse para evitar desfases de saldo.',
      'Soporta Gastos, Ingresos y Traspasos entre cuentas de la misma divisa.',
      'Para pagos en bancos venezolanos calcula automáticamente comisiones bancarias (Pago Móvil, punto de venta, IGTF).',
      'Si el movimiento es en bolívares, guarda el equivalente en dólares con la tasa oficial del día.',
    ],
    tabTarget: 'movimientos',
    extra: 'Registrar consumos al instante previene el olvido de microgastos cotidianos que merman tu balance.',
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto Mensual',
    subtitle: 'Límites inteligentes de gasto',
    icon: 'flag-outline',
    color: '#f43f5e',
    bgIcon: '#f43f5e22',
    steps: [
      'Define un tope mensual de gasto para cada una de tus categorías en USD.',
      'El sistema ilustra el progreso con barras visuales y alertas preventivas.',
      'Posibilidad de replicar la configuración del mes previo con un solo clic.',
      'Previene el agotamiento de fondos antes del cierre de mes.',
    ],
    tabTarget: 'presupuesto',
    extra: 'Un presupuesto es una decisión consciente sobre el destino óptimo de tus recursos.',
  },
  {
    id: 'categorias',
    title: 'Categorías',
    subtitle: 'Clasificación inteligente de operaciones',
    icon: 'folder-open-outline',
    color: '#06b6d4',
    bgIcon: '#06b6d422',
    steps: [
      'Organiza tus ingresos y gastos en categorías claras (Comida, Transporte, Salario...).',
      'Filtra por tipo y utiliza el buscador rápido para localizar cualquier clasificación.',
      'Edita nombres en cualquier momento sin perder el historial asociado.',
    ],
    tabTarget: 'categorias',
    extra: 'Mantener categorías ordenadas permite que los gráficos de Perfil y Presupuesto sean precisos.',
  },
  {
    id: 'ahorros',
    title: 'Ahorros y Metas',
    subtitle: 'Fondos separados con propósito definido',
    icon: 'cube-outline',
    color: '#8b5cf6',
    bgIcon: '#8b5cf622',
    steps: [
      'Crea metas de ahorro con objetivo fijo o alcancías libres.',
      'Aparta dinero desde tus cuentas activas o registra aportes externos.',
      'Si necesitas disponer del dinero ahorrado, puedes «Retirar» hacia tu cuenta bancaria.',
      'Monitorea el porcentaje completado hasta alcanzar tu objetivo financiero.',
    ],
    tabTarget: 'ahorros',
    extra: 'Separar el dinero en metas evita que lo gastes en gastos corrientes del día a día.',
  },
  {
    id: 'deudas',
    title: 'Control de Deudas',
    subtitle: 'Seguimiento de compromisos pendientes',
    icon: 'receipt-outline',
    color: '#ea580c',
    bgIcon: '#ea580c22',
    steps: [
      'Registra préstamos, tarjetas o pagos pendientes en USD o bolívares.',
      'Realiza abonos parciales o totales descontando de tus cuentas bancarias.',
      'Revisa el saldo restante en tiempo real hasta saldar la deuda por completo.',
    ],
    tabTarget: 'deudas',
    extra: 'Tener visibles las deudas pendientes permite planificar pagos sin sorpresas a fin de mes.',
  },
];

export function GuiaScreen({ onOpenMenu, onNavigateTab }: GuiaScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Guía de Uso" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.heading, !isDarkMode && styles.textDark]}>
            Aprende a usar El Sencillo
          </Text>
          <Text style={styles.subheading}>
            Domina cada herramienta para mantener tus finanzas personales bajo control en USD y VES.
          </Text>
        </View>

        {/* Banner de Inicio Rápido con Gradiente idéntico a la Web */}
        <FadeIn delay={50}>
          <LinearGradient
            colors={[colors.p600, colors.p700, '#0f766e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickStartCard}
          >
            <View style={styles.quickStartHeader}>
              <View style={styles.quickStartIconWrap}>
                <Ionicons name="flash-outline" size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickStartTitle}>¿Cómo comenzar en 3 pasos?</Text>
                <Text style={styles.quickStartSub}>Configuración inicial en menos de 2 minutos.</Text>
              </View>
            </View>

            <View style={styles.quickStepsRow}>
              <View style={styles.quickStepItem}>
                <Text style={styles.quickStepNum}>1.</Text>
                <Text style={styles.quickStepTitle}>Crea tus cuentas</Text>
                <Text style={styles.quickStepDesc}>Bancos, efectivo o billeteras en USD y VES.</Text>
              </View>
              <View style={styles.quickStepItem}>
                <Text style={styles.quickStepNum}>2.</Text>
                <Text style={styles.quickStepTitle}>Registra movimientos</Text>
                <Text style={styles.quickStepDesc}>Ingresos, gastos o transferencias entre cuentas.</Text>
              </View>
              <View style={styles.quickStepItem}>
                <Text style={styles.quickStepNum}>3.</Text>
                <Text style={styles.quickStepTitle}>Monitorea y ahorra</Text>
                <Text style={styles.quickStepDesc}>Presupuestos por categoría y metas de ahorro.</Text>
              </View>
            </View>
          </LinearGradient>
        </FadeIn>

        {guideSections.map((sec, idx) => (
          <FadeIn key={sec.id} delay={idx * 70}>
            <View style={[styles.guideCard, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: sec.bgIcon }]}>
                  <Ionicons name={sec.icon} size={22} color={sec.color} />
                </View>
                <View style={styles.titleBox}>
                  <Text style={[styles.sectionTitle, !isDarkMode && styles.textDark]}>
                    {sec.title}
                  </Text>
                  <Text style={styles.sectionSubtitle}>{sec.subtitle}</Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                {sec.steps.map((st, sIdx) => (
                  <View key={sIdx} style={styles.stepRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.p500}
                      style={styles.stepIcon}
                    />
                    <Text style={[styles.stepText, !isDarkMode && styles.textDark]}>
                      {st}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.extraBox, !isDarkMode && styles.inputLight]}>
                <Text style={[styles.extraText, !isDarkMode && { color: '#475569' }]}>
                  💡 {sec.extra}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: `${colors.p500}22` }]}
                onPress={() => onNavigateTab(sec.tabTarget)}
              >
                <Text style={[styles.navButtonText, { color: colors.p500 }]}>
                  Ir a {sec.title.split(' ')[0]}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.p500} />
              </TouchableOpacity>
            </View>
          </FadeIn>
        ))}
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
  header: {
    marginBottom: 16,
  },
  quickStartCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  quickStartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  quickStartIconWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
  },
  quickStartTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  quickStartSub: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
  },
  quickStepsRow: {
    gap: 10,
  },
  quickStepItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickStepNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    opacity: 0.9,
  },
  quickStepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  quickStepDesc: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
    lineHeight: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subheading: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  guideCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleBox: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  stepsList: {
    gap: 8,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  stepText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 18,
  },
  extraBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
  },
  extraText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textDark: {
    color: '#0f172a',
  },
});
