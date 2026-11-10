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
import { CreditoScreen } from './src/screens/CreditoScreen';
import { CompartidasScreen } from './src/screens/CompartidasScreen';
import { PrestamosScreen } from './src/screens/PrestamosScreen';
import { EscanearFacturaScreen } from './src/screens/EscanearFacturaScreen';
import { AsistenteScreen } from './src/screens/AsistenteScreen';
import { MonitorTasasScreen } from './src/screens/MonitorTasasScreen';
import { GuiaScreen } from './src/screens/GuiaScreen';
import { PerfilScreen } from './src/screens/PerfilScreen';
import { SidebarDrawer, ScreenTab } from './src/components/SidebarDrawer';
import { BottomFloatingBar } from './src/components/BottomFloatingBar';
import { QuickActionsSheet } from './src/components/QuickActionsSheet';
import { NewTransactionModal } from './src/components/NewTransactionModal';
import { AppUpdateModal } from './src/components/AppUpdateModal';

function MainApp() {
  const { colors, isDarkMode } = useAppTheme();
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<ScreenTab>('dashboard');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

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
      case 'credito':
        return <CreditoScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'compartidas':
        return <CompartidasScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'prestamos':
        return <PrestamosScreen onOpenMenu={() => setSidebarOpen(true)} />;
      case 'escanear':
        return <EscanearFacturaScreen onBack={() => setCurrentTab('dashboard')} />;
      case 'asistente':
        return <AsistenteScreen onBack={() => setCurrentTab('dashboard')} />;
      case 'monitor-tasas':
        return <MonitorTasasScreen onBack={() => setCurrentTab('dashboard')} />;
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

          {/* Píldora Flotante Inferior estilo Chekea */}
          <BottomFloatingBar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onOpenQuickActions={() => setQuickActionsOpen(true)}
          />

          {/* Bottom Sheet de Acciones Rápidas (+) */}
          <QuickActionsSheet
            visible={quickActionsOpen}
            onClose={() => setQuickActionsOpen(false)}
            onSelectAction={(action) => {
              if (action === 'transaccion') {
                setTransactionModalOpen(true);
              } else if (action === 'credito') {
                setCurrentTab('credito');
              } else if (action === 'compartidas') {
                setCurrentTab('compartidas');
              } else if (action === 'cuentas') {
                setCurrentTab('cuentas');
              }
            }}
          />

          <NewTransactionModal
            visible={transactionModalOpen}
            onClose={() => setTransactionModalOpen(false)}
            onSuccess={() => setTransactionModalOpen(false)}
          />

          <SidebarDrawer
            visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onLogout={handleLogout}
          />
          <AppUpdateModal />
        </>
      ) : (
        <LoginScreen onSuccess={(fakeSession) => {
          if (fakeSession) {
            setSession(fakeSession);
          }
        }} />
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
