import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { ArdillaMascot } from '../components/ArdillaMascot';
import { formatMoney } from '@apicash/shared';
import { TopBar } from '../components/TopBar';

export function SubirComprobanteScreen({ onBack }: { onBack: () => void }) {
  const { colors, isDarkMode } = useAppTheme();
  const [procesando, setProcesando] = useState(false);
  const [comprobanteListo, setComprobanteListo] = useState(false);

  // Datos extraídos del comprobante de pago
  const [comercio, setComercio] = useState('Farmatodo Venezuela');
  const [referencia, setReferencia] = useState('009842183');
  const [monto, setMonto] = useState('18.50');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [fecha, setFecha] = useState('10 nov 2026 · 15:40');
  const [categoriaSugerida, setCategoriaSugerida] = useState('Farmacia y Salud');

  function simularCargaComprobante() {
    setProcesando(true);
    setTimeout(() => {
      setProcesando(false);
      setComprobanteListo(true);
      Alert.alert(
        '¡Comprobante Analizado!',
        'Se extrajeron el comercio, referencia, monto y categoría automáticamente.'
      );
    }, 1400);
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}>
      <TopBar title="Subir Comprobante" onOpenMenu={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!comprobanteListo ? (
          <View style={[styles.uploadBox, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.iconCircle}>
              <ArdillaMascot mood="searching" size={80} />
            </View>

            <Text style={[styles.uploadTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              Sube tu comprobante o captura
            </Text>
            <Text style={styles.uploadSub}>
              Sube la captura de tu Pago Móvil, transferencia o recibo. El sistema analiza la imagen y extrae el monto, fecha y comercio.
            </Text>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.p500 }]}
              disabled={procesando}
              onPress={simularCargaComprobante}
              activeOpacity={0.8}
            >
              {procesando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
                  <Text style={styles.btnPrimaryText}>Seleccionar de Galería</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.extractedCardWrapper}>
            <View style={[styles.extractedCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.badgeSuccess}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.badgeSuccessText}>Datos Detectados</Text>
              </View>

              <Text style={styles.fieldLabel}>Comercio o Destinatario</Text>
              <TextInput
                style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: '#334155' }]}
                value={comercio}
                onChangeText={setComercio}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Monto ({moneda})</Text>
                  <TextInput
                    style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: '#334155' }]}
                    keyboardType="numeric"
                    value={monto}
                    onChangeText={setMonto}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nº Referencia</Text>
                  <TextInput
                    style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: '#334155' }]}
                    value={referencia}
                    onChangeText={setReferencia}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Categoría Sugerida</Text>
              <TextInput
                style={[styles.inputEdit, { color: isDarkMode ? '#fff' : '#0f172a', borderColor: '#334155' }]}
                value={categoriaSugerida}
                onChangeText={setCategoriaSugerida}
              />

              <Text style={styles.fechaHint}>Fecha detectada: {fecha}</Text>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.p500 }]}
              onPress={() => {
                Alert.alert('Éxito', 'Gasto registrado correctamente a partir del comprobante.');
                onBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Registrar como movimiento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setComprobanteListo(false)}
            >
              <Text style={styles.btnSecondaryText}>Subir otra captura</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  uploadBox: { padding: 24, borderRadius: 28, borderWidth: 1, alignItems: 'center' },
  iconCircle: { marginVertical: 12 },
  uploadTitle: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  uploadSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 16, marginTop: 4, lineHeight: 18, marginBottom: 20 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, borderRadius: 16 },
  btnPrimaryText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  extractedCardWrapper: { gap: 14 },
  extractedCard: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 10 },
  badgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  badgeSuccessText: { fontSize: 11, fontWeight: '800', color: '#10b981', textTransform: 'uppercase' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  inputEdit: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: '600' },
  fechaHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  btnSecondary: { paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' }
});
