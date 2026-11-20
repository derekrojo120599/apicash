import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { FadeIn } from '../components/Animations';
import { TopBar } from '../components/TopBar';

interface TerminosScreenProps {
  onOpenMenu: () => void;
}

const secciones: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: '1. Aceptación de los términos',
    parrafos: [
      'Al usar El Sencillo, acepta estos términos de servicio. Si no está de acuerdo, no utilice la aplicación.',
    ],
  },
  {
    titulo: '2. Uso de la aplicación',
    parrafos: [
      'El Sencillo es una herramienta personal de control de finanzas. Es su responsabilidad ingresar datos correctos y mantener la confidencialidad de su contraseña. No utilice la aplicación para actividades ilícitas.',
    ],
  },
  {
    titulo: '3. Disponibilidad y cambios',
    parrafos: [
      'Nos esforzamos por mantener la aplicación disponible, pero no garantizamos un funcionamiento ininterrumpido. Podemos modificar o discontinuar funciones con previo aviso cuando sea posible.',
    ],
  },
  {
    titulo: '4. Limitación de responsabilidad',
    parrafos: [
      'El Sencillo se proporciona "tal cual" sin garantías de precisión financiera. Las conversiones de moneda dependen de tasas de terceros y deben usarse solo como referencia.',
    ],
  },
];

export function TerminosScreen({ onOpenMenu }: TerminosScreenProps) {
  const { colors, isDarkMode } = useAppTheme();

  return (
    <View style={[styles.safeArea, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <TopBar title="Términos" onOpenMenu={onOpenMenu} />

      <ScrollView contentContainerStyle={styles.container}>
        <FadeIn>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.p500}22` }]}>
              <Ionicons name="document-text-outline" size={26} color={colors.p500} />
            </View>
            <Text style={[styles.heading, !isDarkMode && styles.textDark]}>
              Términos de Servicio
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
                Para consultas sobre estos términos, escriba a{' '}
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
