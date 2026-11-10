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
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney, type Moneda } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';
import { ArdillaMascot } from '../components/ArdillaMascot';

export function CompartidasScreen({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<any | null>(null);

  // Modals
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modalUnirseOpen, setModalUnirseOpen] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [descripcionGrupo, setDescripcionGrupo] = useState('');
  const [monedaGrupo, setMonedaGrupo] = useState<Moneda>('USD');
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchGrupos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grupos_compartidos')
        .select('*, miembros_grupo(*)')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.warn('Error al cargar grupos:', error);
      }
      setGrupos(data || []);
    } catch (e) {
      console.warn('Error fetchGrupos:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGrupos();
  }, []);

  async function handleCrearGrupo() {
    if (!nombreGrupo) {
      Alert.alert('Error', 'Ingresa el nombre del grupo.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('crear_grupo_compartido', {
        p_nombre: nombreGrupo,
        p_descripcion: descripcionGrupo || null,
        p_moneda: monedaGrupo,
        p_color: '#10b981'
      });

      if (error) throw error;

      Alert.alert('¡Grupo Creado!', `Código de invitación: ${data.codigo_invitacion}`);
      setModalCrearOpen(false);
      setNombreGrupo('');
      setDescripcionGrupo('');
      fetchGrupos();
    } catch (err: any) {
      Alert.alert('Error al crear grupo', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnirseGrupo() {
    if (!codigoUnirse) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('unirse_grupo_por_codigo', {
        p_codigo: codigoUnirse
      });

      if (error) throw error;

      Alert.alert('¡Éxito!', `Te uniste al grupo ${data.nombre_grupo || ''}`);
      setModalUnirseOpen(false);
      setCodigoUnirse('');
      fetchGrupos();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompartirCodigo(codigo: string) {
    try {
      await Share.share({
        message: `¡Únete a mi grupo en Apicash para dividir gastos! Código: ${codigo}`
      });
    } catch {
      // Ignorar
    }
  }

  async function handleResponderPago(pagoId: string, accion: 'confirmar' | 'rechazar') {
    try {
      const { error } = await supabase.rpc('responder_pago_grupal', {
        p_pago_id: pagoId,
        p_accion: accion
      });
      if (error) throw error;
      Alert.alert('Listo', accion === 'confirmar' ? 'Pago confirmado.' : 'Pago rechazado.');
      fetchGrupos();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Cuentas Compartidas" onOpenMenu={onOpenMenu} />

      {/* Acciones Rápidas */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
          onPress={() => setModalUnirseOpen(true)}
        >
          <Ionicons name="enter-outline" size={16} color={colors.p500} />
          <Text style={[styles.btnOutlineText, { color: isDarkMode ? '#fff' : '#0f172a' }]}>
            Unirse por código
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: colors.p500 }]}
          onPress={() => setModalCrearOpen(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.btnSolidText}>Nuevo grupo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FadeIn>
          {/* Tarjetas Resumen Te Deben / Debes */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.summaryBoxLabel}>TE DEBEN</Text>
              <Text style={[styles.summaryBoxAmount, { color: '#10b981' }]}>$0.00</Text>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.summaryBoxLabel}>DEBES</Text>
              <Text style={[styles.summaryBoxAmount, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>$0.00</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            Mis Grupos
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.p500} style={{ marginVertical: 20 }} />
          ) : grupos.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
              <ArdillaMascot mood="searching" size={68} />
              <Text style={styles.emptyTitle}>Sin grupos todavía</Text>
              <Text style={styles.emptyText}>
                Crea un grupo para dividir gastos o únete a uno mediante su código de invitación.
              </Text>
            </View>
          ) : (
            grupos.map((g) => (
              <View
                key={g.id}
                style={[styles.grupoCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
              >
                <View style={styles.grupoHeader}>
                  <View style={[styles.avatarGrupo, { backgroundColor: g.color || colors.p500 }]}>
                    <Text style={styles.avatarText}>{g.nombre.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.grupoNombre, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                      {g.nombre}
                    </Text>
                    <Text style={styles.grupoSub}>
                      {g.miembros_grupo?.length || 1} miembros • Código: <Text style={{ fontWeight: 'bold' }}>{g.codigo_invitacion}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleCompartirCodigo(g.codigo_invitacion)}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.p500} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </FadeIn>
      </ScrollView>

      {/* MODAL CREAR GRUPO */}
      <Modal visible={modalCrearOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                Crear grupo compartido
              </Text>
              <TouchableOpacity onPress={() => setModalCrearOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nombre del grupo</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="Ej: Apartamento, Viaje..."
                placeholderTextColor="#94a3b8"
                value={nombreGrupo}
                onChangeText={setNombreGrupo}
              />

              <Text style={styles.inputLabel}>Descripción (Opcional)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1' }]}
                placeholder="Detalles del reparto"
                placeholderTextColor="#94a3b8"
                value={descripcionGrupo}
                onChangeText={setDescripcionGrupo}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                disabled={submitting}
                onPress={handleCrearGrupo}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Crear Grupo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL UNIRSE POR CÓDIGO */}
      <Modal visible={modalUnirseOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                Unirse con código
              </Text>
              <TouchableOpacity onPress={() => setModalUnirseOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Código de invitación</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: '#cbd5e1', textAlign: 'center', letterSpacing: 2, fontWeight: 'bold' }]}
                placeholder="APICAS-XXXXXX"
                autoCapitalize="characters"
                placeholderTextColor="#94a3b8"
                value={codigoUnirse}
                onChangeText={setCodigoUnirse}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.p500 }]}
                disabled={submitting}
                onPress={handleUnirseGrupo}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Unirse al Grupo</Text>
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
  headerActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  btnOutlineText: { fontSize: 13, fontWeight: '700' },
  btnSolid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
  btnSolidText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryBox: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1 },
  summaryBoxLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  summaryBoxAmount: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  emptyCard: { padding: 30, borderRadius: 20, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
  emptyText: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  grupoCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  grupoHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarGrupo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  grupoNombre: { fontSize: 16, fontWeight: '800' },
  grupoSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  shareBtn: { padding: 8 },
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
