import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney } from '@apicash/shared';
import { useAppTheme, THEME_LIST, ThemeId } from '../context/ThemeContext';
import { AnimatedSelect } from '../components/AnimatedSelect';
import { FadeIn, AnimatedProgressBar } from '../components/Animations';
import { ApicashLogo } from '../components/ApicashLogo';
import { TopBar } from '../components/TopBar';
import { triggerSuccessNotification, scheduleDailyReminders } from '../lib/notifications';

interface PerfilScreenProps {
  onOpenMenu: () => void;
  onLogout: () => void;
}

interface PerfilData {
  id: string;
  nombre_completo: string | null;
  email?: string;
  fuente_tasa_preferida: string | null;
  tema: string | null;
  estilo_avatar: string | null;
  avatar_seed: string | null;
  created_at?: string;
}

interface TasaFuente {
  fuente: string;
  tasa: number;
}

interface GastoCategoria {
  nombre: string;
  monto: number;
}

interface IngresoGastoMes {
  mes: string;
  ingresos: number;
  gastos: number;
}

interface ProgresoMeta {
  nombre: string;
  actual: number;
  objetivo: number;
  porcentaje: number;
}

interface StatsFull {
  totalTransacciones: number;
  totalCuentas: number;
  totalMetas: number;
  totalDeudas: number;
  gastosPorCategoria: GastoCategoria[];
  ingresosGastosMensual: IngresoGastoMes[];
  progresoMetas: ProgresoMeta[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const AVATARES_PREDEFINIDOS = [
  'bot-1', 'fox-alpha', 'ninja-99', 'happy-cloud',
  'cool-dog', 'space-cat', 'gamer-x', 'wizard-oz',
  'neon-cyber', 'pixel-hero', 'coffee-mug', 'chill-panda',
  'red-dragon', 'blue-ocean', 'star-ship', 'golden-bear',
];

const ESTILOS_AVATAR = [
  { value: 'bottts', label: 'Robots' },
  { value: 'lorelei', label: 'Ilustración' },
  { value: 'avataaars', label: 'Personas' },
  { value: 'micah', label: 'Minimalista' },
];

const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function getMesNombre(mesStr: string) {
  const num = parseInt(mesStr, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return MESES_ABR[num - 1];
  }
  return mesStr;
}

export function PerfilScreen({ onOpenMenu, onLogout }: PerfilScreenProps) {
  const { colors, themeId, setThemeId, isDarkMode } = useAppTheme();

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [fuentes, setFuentes] = useState<TasaFuente[]>([]);
  const [stats, setStats] = useState<StatsFull>({
    totalTransacciones: 0,
    totalCuentas: 0,
    totalMetas: 0,
    totalDeudas: 0,
    gastosPorCategoria: [],
    ingresosGastosMensual: [],
    progresoMetas: [],
  });

  const [nombre, setNombre] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [fuentePreferida, setFuentePreferida] = useState('');
  const [estiloAvatar, setEstiloAvatar] = useState('bottts');
  const [avatarSeed, setAvatarSeed] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

  // Modales igual que en la web
  const [modalAvatar, setModalAvatar] = useState(false);
  const [modalBorrarDatos, setModalBorrarDatos] = useState(false);
  const [confirmacionBorrar, setConfirmacionBorrar] = useState('');
  const [modalEliminarCuenta, setModalEliminarCuenta] = useState(false);
  const [confirmacionEliminar, setConfirmacionEliminar] = useState('');
  const [modalLegal, setModalLegal] = useState<'privacidad' | 'terminos' | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  async function fetchPerfilCompleto() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const inicioAnio = new Date();
      inicioAnio.setFullYear(inicioAnio.getFullYear() - 1);

      const [
        perfilRes,
        fuentesRes,
        txCountRes,
        cuentasCountRes,
        metasCountRes,
        deudasCountRes,
        txDataRes,
        metasDataRes,
      ] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', user.id).single(),
        supabase.from('tasas_cambio').select('fuente, fecha, tasa').order('fecha', { ascending: false }),
        supabase.from('transacciones').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('cuentas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('metas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('deudas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('transacciones')
          .select('tipo, monto_usd_calculado, fecha, categorias(nombre)')
          .eq('user_id', user.id)
          .eq('anulada', false)
          .gte('fecha', inicioAnio.toISOString()),
        supabase
          .from('metas')
          .select('nombre, monto_actual, monto_objetivo')
          .eq('user_id', user.id)
          .gt('monto_objetivo', 0),
      ]);

      if (perfilRes.data) {
        setPerfil({ ...perfilRes.data, email: user.email });
        setNombre(perfilRes.data.nombre_completo || '');
        setFuentePreferida(perfilRes.data.fuente_tasa_preferida || '');
        if (perfilRes.data.tema) {
          setThemeId(perfilRes.data.tema as ThemeId);
        }
        setEstiloAvatar(perfilRes.data.estilo_avatar || 'bottts');
        setAvatarSeed(perfilRes.data.avatar_seed || user.email || 'default');
      }

      if (fuentesRes.data) {
        const ultimasPorFuente = new Map<string, TasaFuente>();
        fuentesRes.data.forEach((row: any) => {
          if (!ultimasPorFuente.has(row.fuente)) {
            ultimasPorFuente.set(row.fuente, {
              fuente: row.fuente,
              tasa: Number(row.tasa),
            });
          }
        });
        setFuentes(Array.from(ultimasPorFuente.values()));
      }

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const catMap = new Map<string, number>();
      const mesMap = new Map<string, { ingresos: number; gastos: number }>();

      (txDataRes.data || []).forEach((t: any) => {
        const f = new Date(t.fecha);
        const mesKey = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;

        if (!mesMap.has(mesKey)) {
          mesMap.set(mesKey, { ingresos: 0, gastos: 0 });
        }
        const mObj = mesMap.get(mesKey)!;

        if (t.tipo === 'ingreso') {
          mObj.ingresos += Number(t.monto_usd_calculado || 0);
        } else if (t.tipo === 'gasto') {
          mObj.gastos += Number(t.monto_usd_calculado || 0);

          if (f >= inicioMes) {
            const catNombre = t.categorias?.nombre || 'Sin categoría';
            catMap.set(catNombre, (catMap.get(catNombre) || 0) + Number(t.monto_usd_calculado || 0));
          }
        }
      });

      const catList: GastoCategoria[] = Array.from(catMap.entries())
        .map(([nombre, monto]) => ({ nombre, monto }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5);

      const mesList: IngresoGastoMes[] = Array.from(mesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mes, vals]) => ({
          mes: mes.split('-')[1],
          ingresos: vals.ingresos,
          gastos: vals.gastos,
        }));

      const progresoMetas: ProgresoMeta[] = (metasDataRes.data || []).map((m: any) => ({
        nombre: m.nombre,
        actual: Number(m.monto_actual || 0),
        objetivo: Number(m.monto_objetivo || 1),
        porcentaje: Math.min(100, Math.round((Number(m.monto_actual || 0) / Number(m.monto_objetivo || 1)) * 100)),
      }));

      setStats({
        totalTransacciones: txCountRes.count || 0,
        totalCuentas: cuentasCountRes.count || 0,
        totalMetas: metasCountRes.count || 0,
        totalDeudas: deudasCountRes.count || 0,
        gastosPorCategoria: catList,
        ingresosGastosMensual: mesList,
        progresoMetas,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPerfilCompleto();
  }, []);

  const showToast = (msg: string) => {
    setMsgSuccess(msg);
    setTimeout(() => setMsgSuccess(''), 3000);
  };

  async function syncProfileToDB(overrides: Partial<{
    nombre_completo: string | null;
    fuente_tasa_preferida: string | null;
    tema: string | null;
    avatar_seed: string | null;
    estilo_avatar: string | null;
  }>) {
    const { error } = await supabase.rpc('actualizar_perfil', {
      p_nombre_completo: overrides.nombre_completo !== undefined ? overrides.nombre_completo : (nombre.trim() || null),
      p_fuente_tasa_preferida: overrides.fuente_tasa_preferida !== undefined ? overrides.fuente_tasa_preferida : (fuentePreferida || null),
      p_tema: overrides.tema !== undefined ? overrides.tema : themeId,
      p_avatar_seed: overrides.avatar_seed !== undefined ? overrides.avatar_seed : avatarSeed,
      p_estilo_avatar: overrides.estilo_avatar !== undefined ? overrides.estilo_avatar : estiloAvatar,
    });
    if (error) throw error;
  }

  async function handleGuardarNombre() {
    setSaving(true);
    try {
      await syncProfileToDB({ nombre_completo: nombre.trim() || null });
      setModoEdicion(false);
      showToast('Nombre actualizado correctamente');
      fetchPerfilCompleto();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el nombre');
    } finally {
      setSaving(false);
    }
  }

  async function regenerarAvatar() {
    const nuevoSeed = Math.random().toString(36).substring(2, 12);
    setAvatarSeed(nuevoSeed);
    try {
      await syncProfileToDB({ avatar_seed: nuevoSeed });
      showToast('Avatar aleatorio generado');
    } catch (e) {
      console.error(e);
    }
  }

  async function seleccionarAvatarPredefinido(seed: string) {
    setAvatarSeed(seed);
    setModalAvatar(false);
    try {
      await syncProfileToDB({ avatar_seed: seed });
      showToast('Avatar actualizado');
    } catch (e) {
      console.error(e);
    }
  }

  async function cambiarEstiloAvatar(nuevoEstilo: string) {
    setEstiloAvatar(nuevoEstilo);
    try {
      await syncProfileToDB({ estilo_avatar: nuevoEstilo });
      showToast('Estilo de avatar actualizado');
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCambiarTema(nuevoTema: ThemeId) {
    // 1. Cambiar inmediatamente en toda la app móvil a través del ThemeContext
    await setThemeId(nuevoTema);
    showToast(`Tema cambiado a ${THEME_LIST.find(t => t.id === nuevoTema)?.nombre}`);
    // 2. Guardar en Supabase
    try {
      await syncProfileToDB({ tema: nuevoTema });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCambiarFuente(nuevaFuente: string) {
    setFuentePreferida(nuevaFuente);
    try {
      await syncProfileToDB({ fuente_tasa_preferida: nuevaFuente });
      showToast('Fuente de tasa actualizada');
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSolicitarPassword() {
    if (!perfil?.email) return;
    Alert.alert(
      'Cambiar contraseña',
      `¿Enviar correo con instrucciones de restablecimiento a ${perfil.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar correo',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(perfil.email!);
              if (error) throw error;
              showToast('Se envió un correo para el cambio de contraseña');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo enviar el correo');
            }
          },
        },
      ]
    );
  }

  async function exportarDatosJSON() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [p, c, cat, tx, m, d, pres] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', user.id).single(),
        supabase.from('cuentas').select('*').eq('user_id', user.id),
        supabase.from('categorias').select('*').eq('user_id', user.id),
        supabase.from('transacciones').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('metas').select('*').eq('user_id', user.id),
        supabase.from('deudas').select('*').eq('user_id', user.id),
        supabase.from('presupuestos').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exportado_el: new Date().toISOString(),
        perfil: p.data,
        cuentas: c.data,
        categorias: cat.data,
        transacciones: tx.data,
        metas: m.data,
        deudas: d.data,
        presupuestos: pres.data,
      };

      await Share.share({
        title: `apicasch-backup-${new Date().toISOString().split('T')[0]}.json`,
        message: JSON.stringify(exportData, null, 2),
      });
    } catch (err: any) {
      Alert.alert('Error al exportar', err.message || 'No se pudieron exportar los datos');
    }
  }

  async function confirmarBorrarDatos() {
    if (confirmacionBorrar.trim().toUpperCase() !== 'BORRAR') {
      Alert.alert('Confirmación requerida', 'Escribe BORRAR exactamente para confirmar.');
      return;
    }
    try {
      const { error } = await supabase.rpc('borrar_datos_usuario');
      if (error) throw error;
      setModalBorrarDatos(false);
      setConfirmacionBorrar('');
      showToast('Todos los datos fueron eliminados correctamente');
      fetchPerfilCompleto();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudieron borrar los datos');
    }
  }

  async function confirmarEliminarCuenta() {
    if (confirmacionEliminar.trim().toUpperCase() !== 'ELIMINAR') {
      Alert.alert('Confirmación requerida', 'Escribe ELIMINAR exactamente para confirmar.');
      return;
    }
    try {
      const { error } = await supabase.rpc('eliminar_cuenta_publica');
      if (error) throw error;
      setModalEliminarCuenta(false);
      onLogout();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar la cuenta');
    }
  }

  const getAvatarUri = (seed: string, style: string) =>
    `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(seed || 'default')}&radius=50`;

  const formatFecha = (fecha?: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const maxGasto = Math.max(...stats.gastosPorCategoria.map((g) => g.monto), 1);
  const totalGastoMes = stats.gastosPorCategoria.reduce((acc, c) => acc + c.monto, 0);
  const maxIngresoGasto = Math.max(
    ...stats.ingresosGastosMensual.map((m) => Math.max(m.ingresos, m.gastos)),
    50
  );
  const selectedMonthData =
    selectedMonthIndex !== null && stats.ingresosGastosMensual[selectedMonthIndex]
      ? stats.ingresosGastosMensual[selectedMonthIndex]
      : null;

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Perfil" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.container}>
        {msgSuccess ? (
          <View style={[styles.successBox, { borderColor: colors.p500, backgroundColor: `${colors.p500}22` }]}>
            <Text style={[styles.successText, { color: colors.p400 }]}>✓ {msgSuccess}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.p500} />
          </View>
        ) : (
          <>
            {/* 1. Información del usuario */}
            <View style={[styles.card, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeaderTitle}>
                <Ionicons name="person-outline" size={20} color={colors.p500} />
                <Text style={[styles.cardSectionHeading, !isDarkMode && styles.textDark]}>
                  Información del usuario
                </Text>
              </View>

              <View style={styles.userSection}>
                {/* Avatar DiceBear + Botones */}
                <View style={styles.avatarColumn}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{ uri: getAvatarUri(avatarSeed, estiloAvatar) }}
                      style={styles.avatarImage}
                    />
                    <View style={styles.avatarActionButtons}>
                      <TouchableOpacity
                        style={[styles.smallRoundBtn, { backgroundColor: colors.p600 }]}
                        onPress={regenerarAvatar}
                      >
                        <Ionicons name="refresh" size={14} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallRoundBtn, { backgroundColor: '#334155' }]}
                        onPress={() => setModalAvatar(true)}
                      >
                        <Ionicons name="grid-outline" size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Selector de estilo de avatar con AnimatedSelect igual a la Web */}
                  <View style={{ width: 150, marginTop: 4 }}>
                    <AnimatedSelect
                      value={estiloAvatar}
                      onChange={cambiarEstiloAvatar}
                      placeholder="Estilo"
                      options={ESTILOS_AVATAR}
                    />
                  </View>
                </View>

                {/* Datos de Nombre, Correo y Fecha */}
                <View style={styles.userInfoCol}>
                  <Text style={styles.fieldLabel}>NOMBRE COMPLETO</Text>
                  {modoEdicion ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={[styles.textInputInline, !isDarkMode && styles.inputLight]}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="Tu nombre"
                        placeholderTextColor="#64748b"
                      />
                      <TouchableOpacity
                        style={[styles.saveInlineBtn, { backgroundColor: colors.p600 }]}
                        onPress={handleGuardarNombre}
                        disabled={saving}
                      >
                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelInlineBtn}
                        onPress={() => setModoEdicion(false)}
                      >
                        <Ionicons name="close" size={18} color="#cbd5e1" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.displayRow}>
                      <Text style={[styles.userDisplayName, !isDarkMode && styles.textDark]}>
                        {perfil?.nombre_completo || 'Sin nombre'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: `${colors.p500}22` }]}
                        onPress={() => setModoEdicion(true)}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.p500} />
                        <Text style={[styles.editBtnText, { color: colors.p500 }]}>Editar</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.detailItem}>
                    <Text style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
                    <Text style={[styles.fieldVal, !isDarkMode && styles.textDark]}>
                      {perfil?.email}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.fieldLabel}>FECHA DE REGISTRO</Text>
                    <Text style={[styles.fieldVal, !isDarkMode && styles.textDark]}>
                      {formatFecha(perfil?.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Preferencias de la app (5 Temas idénticos a la Web) */}
            <View style={[styles.card, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeaderTitle}>
                <Ionicons name="sparkles-outline" size={20} color={colors.p500} />
                <Text style={[styles.cardSectionHeading, !isDarkMode && styles.textDark]}>
                  Preferencias de la app
                </Text>
              </View>

              <Text style={styles.subFieldLabel}>Tema de color</Text>
              <View style={styles.themeGrid}>
                {THEME_LIST.map((th) => {
                  const isSelected = themeId === th.id;
                  return (
                    <TouchableOpacity
                      key={th.id}
                      style={[
                        styles.themeCardBtn,
                        !isDarkMode && styles.inputLight,
                        isSelected && {
                          borderColor: th.p500,
                          borderWidth: 2,
                          backgroundColor: `${th.p500}20`,
                        },
                      ]}
                      onPress={() => handleCambiarTema(th.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.themeColorCircle, { backgroundColor: th.p500 }]} />
                      <Text
                        style={[
                          styles.themeCardText,
                          !isDarkMode && styles.textDark,
                          isSelected && { fontWeight: '700', color: th.p400 },
                        ]}
                      >
                        {th.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.subFieldLabel, { marginTop: 18 }]}>
                Fuente de tasa de cambio
              </Text>
              <AnimatedSelect
                value={fuentePreferida}
                onChange={handleCambiarFuente}
                placeholder="Seleccione una fuente"
                options={fuentes.map((f) => ({
                  value: f.fuente,
                  label: `${f.fuente} (${f.tasa})`,
                }))}
              />
              <Text style={[styles.helpDesc, { marginTop: 8, marginBottom: 0 }]}>
                Se usará esta fuente para convertir montos entre USD y VES en transacciones y balance.
              </Text>
            </View>

            {/* 3. Estadísticas personales */}
            <View style={[styles.card, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeaderTitle}>
                <Ionicons name="bar-chart-outline" size={20} color={colors.p500} />
                <Text style={[styles.cardSectionHeading, !isDarkMode && styles.textDark]}>
                  Estadísticas personales
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statBox, !isDarkMode && styles.inputLight]}>
                  <Text style={[styles.statNumber, !isDarkMode && styles.textDark]}>
                    {stats.totalTransacciones}
                  </Text>
                  <Text style={styles.statLabel}>Transacciones</Text>
                </View>
                <View style={[styles.statBox, !isDarkMode && styles.inputLight]}>
                  <Text style={[styles.statNumber, !isDarkMode && styles.textDark]}>
                    {stats.totalCuentas}
                  </Text>
                  <Text style={styles.statLabel}>Cuentas</Text>
                </View>
                <View style={[styles.statBox, !isDarkMode && styles.inputLight]}>
                  <Text style={[styles.statNumber, !isDarkMode && styles.textDark]}>
                    {stats.totalMetas}
                  </Text>
                  <Text style={styles.statLabel}>Metas</Text>
                </View>
                <View style={[styles.statBox, !isDarkMode && styles.inputLight]}>
                  <Text style={[styles.statNumber, !isDarkMode && styles.textDark]}>
                    {stats.totalDeudas}
                  </Text>
                  <Text style={styles.statLabel}>Deudas</Text>
                </View>
              </View>

              {/* Gastos por categoría (mes actual) */}
              {stats.gastosPorCategoria.length > 0 ? (
                <View style={styles.chartBlock}>
                  <View style={styles.chartHeaderRow}>
                    <View style={styles.chartHeaderTitleGroup}>
                      <Ionicons name="pie-chart-outline" size={17} color={colors.p500} />
                      <Text style={[styles.chartTitle, !isDarkMode && styles.textDark]}>
                        Gastos por categoría
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.totalPill,
                        { backgroundColor: isDarkMode ? `${colors.p500}22` : colors.p100 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.totalPillText,
                          { color: isDarkMode ? colors.p400 : colors.p600 },
                        ]}
                      >
                        ${formatMoney(totalGastoMes)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoriesListWrap}>
                    {stats.gastosPorCategoria.map((cat, idx) => {
                      const widthPct = Math.min(
                        100,
                        Math.round((cat.monto / (totalGastoMes || 1)) * 100)
                      );
                      const col = COLORS[idx % COLORS.length];
                      return (
                        <View key={cat.nombre} style={styles.categoryBarCard}>
                          <View style={styles.categoryTopLine}>
                            <View style={styles.categoryLeftGroup}>
                              <View style={[styles.colorDot, { backgroundColor: col }]} />
                              <Text
                                style={[styles.categoryNameText, !isDarkMode && styles.textDark]}
                                numberOfLines={1}
                              >
                                {cat.nombre}
                              </Text>
                            </View>
                            <View style={styles.categoryRightGroup}>
                              <View style={[styles.pctBadge, { backgroundColor: `${col}18` }]}>
                                <Text style={[styles.pctBadgeText, { color: col }]}>{widthPct}%</Text>
                              </View>
                              <Text
                                style={[styles.categoryAmountText, !isDarkMode && styles.textDark]}
                              >
                                ${formatMoney(cat.monto)}
                              </Text>
                            </View>
                          </View>
                          <AnimatedProgressBar
                            progress={widthPct}
                            color={col}
                            bgColor={isDarkMode ? '#1e293b' : '#e2e8f0'}
                            height={7}
                            delay={idx * 80}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Ingresos vs Gastos (últimos 6 meses) */}
              {stats.ingresosGastosMensual.length > 0 ? (
                <View style={styles.chartBlock}>
                  <View style={styles.chartHeaderRow}>
                    <View style={styles.chartHeaderTitleGroup}>
                      <Ionicons name="bar-chart-outline" size={17} color={colors.p500} />
                      <Text style={[styles.chartTitle, !isDarkMode && styles.textDark]}>
                        Ingresos vs Gastos
                      </Text>
                    </View>

                    {/* Leyenda */}
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.legendText}>Ingresos</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>Gastos</Text>
                      </View>
                    </View>
                  </View>

                  {/* Gráfico de barras interactivo */}
                  <View style={[styles.barChartContainer, !isDarkMode && styles.inputLight]}>
                    <View style={styles.barsFlexRow}>
                      {stats.ingresosGastosMensual.map((m, idx) => {
                        const hIng = Math.max(6, Math.min(100, (m.ingresos / maxIngresoGasto) * 92));
                        const hGas = Math.max(6, Math.min(100, (m.gastos / maxIngresoGasto) * 92));
                        const isSelected = selectedMonthIndex === idx;

                        return (
                          <TouchableOpacity
                            key={m.mes}
                            activeOpacity={0.7}
                            onPress={() => setSelectedMonthIndex(isSelected ? null : idx)}
                            style={[
                              styles.monthBarCol,
                              isSelected && styles.monthBarColActive,
                            ]}
                          >
                            <View style={styles.barsDuoWrap}>
                              <View
                                style={[
                                  styles.barPillar,
                                  styles.barGreen,
                                  { height: hIng },
                                ]}
                              />
                              <View
                                style={[
                                  styles.barPillar,
                                  styles.barRed,
                                  { height: hGas },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.monthLabelText,
                                isSelected && { color: colors.p500, fontWeight: '700' },
                              ]}
                            >
                              {getMesNombre(m.mes)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Detalle del mes seleccionado al pulsar */}
                  {selectedMonthData ? (
                    <View
                      style={[
                        styles.monthSelectedBanner,
                        { borderColor: `${colors.p500}50`, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
                      ]}
                    >
                      <Text style={[styles.monthBannerHeader, !isDarkMode && styles.textDark]}>
                        Mes: {getMesNombre(selectedMonthData.mes)}
                      </Text>
                      <View style={styles.monthBannerRow}>
                        <View style={styles.monthBannerItem}>
                          <Text style={styles.monthBannerSub}>Ingresos</Text>
                          <Text style={styles.monthBannerIng}>
                            +${formatMoney(selectedMonthData.ingresos)}
                          </Text>
                        </View>
                        <View style={styles.monthBannerItem}>
                          <Text style={styles.monthBannerSub}>Gastos</Text>
                          <Text style={styles.monthBannerGas}>
                            -${formatMoney(selectedMonthData.gastos)}
                          </Text>
                        </View>
                        <View style={styles.monthBannerItem}>
                          <Text style={styles.monthBannerSub}>Balance Neto</Text>
                          <Text
                            style={[
                              styles.monthBannerNet,
                              selectedMonthData.ingresos >= selectedMonthData.gastos
                                ? styles.monthBannerIng
                                : styles.monthBannerGas,
                            ]}
                          >
                            {selectedMonthData.ingresos >= selectedMonthData.gastos ? '+' : '-'}
                            ${formatMoney(
                              Math.abs(selectedMonthData.ingresos - selectedMonthData.gastos)
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Progreso de metas */}
              {stats.progresoMetas.length > 0 ? (
                <View style={styles.chartBlock}>
                  <View style={styles.chartHeaderRow}>
                    <View style={styles.chartHeaderTitleGroup}>
                      <Ionicons name="flag-outline" size={17} color={colors.p500} />
                      <Text style={[styles.chartTitle, !isDarkMode && styles.textDark]}>
                        Progreso de metas de ahorro
                      </Text>
                    </View>
                  </View>
                  {stats.progresoMetas.map((pm, idx) => (
                    <View key={idx} style={styles.barItem}>
                      <View style={styles.barHeader}>
                        <Text style={[styles.barLabel, !isDarkMode && styles.textDark]}>
                          {pm.nombre}
                        </Text>
                        <Text style={[styles.barVal, { color: colors.p500 }]}>
                          ${formatMoney(pm.actual)} / ${formatMoney(pm.objetivo)} ({pm.porcentaje}%)
                        </Text>
                      </View>
                      <AnimatedProgressBar
                        progress={pm.porcentaje}
                        color={colors.p500}
                        bgColor={isDarkMode ? '#1e293b' : '#e2e8f0'}
                        height={7}
                        delay={idx * 100}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* 4. Gestión de la cuenta (Las 4 opciones idénticas a la Web) */}
            <View style={[styles.card, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeaderTitle}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.p500} />
                <Text style={[styles.cardSectionHeading, !isDarkMode && styles.textDark]}>
                  Gestión de la cuenta
                </Text>
              </View>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={async () => {
                  const ok = await scheduleDailyReminders();
                  if (ok) {
                    showToast('3 alertas diarias programadas (Mañana, Tarde, Noche)');
                  } else {
                    showToast('No se pudieron programar los recordatorios');
                  }
                }}
              >
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                    Alertas diarias de gastos (3 al día)
                  </Text>
                  <Text style={styles.manageDesc}>
                    Recordatorios aleatorios a las 10:30, 15:30 y 21:30
                  </Text>
                </View>
                <Ionicons name="time-outline" size={20} color={colors.p500} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={async () => {
                  await triggerSuccessNotification(
                    '🔔 Prueba de Notificación',
                    'Las notificaciones nativas de El Sencillo están activas y funcionando correctamente.'
                  );
                }}
              >
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                    Probar notificación nativa
                  </Text>
                  <Text style={styles.manageDesc}>Enviar alerta inmediata al teléfono</Text>
                </View>
                <Ionicons name="notifications-outline" size={20} color={colors.p500} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.manageBtn} onPress={handleSolicitarPassword}>
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                    Cambiar contraseña
                  </Text>
                  <Text style={styles.manageDesc}>Se enviará un correo con instrucciones</Text>
                </View>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.manageBtn} onPress={exportarDatosJSON}>
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                    Exportar datos
                  </Text>
                  <Text style={styles.manageDesc}>Descargar archivo JSON con toda la información</Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manageBtn, styles.manageBtnOrange]}
                onPress={() => {
                  setConfirmacionBorrar('');
                  setModalBorrarDatos(true);
                }}
              >
                <View>
                  <Text style={styles.manageTitleOrange}>Borrar todos los datos</Text>
                  <Text style={styles.manageDesc}>Elimina cuentas, transacciones, metas y deudas</Text>
                </View>
                <Ionicons name="trash-outline" size={20} color="#f97316" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manageBtn, styles.manageBtnRed]}
                onPress={() => {
                  setConfirmacionEliminar('');
                  setModalEliminarCuenta(true);
                }}
              >
                <View>
                  <Text style={styles.manageTitleRed}>Eliminar cuenta</Text>
                  <Text style={styles.manageDesc}>Elimina los datos y accesos de forma permanente</Text>
                </View>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* 5. Información y soporte (Igual a la Web) */}
            <View style={[styles.card, !isDarkMode && styles.cardLight]}>
              <View style={styles.cardHeaderTitle}>
                <Ionicons name="cube-outline" size={20} color={colors.p500} />
                <Text style={[styles.cardSectionHeading, !isDarkMode && styles.textDark]}>
                  Información y soporte
                </Text>
              </View>

              <View style={styles.manageBtn}>
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>Versión</Text>
                  <Text style={styles.manageDesc}>1.0.0 (Mobile & Web Sync)</Text>
                </View>
                <Ionicons name="cube-outline" size={20} color="#94a3b8" />
              </View>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => Linking.openURL('mailto:soporte@elsencillo.com?subject=Soporte%20El%20Sencillo')}
              >
                <View>
                  <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                    Soporte / Reportar problema
                  </Text>
                  <Text style={styles.manageDesc}>Contacto por correo electrónico</Text>
                </View>
                <Ionicons name="help-circle-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => setModalLegal('privacidad')}
              >
                <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                  Política de privacidad
                </Text>
                <Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => setModalLegal('terminos')}
              >
                <Text style={[styles.manageTitle, !isDarkMode && styles.textDark]}>
                  Términos de servicio
                </Text>
                <Ionicons name="document-text-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal 1: Galería de 16 Avatares Predefinidos */}
      <Modal visible={modalAvatar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Seleccionar avatar</Text>
              <TouchableOpacity onPress={() => setModalAvatar(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.avatarGrid}>
              {AVATARES_PREDEFINIDOS.map((seed) => {
                const selected = avatarSeed === seed;
                return (
                  <TouchableOpacity
                    key={seed}
                    style={[
                      styles.avatarGridItem,
                      selected && { borderColor: colors.p500, backgroundColor: `${colors.p500}22` },
                    ]}
                    onPress={() => seleccionarAvatarPredefinido(seed)}
                  >
                    <Image
                      source={{ uri: getAvatarUri(seed, estiloAvatar) }}
                      style={styles.avatarGridImg}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Confirmar Borrar Datos */}
      <Modal visible={modalBorrarDatos} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeadingOrange}>⚠️ Borrar todos los datos</Text>
              <TouchableOpacity onPress={() => setModalBorrarDatos(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalWarningText}>
              Esta acción eliminará todas tus cuentas, transacciones, metas y deudas. Tu usuario se mantendrá activo. Escribe BORRAR para confirmar:
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={confirmacionBorrar}
              onChangeText={setConfirmacionBorrar}
              placeholder="Escribe BORRAR"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.orangeConfirmBtn} onPress={confirmarBorrarDatos}>
              <Text style={styles.confirmBtnText}>Confirmar borrado total</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Confirmar Eliminar Cuenta */}
      <Modal visible={modalEliminarCuenta} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeadingRed}>🚨 Eliminar cuenta</Text>
              <TouchableOpacity onPress={() => setModalEliminarCuenta(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalWarningText}>
              Esta acción es irreversible y eliminará todos tus datos y perfil. Escribe ELIMINAR para confirmar:
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={confirmacionEliminar}
              onChangeText={setConfirmacionEliminar}
              placeholder="Escribe ELIMINAR"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.redConfirmBtn} onPress={confirmarEliminarCuenta}>
              <Text style={styles.confirmBtnText}>Eliminar mi cuenta permanentemente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 4: Privacidad y Términos */}
      <Modal visible={modalLegal !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>
                {modalLegal === 'privacidad' ? 'Política de Privacidad' : 'Términos de Servicio'}
              </Text>
              <TouchableOpacity onPress={() => setModalLegal(null)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.legalText}>
                {modalLegal === 'privacidad'
                  ? 'En El Sencillo (Apicash) protegemos tu información financiera mediante seguridad a nivel de filas (RLS) en Supabase. Tus saldos, cuentas y movimientos son privados y accesibles únicamente con tus credenciales.'
                  : 'El Sencillo es una herramienta de control y gestión de finanzas personales en USD y VES. Los cálculos de tasas son referenciales según las fuentes seleccionadas por el usuario.'}
              </Text>
            </ScrollView>
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
    paddingBottom: 44,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardSectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userSection: {
    flexDirection: 'column',
    gap: 16,
  },
  avatarColumn: {
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e293b',
  },
  avatarActionButtons: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    flexDirection: 'row',
    gap: 4,
  },
  smallRoundBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  avatarStyleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  styleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  styleChipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  userInfoCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userDisplayName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  textInputInline: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#ffffff',
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  saveInlineBtn: {
    padding: 8,
    borderRadius: 8,
  },
  cancelInlineBtn: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 8,
  },
  detailItem: {
    marginTop: 8,
  },
  fieldVal: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 2,
  },
  subFieldLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 10,
  },
  helpDesc: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeCardBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  themeColorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  themeCardText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  sourcesList: {
    gap: 6,
  },
  sourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourceItemText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  chartBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  totalPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesListWrap: {
    gap: 12,
  },
  categoryBarCard: {
    gap: 6,
  },
  categoryTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryNameText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
    flexShrink: 1,
  },
  categoryRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  barChartContainer: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 12,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    position: 'relative',
  },
  barsFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 4,
  },
  monthBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBarColActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  barsDuoWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 96,
  },
  barPillar: {
    width: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barGreen: {
    backgroundColor: '#10b981',
  },
  barRed: {
    backgroundColor: '#ef4444',
  },
  monthLabelText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 6,
  },
  monthSelectedBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  monthBannerHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  monthBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthBannerItem: {
    alignItems: 'center',
  },
  monthBannerSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  monthBannerIng: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 2,
  },
  monthBannerGas: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 2,
  },
  monthBannerNet: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  goalCardItem: {
    marginBottom: 12,
  },
  barItem: {
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  barVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  manageBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  manageBtnOrange: {
    borderColor: '#7c2d12',
    backgroundColor: '#43140733',
  },
  manageBtnRed: {
    borderColor: '#7f1d1d',
    backgroundColor: '#450a0a33',
  },
  manageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  manageTitleOrange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fb923c',
  },
  manageTitleRed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
  manageDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalHeadingOrange: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fb923c',
  },
  modalHeadingRed: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f87171',
  },
  modalWarningText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 12,
  },
  confirmInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 14,
  },
  orangeConfirmBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  redConfirmBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  avatarGridItem: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#1e293b',
  },
  avatarGridImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  legalText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  textDark: {
    color: '#0f172a',
  },
});
