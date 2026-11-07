import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/lib/supabase';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { MobileRealtimeProvider } from './src/context/RealtimeContext';
import { initNotificationsPermission } from './src/lib/notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CuentasScreen } from './src/screens/CuentasScreen';
import { MovimientosScreen } from './src/screens/MovimientosScreen';
import { AhorrosScreen } from './src/screens/AhorrosScreen';
import { DeudasScreen } from './src/screens/DeudasScreen';
import { CategoriasScreen } from './src/screens/CategoriasScreen';
import { PresupuestoScreen } from './src/screens/PresupuestoScreen';
import { CalculadoraScreen } from './src/screens/CalculadoraScreen';
import { GuiaScreen } from './src/screens/GuiaScreen';
import { PerfilScreen } from './src/screens/PerfilScreen';
import { SidebarDrawer, ScreenTab } from './src/components/SidebarDrawer';

function MainApp() {
  const { colors, isDarkMode } = useAppTheme();
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<ScreenTab>('dashboard');

  useEffect(() => {
    initNotificationsPermission().catch(() => {});

    let mounted = true;

    // Timeout de seguridad: si Supabase tarda en responder o no hay sesión previa, liberamos la pantalla en 800ms
    const safetyTimer = setTimeout(() => {
      if (mounted) setCheckingAuth(false);
    }, 800);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setCheckingAuth(false);
        }
      })
      .catch((err) => {
        console.warn('Error al obtener sesión:', err);
        if (mounted) setCheckingAuth(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setSidebarOpen(false);
  }

  if (checkingAuth) {
    return (
      <View style={[styles.loadingContainer, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color={colors.p500} />
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    );
  }

  function renderScreen() {
    switch (currentTab) {
      case 'cuentas':
        return <CuentasScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'movimientos':
        return <MovimientosScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'ahorros':
        return <AhorrosScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'deudas':
        return <DeudasScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'categorias':
        return <CategoriasScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'presupuesto':
        return <PresupuestoScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'calculadora':
        return <CalculadoraScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'guia':
        return (
          <GuiaScreen
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'perfil':
        return (
          <PerfilScreen
            onOpenMenu={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardScreen
            onLogout={handleLogout}
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
    }
  }

  return (
    <View style={[styles.appContainer, !isDarkMode && { backgroundColor: '#f8fafc' }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {session ? (
        <>
          {renderScreen()}

          <SidebarDrawer
            visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onLogout={handleLogout}
          />
        </>
      ) : (
        <LoginScreen onSuccess={() => {}} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MobileRealtimeProvider>
          <MainApp />
        </MobileRealtimeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
