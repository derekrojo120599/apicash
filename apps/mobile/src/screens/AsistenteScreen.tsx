import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { ArdillaMascot } from '../components/ArdillaMascot';
import { FadeIn } from '../components/Animations';

interface AsistenteScreenProps {
  onBack: () => void;
}

interface MensajeChat {
  id: string;
  remitente: 'usuario' | 'cashy';
  texto: string;
  hora: string;
}

export function AsistenteScreen({ onBack }: AsistenteScreenProps) {
  const { colors, isDarkMode } = useAppTheme();
  const [inputTexto, setInputTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);

  const sugerencias = [
    '¿Cuánto gasté este mes?',
    'Gasté $20 en comida hoy',
    '¿Cómo van mis metas de ahorro?',
    'Me pagaron $500 de freelance',
    '¿Me conviene pagar en bolívares o en dólares?'
  ];

  function enviarMensaje(textoAEnviar: string) {
    if (!textoAEnviar.trim()) return;

    const nuevoMsgUsuario: MensajeChat = {
      id: `u-${Date.now()}`,
      remitente: 'usuario',
      texto: textoAEnviar.trim(),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes(prev => [...prev, nuevoMsgUsuario]);
    setInputTexto('');
    setPensando(true);

    // Respuesta inteligente contextual de Cashy
    setTimeout(() => {
      let respuesta = 'Entendido. Estoy analizando tus números para darte la mejor recomendación.';
      const lower = textoAEnviar.toLowerCase();

      if (lower.includes('gasté') || lower.includes('gaste')) {
        respuesta = '¡Anotado! He registrado la intención de tu gasto. Te recomiendo mantenerte dentro del límite de Necesidades para no desbalancear tu presupuesto este mes.';
      } else if (lower.includes('cuánto') || lower.includes('balance') || lower.includes('mes')) {
        respuesta = 'Este mes tus finanzas se mantienen en plan. Recuerda que la brecha cambiaria te favorece si pagas tus gastos locales a tasa oficial usando bolívares.';
      } else if (lower.includes('meta') || lower.includes('ahorro')) {
        respuesta = 'Tus metas avanzan muy bien. Como buena ardilla previsora, recuerda reservar al menos el 10% de cada ingreso antes de planificar otros consumos.';
      } else if (lower.includes('bolívares') || lower.includes('dólares') || lower.includes('conviene')) {
        respuesta = 'Si el comercio cobra a tasa oficial BCV, te conviene pagar en bolívares cambiando antes tus divisas en P2P. Así te ahorras cerca de un 15% del costo de la compra.';
      } else if (lower.includes('pagaron') || lower.includes('ingreso') || lower.includes('freelance')) {
        respuesta = '¡Excelente noticia! Te sugiero apartar de inmediato la inicial de tus compras a cuotas o abonar al pago mínimo de tus tarjetas de crédito.';
      }

      const nuevoMsgCashy: MensajeChat = {
        id: `c-${Date.now()}`,
        remitente: 'cashy',
        texto: respuesta,
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

      setMensajes(prev => [...prev, nuevoMsgCashy]);
      setPensando(false);
    }, 1000);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDarkMode ? '#020617' : '#f8fafc' }]}
    >
      {/* TopBar Asistente */}
      <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#0a0e1a' : '#ffffff', borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#ffffff' : '#0f172a'} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.topTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>Asistente Cashy</Text>
          <Text style={styles.topSub}>Tu asesor financiero personal</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Sobre Cashy', 'Cashy es tu asistente financiero en Apicash. Te ayuda a controlar tus gastos, seguir tus metas y maximizar tu dinero ante la inflación y la brecha cambiaria.')}
          style={styles.infoBtn}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.p500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mensajes.length === 0 ? (
          // Vista inicial de bienvenida estilo Chekea
          <FadeIn style={styles.welcomeBox}>
            <View style={styles.mascotWrap}>
              <ArdillaMascot mood="zen" size={110} />
            </View>
            <Text style={[styles.welcomeTitle, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
              ¡Hola! Soy Cashy
            </Text>
            <Text style={styles.welcomeDesc}>
              Puedo registrar tus gastos e ingresos, consultar tu balance, advertirte sobre la brecha cambiaria y darte consejos financieros.
            </Text>

            <View style={styles.sugerenciasList}>
              {sugerencias.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.sugerenciaPill, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
                  onPress={() => enviarMensaje(sug)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sugerenciaText, { color: isDarkMode ? '#e2e8f0' : '#334155' }]}>
                    {sug}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.p500} />
                </TouchableOpacity>
              ))}
            </View>
          </FadeIn>
        ) : (
          // Historial de conversación
          <View style={styles.chatHistory}>
            {mensajes.map((msg) => {
              const isUser = msg.remitente === 'usuario';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    isUser ? styles.msgRowUser : styles.msgRowCashy
                  ]}
                >
                  {!isUser && (
                    <View style={styles.avatarMini}>
                      <ArdillaMascot mood="saving" size={32} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      isUser
                        ? [styles.bubbleUser, { backgroundColor: colors.p600 }]
                        : [styles.bubbleCashy, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]
                    ]}
                  >
                    <Text style={[styles.msgText, isUser ? { color: '#ffffff' } : { color: isDarkMode ? '#e2e8f0' : '#0f172a' }]}>
                      {msg.texto}
                    </Text>
                    <Text style={[styles.msgTime, isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: '#94a3b8' }]}>
                      {msg.hora}
                    </Text>
                  </View>
                </View>
              );
            })}

            {pensando && (
              <View style={[styles.msgRow, styles.msgRowCashy]}>
                <View style={styles.avatarMini}>
                  <ArdillaMascot mood="searching" size={32} />
                </View>
                <View style={[styles.bubbleCashy, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
                  <Text style={{ fontSize: 13, color: colors.p500, fontStyle: 'italic' }}>
                    Cashy está pensando...
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input de Chat y Nota de Voz */}
      <View style={[styles.inputBar, { backgroundColor: isDarkMode ? '#0a0e1a' : '#ffffff', borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[
            styles.chatInput,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
              color: isDarkMode ? '#ffffff' : '#0f172a',
              borderColor: isDarkMode ? '#1e293b' : '#cbd5e1'
            }
          ]}
          placeholder="Escribe tu mensaje o duda financiera..."
          placeholderTextColor="#94a3b8"
          value={inputTexto}
          onChangeText={setInputTexto}
          onSubmitEditing={() => enviarMensaje(inputTexto)}
        />

        <TouchableOpacity
          style={[styles.voiceBtn, { backgroundColor: colors.p500 }]}
          onPress={() => {
            if (inputTexto.trim()) {
              enviarMensaje(inputTexto);
            } else {
              Alert.alert('Nota de voz', 'Habla con Cashy. Puedes dictarle tus gastos rápidamente.');
            }
          }}
        >
          <Ionicons name={inputTexto.trim() ? "send" : "mic"} size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 17, fontWeight: '800' },
  topSub: { fontSize: 11, color: '#94a3b8' },
  infoBtn: { padding: 4 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  welcomeBox: { alignItems: 'center', paddingTop: 20 },
  mascotWrap: { marginBottom: 12 },
  welcomeTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  welcomeDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20, lineHeight: 19, marginBottom: 24 },
  sugerenciasList: { width: '100%', gap: 10 },
  sugerenciaPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  sugerenciaText: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  chatHistory: { gap: 14 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowCashy: { justifyContent: 'flex-start' },
  avatarMini: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  msgBubble: { padding: 12, borderRadius: 20, maxWidth: '80%' },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleCashy: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14,
  },
  voiceBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
