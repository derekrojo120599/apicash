/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Datos iniciales y utilidades para el Modo Demo interactivo de Apicash
 */

export const DEMO_STORAGE_KEY = 'apicash_demo_mode_active'
export const DEMO_STATE_KEY = 'apicash_demo_state_v1'

export interface DemoUser {
  id: string
  email: string
  user_metadata: {
    nombre_completo: string
  }
}

export const DEMO_USER: DemoUser = {
  id: 'demo-user-12345',
  email: 'demo@apicash.app',
  user_metadata: {
    nombre_completo: 'Usuario Demo'
  }
}

export interface DemoState {
  perfil: {
    id: string
    nombre_completo: string
    moneda_principal: string
    onboarding_completado: boolean
    fuente_tasa_preferida: string
    tema: string
    avatar_seed: string
    estilo_avatar: string
    created_at: string
  }
  cuentas: Array<{
    id: string
    user_id: string
    nombre: string
    tipo: 'banco' | 'efectivo' | 'exchange' | 'billetera_digital'
    moneda: 'USD' | 'VES'
    saldo_cache: number
    activa: boolean
    created_at: string
  }>
  categorias: Array<{
    id: string
    user_id: string
    nombre: string
    tipo: 'gasto' | 'ingreso' | 'ahorro' | 'deuda'
    icono?: string
  }>
  transacciones: Array<{
    id: string
    user_id: string
    cuenta_id: string
    categoria_id: string | null
    tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste'
    transferencia_direccion?: 'salida' | 'entrada' | null
    transferencia_vinculada_id?: string | null
    cuenta_destino_id?: string | null
    monto_original: number
    moneda_original: 'USD' | 'VES'
    tasa_al_momento: number | null
    monto_usd_calculado: number
    descripcion: string
    fecha: string
    anulada: boolean
    deleted_at?: string | null
    tarjeta_credito_id?: string | null
    compra_credito_id?: string | null
    deuda_id?: string | null
    meta_id?: string | null
    monto_impacto_auxiliar?: number | null
  }>
  presupuestos: Array<{
    id: string
    user_id: string
    categoria_id: string
    monto_planeado: number
    mes: string
  }>
  metas: Array<{
    id: string
    user_id: string
    nombre: string
    monto_objetivo: number | null
    monto_actual: number
    moneda: string
    fecha_objetivo: string | null
  }>
  deudas: Array<{
    id: string
    user_id: string
    nombre: string
    monto_total: number
    moneda: string
    saldo_pendiente: number
    fecha_limite: string | null
  }>
  tarjetasCredito: any[]
  comprasCredito: any[]
  gruposCompartidos: any[]
  tasas: Array<{
    fuente: string
    tasa: number
    fecha: string
  }>
}

