import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { formatMoney, parsearComprobanteTexto } from '@apicash/shared';
import { TopBar } from '../components/TopBar';
import { FinancialKeypad } from '../components/FinancialKeypad';
import { AnimatedSelect } from '../components/AnimatedSelect';

interface CuentaItem {
  id: string;
  nombre: string;
  tipo: 'banco' | 'efectivo' | 'exchange' | 'billetera_digital';
  moneda: 'USD' | 'VES';
  saldo_cache: number;
}

interface CategoriaItem {
  id: string;
  nombre: string;
  tipo: 'ingreso' | 'gasto' | 'ahorro' | 'deuda';
}

type TipoMovimiento = 'gasto' | 'ingreso';

// Converts the date shown on receipts (dd/mm/yyyy) to ISO; falls back to now.
// Mirrors the same helper in the web comprobante page for cross-platform parity.
function convertirFechaAISO(fecha: string): string {
  const matchManual = fecha.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchManual) {
    const [, dia, mes, anio] = matchManual;
    const date = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T12:00:00`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  const parsed = new Date(fecha);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function SubirComprobanteScreen({ onBack }: { onBack: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [procesando, setProcesando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [comprobanteListo, setComprobanteListo] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Datos extraídos del comprobante (solo monto, moneda, fecha y referencia)
  const [referencia, setReferencia] = useState('');
  const [monto, setMonto] = useState('');
  const [showKeypadMonto, setShowKeypadMonto] = useState(true);
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('VES');
  const [fecha, setFecha] = useState('');

  // Datos que completa el usuario
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('gasto');
  const [descripcion, setDescripcion] = useState('');
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  const [cuentaId, setCuentaId] = useState('');
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [tasaActual, setTasaActual] = useState<number | null>(null);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoMovimiento);

  useEffect(() => {
    cargarDatosRegistro();
  }, []);

  async function cargarDatosRegistro() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cuentasRes, catsRes, tasaRes] = await Promise.all([
        supabase.from('cuentas').select('id, nombre, tipo, moneda, saldo_cache').eq('user_id', user.id).eq('activa', true).order('nombre'),
        supabase.from('categorias').select('id, nombre, tipo').eq('user_id', user.id).order('nombre'),
        supabase.from('tasas_cambio').select('tasa').order('fecha', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (cuentasRes.data) {
        const lista = cuentasRes.data as CuentaItem[];
        setCuentas(lista);
        setCuentaId((prev) => (prev ? prev : lista[0]?.id ?? ''));
      }

      if (catsRes.data) {
        setCategorias(catsRes.data as CategoriaItem[]);
      }

      if (tasaRes.data?.tasa) {
        setTasaActual(Number(tasaRes.data.tasa));
      }
    } catch (e) {
      console.error('No se pudieron cargar cuentas, categorías y tasa:', e);
    }
  }

  async function handlePickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tus fotos para que puedas seleccionar la captura del comprobante.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;
      setImageUri(selectedUri);
      setProcesando(true);

      let textoDetectado = '';

      // 1. Intentar OCR local en el dispositivo con Google MLKit nativo (Offline y sin costo)
      try {
        const MLKit = require('@react-native-ml-kit/text-recognition');
        const TextRecognition = MLKit?.default || MLKit;
        if (TextRecognition && typeof TextRecognition.recognize === 'function') {
          const mlResult = await TextRecognition.recognize(selectedUri);
          if (mlResult && mlResult.text) {
            textoDetectado = mlResult.text;
          }
        }
      } catch (mlErr) {
        // En Expo Go estándar sin build nativo C++, MLKit requiere development build
        console.log('MLKit local nativo no disponible en Expo Go sin build nativo:', mlErr);
      }

      // Si MLKit leyó texto directamente en el dispositivo
      if (textoDetectado) {
        const parsed = parsearComprobanteTexto(textoDetectado);
        const referenciaExtraida = parsed.referencia && parsed.referencia !== 'S/REF' ? parsed.referencia : '';
        setReferencia(referenciaExtraida);
        setMonto(parsed.monto > 0 ? String(parsed.monto) : '');
        setMoneda(parsed.moneda);
        setFecha(parsed.fecha || '');
        setProcesando(false);
        setComprobanteListo(true);

        Alert.alert(
          '¡Comprobante Leído con MLKit (Local)!',
          `Monto: ${parsed.moneda === 'USD' ? '$' : 'Bs. '}${parsed.monto}\nRef: ${referenciaExtraida || 'S/REF'}`
        );
        return;
      }

      try {
        // 2. Fallback: Edge Function de Supabase si MLKit nativo no está linkeado en el cliente
        if (base64Data) {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('analizar-comprobante', {
            body: { imageBase64: base64Data }
          });

          if (!edgeErr && edgeData?.data && Number(edgeData.data.monto) > 0) {
            const d = edgeData.data;
            setReferencia(d.referencia || '');
            setMonto(String(d.monto));
            setMoneda(d.moneda === 'USD' ? 'USD' : 'VES');
            setFecha(d.fecha || '');
            setProcesando(false);
            setComprobanteListo(true);

            Alert.alert(
              '¡Comprobante Analizado!',
              `Monto: ${d.moneda === 'USD' ? '$' : 'Bs. '}${d.monto}\nRef: ${d.referencia || 'S/REF'}`
            );
            return;
          }
        }
      } catch (errEdge) {
        console.warn('Edge function no disponible, pasando a fallback:', errEdge);
      }

      // Si no hay respuesta automática, permitir ingresar los datos verificándolos con la foto
      setTimeout(() => {
        setReferencia('');
        setMonto('');
        setMoneda('VES');
        setFecha('');
        setProcesando(false);
        setComprobanteListo(true);

        Alert.alert(
          'Captura Cargada',
          'Toca la imagen arriba para ver tu comprobante en grande y completar los datos.'
        );
      }, 600);
    } catch (err: unknown) {
      setProcesando(false);
      const mensaje = err instanceof Error ? err.message : 'No se pudo abrir la galería de fotos.';
      Alert.alert('Error', mensaje);
    }
  }

  async function handleRegistrar() {
    const montoNum = parseFloat(monto.replace(',', '.'));
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor que cero.');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Falta el nombre del movimiento', 'Escribe el concepto o nombre del movimiento antes de registrar.');
      return;
    }
    if (!cuentaId) {
      Alert.alert('Falta la cuenta', 'Selecciona la cuenta donde se registrará el movimiento.');
      return;
    }

    try {
      setRegistrando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      // Anti-duplicate guard (same rule as the web): references shorter than 4 chars never block
      const referenciaLimpia = referencia.trim();
      const fechaISO = convertirFechaAISO(fecha);

      if (referenciaLimpia.length >= 4) {
        const { data: comprobanteExistente } = await supabase
          .from('comprobantes_procesados')
          .select('id')
          .eq('referencia', referenciaLimpia)
          .maybeSingle();

        if (comprobanteExistente) {
          Alert.alert('Comprobante duplicado', `Ya registraste un comprobante con esta referencia: ${referenciaLimpia}.`);
          return;
        }
      }

      // If the rate failed to load, pass null so the DB trigger fills it with the current rate
      const tasaAlMomento = moneda === 'VES' ? (tasaActual ?? null) : null;
      const tasa = tasaAlMomento ?? 1;
      const montoUsd = moneda === 'USD' ? montoNum : Number((montoNum / tasa).toFixed(2));

      const { data: transaccionCreada, error: txError } = await supabase
        .from('transacciones')
        .insert([
          {
            user_id: user.id,
            cuenta_id: cuentaId,
            categoria_id: categoriaId || null,
            tipo: tipoMovimiento,
            monto_original: montoNum,
            moneda_original: moneda,
            monto_usd_calculado: montoUsd,
            tasa_al_momento: tasaAlMomento,
            descripcion: descripcion.trim(),
            fecha: fechaISO,
          },
        ])
        .select()
        .single();

      if (txError) throw txError;

      // Persist the used reference so the same receipt cannot be registered twice
      const { error: comprobanteError } = await supabase
        .from('comprobantes_procesados')
        .insert([
          {
            user_id: user.id,
            referencia: referenciaLimpia,
            transaccion_id: transaccionCreada.id,
          },
        ]);

      if (comprobanteError && comprobanteError.code === '23505') {
        // Roll back the freshly created transaction to keep state consistent
        await supabase.from('transacciones').delete().eq('id', transaccionCreada.id);
        Alert.alert('Comprobante duplicado', `Ya registraste un comprobante con esta referencia: ${referenciaLimpia}.`);
        return;
      }
      if (comprobanteError) throw comprobanteError;

      const simbolo = moneda === 'USD' ? '$' : 'Bs. ';
      Alert.alert('¡Movimiento Registrado!', `El ${tipoMovimiento} por ${simbolo}${formatMoney(montoNum)} se ha guardado correctamente en tu cuenta.`);
      onBack();
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo registrar el movimiento.';
      Alert.alert('Error al registrar', mensaje);
    } finally {
      setRegistrando(false);
    }
  }

  const inputBorderStyle = { borderColor: isDarkMode ? '#334155' : '#cbd5e1' };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Subir Comprobante" onOpenMenu={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!comprobanteListo ? (
          <View style={[styles.uploadBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={[styles.uploadTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              Sube tu comprobante o captura
            </Text>
            <Text style={styles.uploadSub}>
              Selecciona de tu galería la captura de pantalla de tu Pago Móvil, transferencia o ticket de compra.
              {'\n'}La imagen no se almacena: solo se usa para leer los datos y luego se descarta.
            </Text>

            {/* Tipo de movimiento: selector visible antes del análisis */}
            <View style={{ width: '100%', marginBottom: 20 }}>
              <Text style={styles.fieldLabel}>Tipo de movimiento</Text>
              <View style={styles.tipoToggleRow}>
                <TouchableOpacity
                  style={[styles.tipoBtn, estiloTipo(isDarkMode, tipoMovimiento === 'gasto', ESTILO_GASTO.tinteClaro, ESTILO_GASTO.bordeClaro, ESTILO_GASTO.tinteOscuro, ESTILO_GASTO.bordeOscuro)]}
                  disabled={procesando}
                  onPress={() => setTipoMovimiento('gasto')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipoBtnText, { color: tipoMovimiento === 'gasto' ? (isDarkMode ? '#f87171' : '#dc2626') : '#94a3b8' }]}>
                    Gasto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, estiloTipo(isDarkMode, tipoMovimiento === 'ingreso', ESTILO_INGRESO.tinteClaro, ESTILO_INGRESO.bordeClaro, ESTILO_INGRESO.tinteOscuro, ESTILO_INGRESO.bordeOscuro)]}
                  disabled={procesando}
                  onPress={() => setTipoMovimiento('ingreso')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipoBtnText, { color: tipoMovimiento === 'ingreso' ? (isDarkMode ? '#34d399' : '#059669') : '#94a3b8' }]}>
                    Ingreso
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.p500 }]}
              disabled={procesando}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {procesando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={20} color="#ffffff" />
                  <Text style={styles.btnPrimaryText}>Abrir Galería de Fotos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.extractedCardWrapper}>
            {/* Vista previa de la captura real seleccionada con soporte de click para ampliar */}
            {imageUri && (
              <TouchableOpacity
                style={[styles.previewContainer, { borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                onPress={() => setPreviewModalOpen(true)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <View style={styles.previewOverlay}>
                  <Ionicons name="expand" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.previewTag}>Toca para ampliar y ver imagen completa</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={[styles.extractedCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.badgeSuccess}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.badgeSuccessText}>Datos Extraídos de la Captura</Text>
              </View>

              {/* Tipo de movimiento: sigue visible y editable después del análisis */}
              <Text style={styles.fieldLabel}>Tipo de movimiento</Text>
              <View style={styles.tipoToggleRow}>
                <TouchableOpacity
                  style={[styles.tipoBtn, estiloTipo(isDarkMode, tipoMovimiento === 'gasto', ESTILO_GASTO.tinteClaro, ESTILO_GASTO.bordeClaro, ESTILO_GASTO.tinteOscuro, ESTILO_GASTO.bordeOscuro)]}
                  onPress={() => { setTipoMovimiento('gasto'); setCategoriaId(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipoBtnText, { color: tipoMovimiento === 'gasto' ? (isDarkMode ? '#f87171' : '#dc2626') : '#94a3b8' }]}>
                    Gasto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBtn, estiloTipo(isDarkMode, tipoMovimiento === 'ingreso', ESTILO_INGRESO.tinteClaro, ESTILO_INGRESO.bordeClaro, ESTILO_INGRESO.tinteOscuro, ESTILO_INGRESO.bordeOscuro)]}
                  onPress={() => { setTipoMovimiento('ingreso'); setCategoriaId(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tipoBtnText, { color: tipoMovimiento === 'ingreso' ? (isDarkMode ? '#34d399' : '#059669') : '#94a3b8' }]}>
                    Ingreso
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Nombre del movimiento</Text>
              <TextInput
                style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Ej. Pago móvil supermercado"
                placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Monto ({moneda})</Text>
                    <TouchableOpacity onPress={() => setShowKeypadMonto(prev => !prev)}>
                      <Text style={{ fontSize: 11, color: colors.p500, fontWeight: '700' }}>
                        {showKeypadMonto ? '⌨️ Teclado estándar' : '🔢 Teclado financiero'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
                    keyboardType="numeric"
                    showSoftInputOnFocus={!showKeypadMonto}
                    value={monto}
                    onChangeText={setMonto}
                  />
                  {showKeypadMonto && (
                    <View style={{ marginTop: 8 }}>
                      <FinancialKeypad
                        value={monto}
                        onChangeValue={setMonto}
                        onConfirm={() => setShowKeypadMonto(false)}
                        confirmLabel="LISTO"
                      />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nº Referencia</Text>
                  <TextInput
                    style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
                    value={referencia}
                    onChangeText={setReferencia}
                    placeholder="Nº de referencia"
                    placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  />
                </View>
              </View>

              <View style={styles.selectRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Moneda</Text>
                  <AnimatedSelect
                    value={moneda}
                    onChange={(value) => setMoneda(value === 'USD' ? 'USD' : 'VES')}
                    options={[
                      { value: 'VES', label: 'Bs. (VES)' },
                      { value: 'USD', label: 'Dólares (USD)' },
                    ]}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Fecha de la operación</Text>
                  <TextInput
                    style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
                    value={fecha}
                    onChangeText={setFecha}
                    placeholder="Ej. 2026-11-21"
                    placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Cuenta del movimiento</Text>
              <AnimatedSelect
                value={cuentaId}
                onChange={setCuentaId}
                placeholder="Selecciona una cuenta"
                options={cuentas.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.moneda === 'USD' ? '$' : 'Bs.'})`,
                }))}
              />

              <Text style={styles.fieldLabel}>Categoría</Text>
              <AnimatedSelect
                value={categoriaId}
                onChange={setCategoriaId}
                placeholder="Sin categoría"
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...categoriasFiltradas.map((c) => ({ value: c.id, label: c.nombre })),
                ]}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.p500, opacity: registrando ? 0.6 : 1 }]}
              disabled={registrando}
              onPress={handleRegistrar}
              activeOpacity={0.8}
            >
              {registrando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                  <Text style={styles.btnPrimaryText}>Confirmar y Registrar Movimiento</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              disabled={registrando}
              onPress={() => {
                setImageUri(null);
                setComprobanteListo(false);
                setReferencia('');
                setMonto('');
                setMoneda('VES');
                setFecha('');
                setTipoMovimiento('gasto');
                setDescripcion('');
                setCategoriaId('');
                setShowKeypadMonto(true);
              }}
            >
              <Text style={styles.btnSecondaryText}>Elegir otra captura</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Pantalla Completa para ver la Imagen */}
      <Modal visible={previewModalOpen} transparent animationType="fade">
        <View style={styles.fullModalOverlay}>
          <TouchableOpacity
            style={styles.closeFullModalBtn}
            onPress={() => setPreviewModalOpen(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>

          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// Shared styling for the expense/income toggle in both states (before and after analysis)
function estiloTipo(
  isDarkMode: boolean,
  activo: boolean,
  tinteClaro: string,
  bordeClaro: string,
  tinteOscuro: string,
  bordeOscuro: string
) {
  if (activo) {
    return {
      backgroundColor: isDarkMode ? tinteOscuro : tinteClaro,
      borderWidth: 1,
      borderColor: isDarkMode ? bordeOscuro : bordeClaro,
    };
  }
  return {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
  };
}

const ESTILO_GASTO = {
  tinteClaro: '#fef2f2',
  bordeClaro: '#fca5a5',
  tinteOscuro: 'rgba(248,113,113,0.12)',
  bordeOscuro: 'rgba(248,113,113,0.5)',
};

const ESTILO_INGRESO = {
  tinteClaro: '#ecfdf5',
  bordeClaro: '#a7f3d0',
  tinteOscuro: 'rgba(16,185,129,0.12)',
  bordeOscuro: 'rgba(16,185,129,0.5)',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullModalBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fullImage: {
    width: '100%',
    height: '85%',
  },
  uploadBox: { padding: 24, borderRadius: 28, borderWidth: 1, alignItems: 'center' },
  iconCircle: { marginVertical: 12 },
  uploadTitle: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  uploadSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 16, marginTop: 4, lineHeight: 18, marginBottom: 20 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, borderRadius: 16 },
  btnPrimaryText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  extractedCardWrapper: { gap: 14 },
  previewContainer: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewTag: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  extractedCard: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 10 },
  badgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  badgeSuccessText: { fontSize: 11, fontWeight: '800', color: '#10b981', textTransform: 'uppercase' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  inputEdit: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
  tipoToggleRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tipoBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  tipoBtnText: { fontSize: 13, fontWeight: '800' },
  selectRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  fechaHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  btnSecondary: { paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' }
});
