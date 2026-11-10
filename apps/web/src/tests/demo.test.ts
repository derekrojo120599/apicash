/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDemoModeActive,
  activateDemoMode,
  deactivateDemoMode,
  getDefaultDemoState,
  getDemoState
} from '@/lib/demoData'
import { createDemoClient } from '@/lib/demoClient'

describe('Modo Demo Client y Storage', () => {
  beforeEach(() => {
    deactivateDemoMode()
    localStorage.clear()
  })

  it('debe activar y desactivar el modo demo correctamente', () => {
    expect(isDemoModeActive()).toBe(false)
    activateDemoMode()
    expect(isDemoModeActive()).toBe(true)
    deactivateDemoMode()
    expect(isDemoModeActive()).toBe(false)
  })

  it('debe inicializar el estado demo con cuentas, categorias y transacciones', () => {
    const state = getDefaultDemoState()
    expect(state.cuentas.length).toBeGreaterThan(0)
    expect(state.categorias.length).toBeGreaterThan(0)
    expect(state.transacciones.length).toBeGreaterThan(0)
    expect(state.perfil.nombre_completo).toContain('Demo')
  })

  it('el cliente demo debe responder a rpc obtener_balance_neto', async () => {
    activateDemoMode()
    const client = createDemoClient()
    const { data, error } = await client.rpc('obtener_balance_neto', { p_user_id: 'demo' })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    const items = data as any[]
    expect(items[0].balance_neto).toBeGreaterThan(0)
  })

  it('el cliente demo debe permitir registrar una nueva transaccion y actualizar el saldo', async () => {
    activateDemoMode()
    const client = createDemoClient()
    const state = getDemoState()
    const cuentaUSD = state.cuentas.find(c => c.moneda === 'USD')!
    const saldoInicial = cuentaUSD.saldo_cache

    const { data: txId, error } = await client.rpc('registrar_operacion_con_comision', {
      p_cuenta_id: cuentaUSD.id,
      p_tipo: 'gasto',
      p_monto_original: 50,
      p_moneda_original: 'USD',
      p_descripcion: 'Gasto Test Demo'
    })

    expect(error).toBeNull()
    expect(txId).toBeDefined()

    const stateActualizado = getDemoState()
    const cuentaActualizada = stateActualizado.cuentas.find(c => c.id === cuentaUSD.id)!
    expect(cuentaActualizada.saldo_cache).toBe(saldoInicial - 50)
  })

  it('el cliente demo debe retornar datos al hacer select de tablas', async () => {
    activateDemoMode()
    const client = createDemoClient()
    const { data: cuentas } = await client.from('cuentas').select('*')
    expect(cuentas.length).toBeGreaterThan(0)

    const { data: perfil } = await client.from('perfiles').select('*').single()
    expect(perfil).toBeDefined()
    expect(perfil.moneda_principal).toBe('USD')
  })
})