export function getDefaultDemoState(): DemoState {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const todayISO = now.toISOString()
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString()

  return {
    perfil: {
      id: DEMO_USER.id,
      nombre_completo: 'Carlos Demo (Venezuela)',
      moneda_principal: 'USD',
      onboarding_completado: true,
      fuente_tasa_preferida: 'Cotizave Mediana P2P',
      tema: 'emerald',
      avatar_seed: 'ApicashDemo',
      estilo_avatar: 'bottts',
      created_at: daysAgo(60)
    },
    cuentas: [
      {
        id: 'cta-demo-1',
        user_id: DEMO_USER.id,
        nombre: 'Banesco Bs',
        tipo: 'banco',
        moneda: 'VES',
        saldo_cache: 45200.5,
        activa: true,
        created_at: daysAgo(60)
      },
      {
        id: 'cta-demo-2',
        user_id: DEMO_USER.id,
        nombre: 'Efectivo USD (Caja chica)',
        tipo: 'efectivo',
        moneda: 'USD',
        saldo_cache: 350.0,
        activa: true,
        created_at: daysAgo(60)
      },
      {
        id: 'cta-demo-3',
        user_id: DEMO_USER.id,
        nombre: 'Binance USDT',
        tipo: 'exchange',
        moneda: 'USD',
        saldo_cache: 1240.8,
        activa: true,
        created_at: daysAgo(45)
      },
      {
        id: 'cta-demo-4',
        user_id: DEMO_USER.id,
        nombre: 'Pago Móvil Mercantil',
        tipo: 'billetera_digital',
        moneda: 'VES',
        saldo_cache: 12500.0,
        activa: true,
        created_at: daysAgo(30)
      }
    ],
    categorias: [
      { id: 'cat-1', user_id: DEMO_USER.id, nombre: 'Alimentación y Supermercado', tipo: 'gasto', icono: 'ShoppingCart' },
      { id: 'cat-2', user_id: DEMO_USER.id, nombre: 'Servicios e Internet', tipo: 'gasto', icono: 'Wifi' },
      { id: 'cat-3', user_id: DEMO_USER.id, nombre: 'Transporte y Gasolina', tipo: 'gasto', icono: 'Car' },
      { id: 'cat-4', user_id: DEMO_USER.id, nombre: 'Salud y Farmacia', tipo: 'gasto', icono: 'HeartPulse' },
      { id: 'cat-5', user_id: DEMO_USER.id, nombre: 'Salario / Honorarios Freelance', tipo: 'ingreso', icono: 'Briefcase' },
      { id: 'cat-6', user_id: DEMO_USER.id, nombre: 'Ventas y Negocio', tipo: 'ingreso', icono: 'TrendingUp' },
      { id: 'cat-7', user_id: DEMO_USER.id, nombre: 'Ahorro Fondo de Emergencia', tipo: 'ahorro', icono: 'ShieldCheck' },
      { id: 'cat-8', user_id: DEMO_USER.id, nombre: 'Pago de Préstamo', tipo: 'deuda', icono: 'Receipt' },
    ],
    transacciones: [
      {
        id: 'tx-demo-1',
        user_id: DEMO_USER.id,
        cuenta_id: 'cta-demo-3',
        categoria_id: 'cat-5',
        tipo: 'ingreso',
        monto_original: 1200.0,
        moneda_original: 'USD',
        tasa_al_momento: null,
        monto_usd_calculado: 1200.0,
        descripcion: 'Pago cliente remoto (Desarrollo Frontend)',
        fecha: daysAgo(2),
        anulada: false,
        deleted_at: null
      },
      {
        id: 'tx-demo-2',
        user_id: DEMO_USER.id,
        cuenta_id: 'cta-demo-1',
        categoria_id: 'cat-1',
        tipo: 'gasto',
        monto_original: 3450.0,
        moneda_original: 'VES',
        tasa_al_momento: 64.5,
        monto_usd_calculado: 53.48,
        descripcion: 'Compras en Automercado Plaza',
        fecha: daysAgo(3),
        anulada: false,
        deleted_at: null
      },
      {
        id: 'tx-demo-3',
        user_id: DEMO_USER.id,
        cuenta_id: 'cta-demo-2',
        categoria_id: 'cat-3',
        tipo: 'gasto',
        monto_original: 40.0,
        moneda_original: 'USD',
        tasa_al_momento: null,
        monto_usd_calculado: 40.0,
        descripcion: 'Llenado de tanque gasolina y cambio de aceite',
        fecha: daysAgo(5),
        anulada: false,
        deleted_at: null
      },
      {
        id: 'tx-demo-4',
        user_id: DEMO_USER.id,
        cuenta_id: 'cta-demo-4',
        categoria_id: 'cat-2',
        tipo: 'gasto',
        monto_original: 1850.0,
        moneda_original: 'VES',
        tasa_al_momento: 64.2,
        monto_usd_calculado: 28.81,
        descripcion: 'Pago Fibra Óptica Cantv/Netuno',
        fecha: daysAgo(8),
        anulada: false,
        deleted_at: null
      },
      {
        id: 'tx-demo-5',
        user_id: DEMO_USER.id,
        cuenta_id: 'cta-demo-1',
        categoria_id: 'cat-4',
        tipo: 'gasto',
        monto_original: 980.0,
        moneda_original: 'VES',
        tasa_al_momento: 63.8,
        monto_usd_calculado: 15.36,
        descripcion: 'Farmatodo medicamentos y cuidado personal',
        fecha: daysAgo(11),
        anulada: false,
        deleted_at: null
      }
    ],
    presupuestos: [
      {
        id: 'pre-1',
        user_id: DEMO_USER.id,
        categoria_id: 'cat-1',
        monto_planeado: 250,
        mes: currentMonth
      },
      {
        id: 'pre-2',
        user_id: DEMO_USER.id,
        categoria_id: 'cat-2',
        monto_planeado: 80,
        mes: currentMonth
      },
      {
        id: 'pre-3',
        user_id: DEMO_USER.id,
        categoria_id: 'cat-3',
        monto_planeado: 100,
        mes: currentMonth
      }
    ],
    metas: [
      {
        id: 'meta-1',
        user_id: DEMO_USER.id,
        nombre: 'Fondo de Emergencia (6 meses)',
        monto_objetivo: 2000,
        monto_actual: 850,
        moneda: 'USD',
        fecha_objetivo: '2026-12-31'
      },
      {
        id: 'meta-2',
        user_id: DEMO_USER.id,
        nombre: 'Laptop para trabajo M3 Pro',
        monto_objetivo: 1400,
        monto_actual: 620,
        moneda: 'USD',
        fecha_objetivo: '2026-09-30'
      }
    ],
    deudas: [
      {
        id: 'deuda-1',
        user_id: DEMO_USER.id,
        nombre: 'Préstamo Equipamiento Taller',
        monto_total: 600,
        moneda: 'USD',
        saldo_pendiente: 220,
        fecha_limite: '2026-08-15'
      }
    ],
    tarjetasCredito: [
      {
        id: 'tc-demo-1',
        user_id: DEMO_USER.id,
        nombre: 'Banesco Black Crédito',
        banco: 'Banesco',
        moneda: 'VES',
        limite_credito: 100000,
        dia_corte: 15,
        dia_pago: 28,
        pago_minimo_pct: 10,
        interes_mensual_pct: 2.5,
        activa: true,
        created_at: daysAgo(30)
      }
    ],
    comprasCredito: [
      {
        id: 'compra-demo-1',
        user_id: DEMO_USER.id,
        comercio: 'Daka Chacao',
        descripcion: 'Aire Acondicionado Inverter 12000BTU',
        categoria_id: 'cat-1',
        moneda: 'USD',
        monto_total: 320,
        monto_inicial: 80,
        monto_restante: 160,
        numero_cuotas: 4,
        cuotas_pagadas: 2,
        intervalo_dias: 14,
        fecha_compra: daysAgo(28),
        tasa_al_momento: 63.5,
        estado: 'en_curso',
        created_at: daysAgo(28),
        cuotas_compra: [
          { id: 'cuota-1', compra_id: 'compra-demo-1', numero_cuota: 1, monto: 60, monto_pagado: 60, fecha_vencimiento: daysAgo(14), estado: 'pagada', pagada_at: daysAgo(14) },
          { id: 'cuota-2', compra_id: 'compra-demo-1', numero_cuota: 2, monto: 60, monto_pagado: 60, fecha_vencimiento: todayISO.split('T')[0], estado: 'pagada', pagada_at: todayISO },
          { id: 'cuota-3', compra_id: 'compra-demo-1', numero_cuota: 3, monto: 60, monto_pagado: 0, fecha_vencimiento: '2026-11-24', estado: 'pendiente', pagada_at: null },
          { id: 'cuota-4', compra_id: 'compra-demo-1', numero_cuota: 4, monto: 60, monto_pagado: 0, fecha_vencimiento: '2026-12-08', estado: 'pendiente', pagada_at: null }
        ]
      }
    ],
    gruposCompartidos: [
      {
        id: 'grupo-demo-1',
        creador_id: DEMO_USER.id,
        nombre: 'Gastos del Apartamento',
        descripcion: 'Alquiler, condominio y servicios compartidos',
        moneda: 'USD',
        color: '#10b981',
        codigo_invitacion: 'APTO2026',
        created_at: daysAgo(40),
        miembros_grupo: [
          { id: 'm-1', grupo_id: 'grupo-demo-1', user_id: DEMO_USER.id, nombre: 'Carlos Demo (Tú)', rol: 'admin', balance_neto: 45.0 },
          { id: 'm-2', grupo_id: 'grupo-demo-1', user_id: 'usr-roomie', nombre: 'Alejandro Roomie', rol: 'miembro', balance_neto: -45.0 }
        ]
      }
    ],
    tasas: [
      { fuente: 'Cotizave Mediana P2P', tasa: 65.4, fecha: todayISO },
      { fuente: 'BCV Oficial', tasa: 54.2, fecha: todayISO },
      { fuente: 'Paralelo Vzla', tasa: 66.1, fecha: todayISO }
    ]
  }
}

export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false
  return (
    localStorage.getItem(DEMO_STORAGE_KEY) === 'true' ||
    document.cookie.includes('apicash_demo_mode=true')
  )
}

export function activateDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_STORAGE_KEY, 'true')
  document.cookie = 'apicash_demo_mode=true; path=/; max-age=604800; SameSite=Lax'
  if (!localStorage.getItem(DEMO_STATE_KEY)) {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(getDefaultDemoState()))
  }
}

export function deactivateDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_STORAGE_KEY)
  localStorage.removeItem(DEMO_STATE_KEY)
  document.cookie = 'apicash_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function getDemoState(): DemoState {
  if (typeof window === 'undefined') return getDefaultDemoState()
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY)
    if (!raw) {
      const initial = getDefaultDemoState()
      localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw) as DemoState
  } catch {
    return getDefaultDemoState()
  }
}

export function setDemoState(state: DemoState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state))
}
