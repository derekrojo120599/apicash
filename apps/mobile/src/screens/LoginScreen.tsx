import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { ApicashLogo } from '../components/ApicashLogo';
import { triggerSuccessNotification } from '../lib/notifications';

interface LoginScreenProps {
  onSuccess: (fakeSession?: any) => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  function handleEntrarModoPrueba() {
    onSuccess({
      user: {
        id: 'test-user-id',
        email: email.trim() || 'demo@apicash.app',
        user_metadata: { nombre_completo: nombre.trim() || 'Usuario Demo' }
      }
    });
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setErrorMessage('Por favor ingrese su correo electrónico');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setInfoMessage('');

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setInfoMessage(
        'Hemos enviado un enlace a su correo para restablecer su contraseña. Revise su bandeja o spam.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al enviar el correo');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!email || !password) {
      setErrorMessage('Por favor ingrese correo y contraseña');
      return;
    }

    if (isRegisterMode && !nombre.trim()) {
      setErrorMessage('Por favor ingrese su nombre completo');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setInfoMessage('');

      if (isRegisterMode) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              nombre_completo: nombre.trim(),
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.user) {
          // Actualizar nombre en perfiles y sembrar categorías por defecto si aplica
          await supabase
            .from('perfiles')
            .update({ nombre_completo: nombre.trim() })
            .eq('id', data.user.id);
          await supabase.rpc('seed_categorias_default', { p_user_id: data.user.id });

          await triggerSuccessNotification(
            '🎉 ¡Felicitaciones y bienvenido a El Sencillo!',
            `Hola ${nombre.trim()}, tu registro de cuenta fue exitoso.`
          );
        }

        if (data.session) {
          onSuccess();
        } else {
          setInfoMessage('Cuenta creada. Revise su correo electrónico para confirmar o inicie sesión.');
          setIsRegisterMode(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardContainer, !isDarkMode && { backgroundColor: '#f8fafc' }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, !isDarkMode && styles.cardLight]}>
          <View style={styles.header}>
            <View style={[styles.logoBadge, { backgroundColor: `${colors.p500}22` }]}>
              <ApicashLogo size={32} color={colors.p500} />
            </View>
            <Text style={[styles.title, !isDarkMode && styles.textDark]}>
              {isResetMode
                ? 'Recuperar contraseña'
                : isRegisterMode
                ? 'Crear cuenta'
                : 'Bienvenido de nuevo'}
            </Text>
            <Text style={styles.subtitle}>
              {isResetMode
                ? 'Le enviaremos las instrucciones a su correo'
                : isRegisterMode
                ? 'Comience a tomar el control total de sus finanzas'
                : 'Ingrese a su cuenta para gestionar sus finanzas'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isResetMode && isRegisterMode ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, !isDarkMode && styles.textDark]}>
                  Nombre completo
                </Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  placeholder="Juan Pérez"
                  placeholderTextColor="#64748b"
                  value={nombre}
                  onChangeText={setNombre}
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, !isDarkMode && styles.textDark]}>
                Correo electrónico
              </Text>
              <TextInput
                style={[styles.input, !isDarkMode && styles.inputLight]}
                placeholder="tu@email.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!isResetMode ? (
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.label, !isDarkMode && styles.textDark]}>Contraseña</Text>
                  {!isRegisterMode ? (
                    <TouchableOpacity
                      onPress={() => {
                        setIsResetMode(true);
                        setErrorMessage('');
                        setInfoMessage('');
                      }}
                    >
                      <Text style={[styles.forgotPasswordText, { color: colors.p400 }]}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View style={[styles.infoBox, { borderColor: colors.p500 }]}>
                <Text style={[styles.infoText, { color: colors.p400 }]}>{infoMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.p600 },
                loading && styles.buttonDisabled,
              ]}
              onPress={isResetMode ? handleResetPassword : handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isResetMode
                    ? 'Enviar enlace de recuperación'
                    : isRegisterMode
                    ? 'Registrarse'
                    : 'Iniciar sesión'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Acceso Rápido Modo Prueba / Demo Offline */}
            <TouchableOpacity
              style={[styles.demoButton, { borderColor: isDarkMode ? '#334155' : '#cbd5e1' }]}
              onPress={handleEntrarModoPrueba}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={16} color={colors.p500} />
              <Text style={[styles.demoButtonText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                Entrar en Modo Prueba (Demo Local)
              </Text>
            </TouchableOpacity>

            {isResetMode ? (
              <TouchableOpacity
                onPress={() => {
                  setIsResetMode(false);
                  setErrorMessage('');
                  setInfoMessage('');
                }}
                style={styles.switchAuthRow}
              >
                <Text style={[styles.switchAuthText, { color: colors.p500, fontWeight: '600' }]}>
                  Volver al inicio de sesión
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMessage('');
                  setInfoMessage('');
                }}
                style={styles.switchAuthRow}
              >
                <Text style={styles.switchAuthText}>
                  {isRegisterMode ? '¿Ya tiene una cuenta? ' : '¿No tiene una cuenta? '}
                  <Text style={{ color: colors.p500, fontWeight: '700' }}>
                    {isRegisterMode ? 'Inicie sesión aquí' : 'Regístrese aquí'}
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  inputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#064e3b33',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchAuthRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  switchAuthText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  textDark: {
    color: '#0f172a',
  },
});
