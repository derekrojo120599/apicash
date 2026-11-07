import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RealtimeContextValue {
  syncTick: number;
  triggerLocalSync: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  syncTick: 0,
  triggerLocalSync: () => {},
});

export function MobileRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [syncTick, setSyncTick] = useState(0);

  const triggerLocalSync = useCallback(() => {
    setSyncTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // Suscripción Realtime a las tablas clave
    const channel = supabase
      .channel('apicash-mobile-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacciones' }, () => {
        triggerLocalSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas' }, () => {
        triggerLocalSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, () => {
        triggerLocalSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas' }, () => {
        triggerLocalSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, () => {
        triggerLocalSync();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [triggerLocalSync]);

  return (
    <RealtimeContext.Provider value={{ syncTick, triggerLocalSync }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useMobileRealtime() {
  return useContext(RealtimeContext);
}
