import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney, type Moneda } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';
import { ArdillaMascot } from '../components/ArdillaMascot';

export function PrestamosScreen({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'otorgados' | 'recibidos'>('otorgados');
  const [loading, setLoading] = useState(true);
  const [prestamos, setPrestamos] = useState<any[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [persona, setPersona] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [submitting, setSubmitting] = useState(false);

  async function fetchPrestamos() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('deudas')
        .select('*')
        .eq('user_id', user.id);

      if (error && error.code !== '42P01') {
        console.warn('Error al cargar préstamos:', error);
      }
      setPrestamos(data || []);
    } catch (e) {
      console.warn('Error fetchPrestamos:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrestamos();
  }, []);

  async function handleCrearPrestamo() {
    if (!persona || !monto || Number(monto) <= 0) {
      Alert.alert('Faltan datos', 'Indica el nombre de la persona y el monto.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase.from('deudas').insert({
        user_id: user.id,
        nombre: `${persona} - ${concepto || 'Préstamo'}`,
        monto_total: Number(monto),
        moneda: moneda,
        saldo_pendiente: Number(monto)
      });

      if (error) throw error;

      Alert.alert('Préstamo registrado', 'Se ha guardado en tu control de préstamos.');
      setModalOpen(false);
      setPersona('');
      setConcepto('');
      setMonto('');
      fetchPrestamos();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPendiente = prestamos.reduce((acc, p) => acc + (p.saldo_pendiente || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Préstamos" onOpenMenu={onOpenMenu} />

      {/* Tabs Otorgados vs Recibidos */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabWrapper, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'otorgados' && { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}
            onPress={() => setActiveTab('otorgados')}
          >
            <Ionicons name="arrow-up-circle-outline" size={16} color={activeTab === 'otorgados' ? colors.p500 : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'otorgados' ? (isDarkMode ? '#ffffff' : '#0f172a') : '#64748b' }]}>
              Me deben (Otorgados)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'recibidos' && { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}
            onPress={() => setActiveTab('recibidos')}
          >
            <Ionicons name="arrow-down-circle-outline" size={16} color={activeTab === 'recibidos' ? colors.p500 : '#94a3b8'} />
            <Text style={[styles.tabText, { color: activeTab === 'recibidos' ? (isDarkMode ? '#ffffff' : '#0f172a') : '#64748b' }]}>
              Debo (Recibidos)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FadeIn>
          {/* Card Resumen */}
          <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={styles.summaryLabel}>TOTAL PENDIENTE</Text>
            <Text style={[styles.summaryAmount, { color: activeTab === 'otorgados' ? '#10b981' : '#ef4444' }]}>
              ${formatMoney(totalPendiente)}
            </Text>
            <Text style={styles.summarySub}>
              {activeTab === 'otorgados' ? 'Dinero que tienes por cobrar' : 'Deudas personales pendientes de pago'}
            </Text>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.p500 }]}
              onPress={() => setModalOpen(true)}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>
                {activeTab === 'otorgados' ? 'Prestar dinero' : 'Pedir prestado'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            Historial de Préstamos
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
          ) : prestamos.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
              <ArdillaMascot mood="zen" size={68} />
              <Text style={styles.emptyTitle}>Al día sin préstamos</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'otorgados' ? 'No tienes préstamos pendientes por cobrar.' : 'No tienes deudas con personas.'}
              </Text>
            </View>
          ) : (
            prestamos.map((p) => (
              <View
                key={p.id}
                style={[styles.itemCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>{p.nombre}</Text>
                    <Text style={styles.itemSub}>Pendiente: ${formatMoney(p.saldo_pendiente)}</Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                    ${formatMoney(p.monto_total)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </FadeIn>
      </ScrollView>

      {/* MODAL NUEVO PRÉSTAMO */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                {activeTab === 'otorgados' ? 'Nuevo préstamo otorgado' : 'Nuevo préstamo recibido'}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nombre de la persona</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="Ej: Carlos Pérez..."
                placeholderTextColor="#94a3b8"
                value={persona}
                onChangeText={setPersona}
              />

              <Text style={styles.inputLabel}>Monto prestado ($)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="50.00"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                value={monto}
                onChangeText={setMonto}
              />

              <Text style={styles.inputLabel}>Motivo o descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="Ej: Para el alquiler, cena..."
                placeholderTextColor="#94a3b8"
                value={concepto}
                onChangeText={setConcepto}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                disabled={submitting}
                onPress={handleCrearPrestamo}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Guardar Préstamo</Text>
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
  container: { flex: 1 },
  tabContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  tabWrapper: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  summaryAmount: { fontSize: 32, fontWeight: '900', marginVertical: 4 },
  summarySub: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  emptyCard: { padding: 30, borderRadius: 20, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
  emptyText: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  itemCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemTotal: { fontSize: 17, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 28, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  formContainer: { gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  modalSubmitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  modalSubmitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 }
});
