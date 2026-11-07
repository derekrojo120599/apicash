import React, { useEffect, useState, useMemo } from 'react';
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
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';

interface CategoriasScreenProps {
  onOpenMenu: () => void;
}

interface Categoria {
  id: string;
  nombre: string;
  tipo: 'gasto' | 'ingreso' | 'ahorro' | 'deuda';
}

export function CategoriasScreen({ onOpenMenu }: CategoriasScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'gasto' | 'ingreso'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function fetchCategorias() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre');

      if (!error && data) {
        setCategorias(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchCategorias();
  }, []);

  const counts = useMemo(() => {
    const total = categorias.length;
    const gastos = categorias.filter((c) => c.tipo === 'gasto').length;
    const ingresos = categorias.filter((c) => c.tipo === 'ingreso').length;
    return { total, gastos, ingresos };
  }, [categorias]);

  const filtered = useMemo(() => {
    return categorias.filter((c) => {
      const matchesTab = activeTab === 'todos' || c.tipo === activeTab;
      const matchesSearch = c.nombre.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [categorias, activeTab, searchQuery]);

  function openCreate() {
    setEditingCat(null);
    setNombre('');
    setTipo(activeTab === 'ingreso' ? 'ingreso' : 'gasto');
    setErrorMsg('');
    setModalVisible(true);
  }

  function openEdit(c: Categoria) {
    setEditingCat(c);
    setNombre(c.nombre);
    setTipo(c.tipo === 'ingreso' ? 'ingreso' : 'gasto');
    setErrorMsg('');
    setModalVisible(true);
  }

  async function handleSaveCategoria() {
    if (!nombre.trim()) {
      setErrorMsg('El nombre es requerido');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      if (editingCat) {
        const { error } = await supabase
          .from('categorias')
          .update({ nombre: nombre.trim() })
          .eq('id', editingCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categorias').insert([
          {
            user_id: user.id,
            nombre: nombre.trim(),
            tipo,
          },
        ]);
        if (error) throw error;
      }

      setNombre('');
      setEditingCat(null);
      setModalVisible(false);
      fetchCategorias();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la categoría');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, catNombre: string) {
    Alert.alert(
      '¿Eliminar categoría?',
      `Se eliminará "${catNombre}". Solo es posible si no posee transacciones asociadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('categorias').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', 'No se puede eliminar porque tiene transacciones vinculadas.');
            } else {
              fetchCategorias();
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Categorías" onOpenMenu={onOpenMenu} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCategorias();
            }}
            tintColor={colors.p500}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>Clasificaciones ({filtered.length})</Text>
          <TouchableOpacity
            style={[styles.newCatBtn, { backgroundColor: colors.p600 }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.newCatText}>Nueva categoría</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador igual a la Web */}
        <View style={[styles.searchBox, !isDarkMode && styles.cardLight]}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            style={[styles.searchInput, !isDarkMode && styles.textDark]}
            placeholder="Buscar categoría..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tabs con contadores: Todas, Gastos, Ingresos */}
        <View style={[styles.tabsRow, !isDarkMode && styles.cardLight]}>
          {([
            { id: 'todos', label: `Todas (${counts.total})` },
            { id: 'gasto', label: `Gastos (${counts.gastos})` },
            { id: 'ingreso', label: `Ingresos (${counts.ingresos})` },
          ] as const).map((t) => {
            const active = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tabBtn,
                  active && { backgroundColor: `${colors.p500}22` },
                ]}
                onPress={() => setActiveTab(t.id)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    active && { color: colors.p500, fontWeight: '700' },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, !isDarkMode && styles.cardLight]}>
            <Ionicons name="folder-open-outline" size={48} color="#475569" />
            <Text style={[styles.emptyTitle, !isDarkMode && styles.textDark]}>
              Sin categorías
            </Text>
            <Text style={styles.emptyDesc}>No hay categorías para este filtro.</Text>
          </View>
        ) : (
          filtered.map((cat, idx) => (
            <FadeIn key={cat.id} delay={Math.min(idx * 50, 350)}>
              <View style={[styles.catCard, !isDarkMode && styles.cardLight]}>
                <View
                  style={[
                    styles.verticalPill,
                    {
                      backgroundColor:
                        cat.tipo === 'ingreso' ? colors.p500 : '#ef4444',
                    },
                  ]}
                />
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, !isDarkMode && styles.textDark]}>
                    {cat.nombre}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          cat.tipo === 'ingreso'
                            ? isDarkMode ? `${colors.p500}22` : colors.p100
                            : isDarkMode ? '#ef444422' : '#fee2e2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color:
                            cat.tipo === 'ingreso'
                              ? isDarkMode ? colors.p400 : colors.p600
                              : isDarkMode ? '#f87171' : '#dc2626',
                        },
                      ]}
                    >
                      {cat.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => openEdit(cat)} style={styles.actionIconBtn}>
                  <Ionicons name="pencil-outline" size={18} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(cat.id, cat.nombre)}
                  style={styles.actionIconBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>

      {/* Modal Crear / Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, !isDarkMode && styles.cardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeading, !isDarkMode && styles.textDark]}>
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>
                Nombre de la categoría
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.inputLight]}
                placeholder="Ej. Restaurantes, Farmacia..."
                placeholderTextColor="#64748b"
                value={nombre}
                onChangeText={setNombre}
              />

              {!editingCat ? (
                <>
                  <Text style={[styles.inputLabel, !isDarkMode && styles.textDark]}>Tipo</Text>
                  <View style={styles.chipRow}>
                    {(['gasto', 'ingreso'] as const).map((tp) => {
                      const active = tipo === tp;
                      return (
                        <TouchableOpacity
                          key={tp}
                          style={[
                            styles.chip,
                            !isDarkMode && styles.inputLight,
                            active && {
                              borderColor: colors.p500,
                              backgroundColor: `${colors.p500}22`,
                            },
                          ]}
                          onPress={() => setTipo(tp)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              !isDarkMode && styles.textDark,
                              active && { color: colors.p500, fontWeight: '700' },
                            ]}
                          >
                            {tp.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

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
                onPress={handleSaveCategoria}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Categoría</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  newCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newCatText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
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
  catCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  verticalPill: {
    width: 5,
    height: 34,
    borderRadius: 3,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bgRed: {
    backgroundColor: '#450a0a',
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  catType: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  actionIconBtn: {
    padding: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
