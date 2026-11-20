import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';

interface PrivacidadScreenProps {
  onOpenMenu: () => void;
}

const secciones: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: '1. Información que recopilamos',
    parrafos: [
      'El Sencillo recopila únicamente la información necesaria para el funcionamiento de la aplicación: correo electrónico, nombre opcional y los datos financieros ingresados voluntariamente (cuentas, transacciones, metas y deudas).',
    ],
  },
  {
    titulo: '2. Uso de la información',
    parrafos: [
      'La información se utiliza exclusivamente para presentar las finanzas personales dentro de la aplicación. No vendemos ni compartimos sus datos con terceros con fines comerciales.',
    ],
  },
  {
    titulo: '3. Seguridad',
    parrafos: [
      'Utilizamos Supabase para el almacenamiento y autenticación. Los datos se transmiten mediante conexiones cifradas (HTTPS/TLS) y el acceso está protegido por políticas de seguridad a nivel de fila (RLS).',
    ],
  },
  {
    titulo: '4. Sus derechos',
    parrafos: [
      'Puede acceder, modificar o eliminar sus datos en cualquier momento desde la sección de Perfil. Al eliminar su cuenta, todos los datos personales y financieros se borran de nuestros sistemas.',
    ],
  },
];

export function PrivacidadScreen({ onOpenMenu }: PrivacidadScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Privacidad" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.container}>
        <FadeIn>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.p500}22` }]}>
              <Ionicons name="shield-outline" size={26} color={colors.p500} />
            </View>
            <Text style={[styles.heading, !isDarkMode && styles.textDark]}>
              Política de Privacidad
            </Text>
          </View>
          <Text style={styles.updated}>
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </Text>
        </FadeIn>

        <View style={[styles.card, !isDarkMode && styles.cardLight]}>
          {secciones.map((sec, idx) => (
            <FadeIn key={sec.titulo} delay={idx * 60} style={styles.section}>
              <Text style={[styles.sectionTitle, !isDarkMode && styles.textDark]}>
                {sec.titulo}
              </Text>
              {sec.parrafos.map((parrafo, i) => (
                <Text key={i} style={[styles.parrafo, !isDarkMode && styles.parrafoLight]}>
                  {parrafo}
                </Text>
              ))}
            </FadeIn>
          ))}

          {/* 5. Contacto */}
          <FadeIn style={styles.section}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.textDark]}>
              5. Contacto
            </Text>
            <Text style={[styles.parrafo, !isDarkMode && styles.parrafoLight]}>
              <Text>
                Si tiene preguntas sobre esta política, escriba a{' '}
              </Text>
              <Text style={[styles.link, { color: colors.p500 }]}>
                soporte@elsencillo.com
              </Text>
              .
            </Text>
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  updated: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  parrafo: {
    fontSize: 14,
    lineHeight: 21,
    color: '#cbd5e1',
  },
  parrafoLight: {
    color: '#334155',
  },
  link: {
    fontWeight: '600',
  },
  textDark: {
    color: '#0f172a',
  },
});
