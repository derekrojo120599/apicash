import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatMoney, previewComision, ComisionConfig } from '@apicash/shared';
import { useAppTheme } from '../context/ThemeContext';
import { AnimatedSelect } from './AnimatedSelect';
import { triggerSuccessNotification } from '../lib/notifications';
import { ApicashLogo } from './ApicashLogo';

interface NewTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

export function NewTransactionModal({ visible, onClose, onSuccess }: NewTransactionModalProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [tipo, setTipo] = useState<'gasto' | 'ingreso' | 'transferencia'>('gasto');
  const [cuentaId, setCuentaId] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [operationSubtype, setOperationSubtype] = useState<string | null>(null);
  const [isFailed, setIsFailed] = useState(false);
  const [asumirComisionComercio, setAsumirComisionComercio] = useState(false);
  const [comisionOverride, setComisionOverride] = useState('');

  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [commissionsConfig, setCommissionsConfig] = useState<ComisionConfig[]>([]);
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  async function loadInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cuentasRes, catsRes, tasaRes, comRes] = await Promise.all([
        supabase.from('cuentas').select('id, nombre, tipo, moneda, saldo_cache').eq('user_id', user.id).eq('activa', true).order('nombre'),
        supabase.from('categorias').select('id, nombre, tipo').eq('user_id', user.id).order('nombre'),
        supabase.from('tasas_cambio').select('tasa').order('fecha', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('comisiones_config').select('*'),
      ]);

      if (cuentasRes.data && cuentasRes.data.length > 0) {
        setCuentas(cuentasRes.data as CuentaItem[]);
        if (!cuentaId) {
          setCuentaId(cuentasRes.data[0].id);
        }
      }

      if (catsRes.data) {
        setCategorias(catsRes.data as CategoriaItem[]);
      }

      if (tasaRes.data?.tasa) {
        setTasaActual(Number(tasaRes.data.tasa));
      }

      if (comRes.data) {
        setCommissionsConfig(comRes.data as ComisionConfig[]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const selectedCuenta = cuentas.find((c) => c.id === cuentaId);

  const filteredCategories = categorias.filter((c) => {
    if (tipo === 'gasto') return c.tipo === 'gasto';
    if (tipo === 'ingreso') return c.tipo === 'ingreso';
    return true;
  });

  async function handleCreateCategoryInline(newCatName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('categorias')
      .insert([
        {
          user_id: user.id,
          nombre: newCatName,
          tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto',
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setCategorias((prev) => [...prev, data as CategoriaItem]);
      setCategoriaId(data.id);
    }
  }

  const currentComision = useMemo(() => {
    if (!operationSubtype || !monto || !commissionsConfig.length) return null;
    const cfg = commissionsConfig.find((c) => c.subtipo_operacion === operationSubtype);
    if (!cfg) return null;
    try {
      const overrideVal = comisionOverride ? Number(comisionOverride) : null;
      return previewComision(monto, cfg, isFailed, overrideVal, asumirComisionComercio);
    } catch {
      return null;
    }
  }, [operationSubtype, monto, commissionsConfig, isFailed, comisionOverride, asumirComisionComercio]);

  const metodosPagoVES = [
    { value: '', label: 'Sin comisión bancaria' },
    { value: 'pm_p2p', label: '📱 Pago Móvil' },
    { value: 'pm_p2c', label: '🏢 Pago Móvil Empresa (P2C)' },
    { value: 'punto_venta', label: '💳 Punto de Venta' },
    { value: 'transferencia_mismo_banco', label: '🏦 Transferencia (Mismo Banco)' },
    { value: 'transferencia_interbancaria', label: '⏳ Transferencia (Otros Bancos)' },
  ];

  const metodosPagoUSD = [
    { value: '', label: 'Sin comisión bancaria' },
    { value: 'tarjeta_usd_nacional', label: '💳 Tarjeta en Dólares (Aplica IGTF)' },
    { value: 'transferencia_usd', label: '🏦 Transferencia / Retiro' },
  ];

  async function handleSubmit() {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setErrorMsg('Ingrese un monto válido');
      return;
    }

    if (!selectedCuenta) {
      setErrorMsg('Seleccione una cuenta válida');
      return;
    }

    if (tipo !== 'transferencia' && !categoriaId) {
      setErrorMsg('Seleccione una categoría');
      return;
    }

    if (tipo === 'transferencia' && !cuentaDestinoId) {
      setErrorMsg('Seleccione una cuenta de destino');
      return;
    }

    if (tipo === 'transferencia' && cuentaId === cuentaDestinoId) {
      setErrorMsg('La cuenta origen y destino no pueden ser la misma');
      return;
    }

    const numericMonto = Number(monto);

    if ((tipo === 'gasto' || tipo === 'transferencia') && numericMonto > selectedCuenta.saldo_cache) {
      setErrorMsg(
        `El monto principal supera el saldo disponible. Hay ${selectedCuenta.moneda === 'USD' ? '$' : 'Bs. '}${formatMoney(selectedCuenta.saldo_cache)} en esta cuenta.`
      );
      return;
    }

    if (comisionOverride && Number(comisionOverride) > 54 && operationSubtype === 'transferencia_mismo_banco') {
      setErrorMsg('La comisión máxima para transferencias del mismo banco es de 54,00 VES según tarifario BCV');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const moneda = selectedCuenta.moneda;
      const tasa = tasaActual || 1;

      if (tipo === 'transferencia') {
        const destAccount = cuentas.find((c) => c.id === cuentaDestinoId);
        if (!destAccount || destAccount.moneda !== moneda) {
          setErrorMsg('Por ahora solo se permiten transferencias entre cuentas con la misma moneda');
          setLoading(false);
          return;
        }

        const { error: rpcErr } = await supabase.rpc('registrar_transferencia', {
          p_cuenta_origen_id: cuentaId,
          p_cuenta_destino_id: cuentaDestinoId,
          p_monto: numericMonto,
          p_moneda: moneda,
          p_descripcion: descripcion.trim() || null,
          p_fecha: new Date().toISOString(),
          p_tasa_cambio: tasaActual || null,
        });

        if (rpcErr) throw rpcErr;
      } else if (tipo === 'gasto' && operationSubtype) {
        const { error: comErr } = await supabase.rpc('registrar_operacion_con_comision', {
          p_cuenta_id: cuentaId,
          p_categoria_principal_id: categoriaId || null,
          p_tipo: tipo,
          p_monto: numericMonto,
          p_moneda: moneda,
          p_subtipo_operacion: operationSubtype,
          p_tasa_cambio: tasaActual || null,
          p_fecha: new Date().toISOString(),
          p_descripcion: descripcion.trim() || '',
          p_override_comision: comisionOverride ? Number(comisionOverride) : null,
          p_es_fallida: isFailed,
          p_asumir_comision_comercio: asumirComisionComercio,
        });

        if (comErr) throw comErr;
      } else {
        const montoUsd = moneda === 'USD' ? numericMonto : Number((numericMonto / tasa).toFixed(2));

        const { error: txError } = await supabase.from('transacciones').insert([
          {
            user_id: user.id,
            cuenta_id: cuentaId,
            categoria_id: categoriaId || null,
            tipo: tipo,
            monto_original: numericMonto,
            moneda_original: moneda,
            monto_usd_calculado: montoUsd,
            tasa_al_momento: moneda === 'VES' ? tasa : null,
            descripcion: descripcion.trim(),
          },
        ]);

        if (txError) throw txError;
      }

      const simbolo = moneda === 'USD' ? '$' : 'Bs. ';
      await triggerSuccessNotification(
        '🎉 ¡Felicitaciones! Registro exitoso',
        `Tu ${tipo} por ${simbolo}${formatMoney(numericMonto)} en ${selectedCuenta.nombre} fue validado y registrado.`
      );

      setMonto('');
      setDescripcion('');
      setOperationSubtype(null);
      setIsFailed(false);
      setErrorMsg('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, !isDarkMode && styles.cardLight]}>
          <View
            style={[
              styles.header,
              !isDarkMode && { borderBottomColor: '#e2e8f0' },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ApicashLogo size={20} color={colors.p500} />
              <Text style={[styles.title, !isDarkMode && styles.textDark]}>
                Nueva Transacción
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            {/* Selector de Tipo (Gasto, Ingreso, Traspaso) */}
            <View style={styles.typeSelector}>
              {(['gasto', 'ingreso', 'transferencia'] as const).map((t) => {
                const active = tipo === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      !isDarkMode && styles.inputLight,
                      active &&
                        (t === 'gasto'
                          ? styles.btnRed
                          : t === 'ingreso'
                          ? { backgroundColor: `${colors.p500}22`, borderColor: colors.p500, borderWidth: 2 }
                          : styles.btnBlue),
                    ]}
                    onPress={() => {
                      setTipo(t);
                      setOperationSubtype(null);
                      setIsFailed(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        active &&
                          (t === 'gasto'
                            ? { color: '#f87171' }
                            : t === 'ingreso'
                            ? { color: colors.p500 }
                            : { color: '#60a5fa' }),
                      ]}
                    >
                      {t === 'transferencia' ? 'Traspaso' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cuenta Origen con AnimatedSelect igual a la Web */}
            <Text style={[styles.label, !isDarkMode && styles.textDark]}>
              {tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta origen/destino'}
            </Text>
            <AnimatedSelect
              value={cuentaId}
              onChange={(val) => {
                setCuentaId(val);
                setOperationSubtype(null);
              }}
              placeholder="Seleccione una cuenta"
              options={cuentas.map((c) => ({
                value: c.id,
                label: `${c.nombre} (${c.moneda}) - ${c.moneda === 'USD' ? '$' : 'Bs. '}${formatMoney(c.saldo_cache)}`,
              }))}
            />

            {/* Aviso de tasa cuando es VES */}
            {selectedCuenta?.moneda === 'VES' && tasaActual ? (
              <View style={styles.rateInfoBox}>
                <Text style={styles.rateInfoTitle}>Información de conversión:</Text>
                <Text style={styles.rateInfoText}>
                  Tasa actual: {formatMoney(tasaActual)} VES/USD
                  {monto && Number(monto) > 0
                    ? ` • Equivalente estimado: ≈ $${formatMoney(Number(monto) / tasaActual)} USD`
                    : ''}
                </Text>
              </View>
            ) : null}

            {/* Método de pago y comisiones con AnimatedSelect */}
            {tipo === 'gasto' && selectedCuenta?.tipo === 'banco' ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.label, !isDarkMode && styles.textDark]}>
                  Método de pago
                </Text>
                <AnimatedSelect
                  value={operationSubtype || ''}
                  onChange={(v) => setOperationSubtype(v === '' ? null : v)}
                  placeholder="Seleccione el método"
                  options={selectedCuenta.moneda === 'VES' ? metodosPagoVES : metodosPagoUSD}
                />

                {operationSubtype &&
                ['pm_p2p', 'pm_p2c', 'transferencia_interbancaria'].includes(operationSubtype) ? (
                  <View style={styles.switchRow}>
                    <Switch
                      value={isFailed}
                      onValueChange={setIsFailed}
                      trackColor={{ false: '#334155', true: colors.p500 }}
                    />
                    <Text style={[styles.switchLabel, !isDarkMode && styles.textDark]}>
                      Operación fallida (solo cobra comisión por intento)
                    </Text>
                  </View>
                ) : null}

                {operationSubtype &&
                ['pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco'].includes(operationSubtype) ? (
                  <View style={{ gap: 4 }}>
                    <View style={styles.switchRow}>
                      <Switch
                        value={asumirComisionComercio}
                        onValueChange={setAsumirComisionComercio}
                        trackColor={{ false: '#334155', true: colors.p500 }}
                      />
                      <Text style={[styles.switchLabel, !isDarkMode && styles.textDark]}>
                        Asumí la comisión del comercio (1,50% / mín. Bs. 14)
                      </Text>
                    </View>
                    {!asumirComisionComercio ? (
                      <Text style={styles.switchHelpText}>
                        Por normativa del BCV, esta comisión la asume el comercio. Tu cuenta no tendrá débito por comisión.
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {operationSubtype === 'transferencia_mismo_banco' ? (
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.subLabel, !isDarkMode && styles.textDark]}>
                      Comisión del banco (Opcional, máx. 54,00 VES)
                    </Text>
                    <View style={[styles.inputWrap, !isDarkMode && styles.inputLight]}>
                      <TextInput
                        style={[styles.textInput, !isDarkMode && styles.textDark]}
                        value={comisionOverride}
                        onChangeText={setComisionOverride}
                        keyboardType="decimal-pad"
                        placeholder="0.00 (dejar vacío si tu banco no cobra)"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                    <Text style={styles.switchHelpText}>
                      La mayoría de los bancos cobran Bs. 0. Ingresa un monto solo si tu banco te cobra comisión (tope BCV: Bs. 54).
                    </Text>
                  </View>
                ) : null}

                {currentComision && Number(currentComision.comisionFinal) > 0 ? (
                  <View style={[styles.comisionPreviewBox, !isDarkMode && styles.comisionPreviewLight]}>
                    <Text style={[styles.comisionPreviewText, !isDarkMode && { color: '#3730a3' }]}>
                      Se cobrará una comisión de{' '}
                      <Text style={{ fontWeight: 'bold' }}>{currentComision.comisionFinal} VES</Text>.
                    </Text>
                    {Number(currentComision.comisionFinal) > 0 && tasaActual ? (
                      <Text style={[styles.comisionUsdText, !isDarkMode && { color: '#4338ca' }]}>
                        Equivalente: ≈ ${(Number(currentComision.comisionFinal) / tasaActual).toFixed(2)} USD
                      </Text>
                    ) : null}
                  </View>
                ) : currentComision && ['pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco'].includes(operationSubtype || '') && !asumirComisionComercio ? (
                  <View style={[styles.comisionFreeBox, !isDarkMode && styles.comisionFreeLight]}>
                    <Text style={[styles.comisionFreeText, !isDarkMode && { color: '#065f46' }]}>
                      ✓ Comisión asumida por el comercio (0,00 VES debitados a tu cuenta).
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Cuenta Destino si es transferencia con AnimatedSelect */}
            {tipo === 'transferencia' ? (
              <>
                <Text style={[styles.label, !isDarkMode && styles.textDark]}>Cuenta destino</Text>
                <AnimatedSelect
                  value={cuentaDestinoId}
                  onChange={setCuentaDestinoId}
                  placeholder="Seleccione una cuenta destino"
                  options={cuentas
                    .filter((c) => c.id !== cuentaId && c.moneda === selectedCuenta?.moneda)
                    .map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda})`,
                    }))}
                />
              </>
            ) : null}

            {/* Categoría con Creatable AnimatedSelect igual a CreatableCategorySelect de la Web */}
            {tipo !== 'transferencia' ? (
              <>
                <Text style={[styles.label, !isDarkMode && styles.textDark]}>Categoría</Text>
                <AnimatedSelect
                  value={categoriaId}
                  onChange={setCategoriaId}
                  placeholder="Seleccionar Categoría..."
                  creatable
                  onCreateOption={handleCreateCategoryInline}
                  options={filteredCategories.map((cat) => ({
                    value: cat.id,
                    label: cat.nombre,
                  }))}
                />
              </>
            ) : null}

            {/* Monto */}
            <Text style={[styles.label, !isDarkMode && styles.textDark]}>
              Monto ({selectedCuenta?.moneda || 'USD'})
            </Text>
            <View style={[styles.inputWrap, !isDarkMode && styles.inputLight]}>
              <Text style={styles.currencyPrefix}>
                {selectedCuenta?.moneda === 'USD' ? '$' : 'Bs.'}
              </Text>
              <TextInput
                style={[styles.textInput, !isDarkMode && styles.textDark]}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={monto}
                onChangeText={setMonto}
              />
            </View>

            {/* Descripción */}
            <Text style={[styles.label, !isDarkMode && styles.textDark]}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.descInput, !isDarkMode && styles.inputLight]}
              placeholder="Ej. Compra supermercado..."
              placeholderTextColor="#64748b"
              value={descripcion}
              onChangeText={setDescripcion}
            />

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.p600 },
                loading && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Guardar Transacción</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '92%',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  formContent: {
    padding: 18,
    gap: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  btnRed: {
    backgroundColor: '#ef444422',
    borderColor: '#ef4444',
  },
  btnBlue: {
    backgroundColor: '#3b82f622',
    borderColor: '#3b82f6',
  },
  typeBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 4,
  },
  rateInfoBox: {
    backgroundColor: '#1e3a8a33',
    borderColor: '#3b82f655',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  rateInfoTitle: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rateInfoText: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
  },
  switchHelpText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
    lineHeight: 15,
  },
  subLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  comisionPreviewBox: {
    backgroundColor: '#312e8144',
    borderColor: '#6366f155',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  comisionPreviewLight: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  comisionPreviewText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '500',
  },
  comisionUsdText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  comisionFreeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  comisionFreeLight: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  comisionFreeText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  currencyPrefix: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  descInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textDark: {
    color: '#0f172a',
  },
});
