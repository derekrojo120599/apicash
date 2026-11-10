/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock Client de Supabase para soportar la navegación y mutaciones en Modo Demo
 */
import {
  DEMO_USER,
  getDemoState,
  setDemoState,
  getDefaultDemoState
} from './demoData'

export function createDemoClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: DEMO_USER.id,
              email: DEMO_USER.email,
              user_metadata: DEMO_USER.user_metadata,
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString()
            }
          },
          error: null
        }
      },
      async getSession() {
        return {
          data: {
            session: {
              access_token: 'demo-token',
              refresh_token: 'demo-refresh',
              expires_in: 3600,
              token_type: 'bearer',
              user: {
                id: DEMO_USER.id,
                email: DEMO_USER.email,
                user_metadata: DEMO_USER.user_metadata,
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
              }
            }
          },
          error: null
        }
      },
      async signOut() {
        return { error: null }
      },
      async resetPasswordForEmail() {
        return { data: {}, error: null }
      },
      async updateUser() {
        return { data: { user: null }, error: null }
      }
    },

    channel() {
      return {
        on() {
          return this
        },
        subscribe() {
          return this
        },
        unsubscribe() {
          return this
        }
      }
    },

    rpc(fnName: string, args: any = {}) {
      const state = getDemoState()
      const tasaPrincipal = state.tasas[0]?.tasa || 65.0

      if (fnName === 'obtener_balance_neto') {
        let usdFijo = 0
        let vesTotal = 0
        state.cuentas.filter(c => c.activa).forEach(c => {
          if (c.moneda === 'USD') usdFijo += Number(c.saldo_cache)
          if (c.moneda === 'VES') vesTotal += Number(c.saldo_cache)
        })
        const vesEnUsd = vesTotal / tasaPrincipal
        const balanceNeto = usdFijo + vesEnUsd

        return Promise.resolve({
          data: [
            {
              usd_fijo: usdFijo,
              ves_total: vesTotal,
              ves_en_usd: vesEnUsd,
              balance_neto: balanceNeto,
              tasa_usada: tasaPrincipal,
              tasa_fecha: new Date().toISOString()
            }
          ],
          error: null
        })
      }

      if (fnName === 'obtener_progreso_presupuesto') {
        const progreso = state.presupuestos.map(p => {
          const cat = state.categorias.find(c => c.id === p.categoria_id)
          // Sumar gastos en esa categoría
          const gastado = state.transacciones
            .filter(t => !t.anulada && !t.deleted_at && t.categoria_id === p.categoria_id && t.tipo === 'gasto')
            .reduce((acc, t) => acc + (t.monto_usd_calculado || 0), 0)

          const pct = p.monto_planeado > 0 ? (gastado / p.monto_planeado) * 100 : 0
          return {
            categoria_id: p.categoria_id,
            categoria_nombre: cat?.nombre || 'Categoría',
            monto_planeado: p.monto_planeado,
            monto_gastado: gastado,
            porcentaje_usado: pct,
            restante: Math.max(0, p.monto_planeado - gastado)
          }
        })
        return Promise.resolve({ data: progreso, error: null })
      }

      if (fnName === 'copiar_presupuesto_anterior') {
        return Promise.resolve({ data: 1, error: null })
      }

      if (fnName === 'registrar_operacion_con_comision') {
        const newTx = {
          id: `tx-demo-${Date.now()}`,
          user_id: DEMO_USER.id,
          cuenta_id: args.p_cuenta_id,
          categoria_id: args.p_categoria_id || null,
          tipo: args.p_tipo,
          monto_original: Number(args.p_monto_original),
          moneda_original: args.p_moneda_original,
          tasa_al_momento: args.p_tasa_cambio ? Number(args.p_tasa_cambio) : null,
          monto_usd_calculado:
            args.p_moneda_original === 'USD'
              ? Number(args.p_monto_original)
              : Number(args.p_monto_original) / (args.p_tasa_cambio ? Number(args.p_tasa_cambio) : tasaPrincipal),
          descripcion: args.p_descripcion || 'Movimiento Demo',
          fecha: args.p_fecha || new Date().toISOString(),
          anulada: false,
          deleted_at: null,
          subtipo_operacion: args.p_subtipo_operacion || null
        }

        // Actualizar saldo de la cuenta
        const cuenta = state.cuentas.find(c => c.id === args.p_cuenta_id)
        if (cuenta) {
          if (args.p_tipo === 'ingreso') {
            cuenta.saldo_cache += Number(args.p_monto_original)
          } else if (args.p_tipo === 'gasto') {
            cuenta.saldo_cache -= Number(args.p_monto_original)
          }
        }

        state.transacciones.unshift(newTx)
        setDemoState(state)
        return Promise.resolve({ data: newTx.id, error: null })
      }

      if (fnName === 'registrar_transferencia') {
        const monto = Number(args.p_monto)
        const ctaOrigen = state.cuentas.find(c => c.id === args.p_cuenta_origen_id)
        const ctaDestino = state.cuentas.find(c => c.id === args.p_cuenta_destino_id)

        if (ctaOrigen) ctaOrigen.saldo_cache -= monto
        if (ctaDestino) ctaDestino.saldo_cache += monto

        const txSalida = {
          id: `tx-transf-salida-${Date.now()}`,
          user_id: DEMO_USER.id,
          cuenta_id: args.p_cuenta_origen_id,
          categoria_id: null,
          tipo: 'transferencia' as const,
          transferencia_direccion: 'salida' as const,
          cuenta_destino_id: args.p_cuenta_destino_id,
          monto_original: monto,
          moneda_original: args.p_moneda,
          tasa_al_momento: args.p_tasa_cambio ? Number(args.p_tasa_cambio) : null,
          monto_usd_calculado: args.p_moneda === 'USD' ? monto : monto / tasaPrincipal,
          descripcion: args.p_descripcion || 'Transferencia entre cuentas',
          fecha: args.p_fecha || new Date().toISOString(),
          anulada: false,
          deleted_at: null
        }

        state.transacciones.unshift(txSalida)
        setDemoState(state)
        return Promise.resolve({ data: txSalida.id, error: null })
      }

      if (fnName === 'soft_delete_transaccion') {
        const tx = state.transacciones.find(t => t.id === args.p_transaccion_id)
        if (tx) {
          tx.deleted_at = new Date().toISOString()
          setDemoState(state)
        }
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'restaurar_transaccion') {
        const tx = state.transacciones.find(t => t.id === args.p_transaccion_id)
        if (tx) {
          tx.deleted_at = null
          setDemoState(state)
        }
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'purgar_transaccion_definitiva') {
        state.transacciones = state.transacciones.filter(t => t.id !== args.p_transaccion_id)
        setDemoState(state)
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'actualizar_perfil') {
        if (args.p_nombre_completo) state.perfil.nombre_completo = args.p_nombre_completo
        if (args.p_tema) state.perfil.tema = args.p_tema
        if (args.p_avatar_seed) state.perfil.avatar_seed = args.p_avatar_seed
        if (args.p_fuente_tasa_preferida) state.perfil.fuente_tasa_preferida = args.p_fuente_tasa_preferida
        setDemoState(state)
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'registrar_aporte_meta') {
        const meta = state.metas.find(m => m.id === args.p_meta_id)
        if (meta) {
          meta.monto_actual += Number(args.p_monto)
        }
        const cta = state.cuentas.find(c => c.id === args.p_cuenta_id)
        if (cta) {
          cta.saldo_cache -= Number(args.p_monto)
        }
        setDemoState(state)
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'retirar_ahorro') {
        const meta = state.metas.find(m => m.id === args.p_meta_id)
        if (meta) {
          meta.monto_actual = Math.max(0, meta.monto_actual - Number(args.p_monto))
        }
        const cta = state.cuentas.find(c => c.id === args.p_cuenta_id)
        if (cta) {
          cta.saldo_cache += Number(args.p_monto)
        }
        setDemoState(state)
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'registrar_pago_deuda') {
        const deuda = state.deudas.find(d => d.id === args.p_deuda_id)
        if (deuda) {
          deuda.saldo_pendiente = Math.max(0, deuda.saldo_pendiente - Number(args.p_monto))
        }
        const cta = state.cuentas.find(c => c.id === args.p_cuenta_id)
        if (cta) {
          cta.saldo_cache -= Number(args.p_monto)
        }
        setDemoState(state)
        return Promise.resolve({ data: true, error: null })
      }

      if (fnName === 'crear_grupo_compartido') {
        const nuevoGrupo = {
          id: `grupo-demo-${Date.now()}`,
          creador_id: DEMO_USER.id,
          nombre: args.p_nombre,
          descripcion: args.p_descripcion || '',
          moneda: args.p_moneda || 'USD',
          color: args.p_color || '#10b981',
          codigo_invitacion: 'DEMO' + Math.floor(1000 + Math.random() * 9000),
          created_at: new Date().toISOString(),
          miembros_grupo: [
            { id: `m-${Date.now()}`, user_id: DEMO_USER.id, nombre: 'Carlos Demo (Tú)', rol: 'admin', balance_neto: 0 }
          ]
        }
        state.gruposCompartidos.unshift(nuevoGrupo)
        setDemoState(state)
        return Promise.resolve({ data: nuevoGrupo.id, error: null })
      }

      if (fnName === 'unirse_grupo_por_codigo') {
        return Promise.resolve({ data: 'grupo-demo-1', error: null })
      }

      if (fnName === 'borrar_datos_usuario') {
        setDemoState(getDefaultDemoState())
        return Promise.resolve({ data: true, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    },

    from(table: string) {
      const state = getDemoState()

      return {
        select(_fields: string = '*') {
          let rows: any[] = []

          if (table === 'perfiles') {
            rows = [state.perfil]
          } else if (table === 'cuentas') {
            rows = [...state.cuentas]
          } else if (table === 'categorias') {
            rows = [...state.categorias]
          } else if (table === 'transacciones') {
            rows = state.transacciones.map(t => {
              const cuenta = state.cuentas.find(c => c.id === t.cuenta_id)
              const cat = state.categorias.find(c => c.id === t.categoria_id)
              return {
                ...t,
                cuentas: cuenta ? { nombre: cuenta.nombre, moneda: cuenta.moneda } : undefined,
                categorias: cat ? { nombre: cat.nombre, icono: cat.icono || 'Tag', tipo: cat.tipo } : undefined
              }
            })
          } else if (table === 'presupuestos') {
            rows = [...state.presupuestos]
          } else if (table === 'metas') {
            rows = [...state.metas]
          } else if (table === 'deudas') {
            rows = [...state.deudas]
          } else if (table === 'tarjetas_credito') {
            rows = [...state.tarjetasCredito]
          } else if (table === 'compras_credito') {
            rows = state.comprasCredito.map(cc => {
              const cta = state.cuentas.find(c => c.id === cc.cuenta_inicial_id)
              return {
                ...cc,
                cuentas: cta ? { nombre: cta.nombre, moneda: cta.moneda } : undefined
              }
            })
          } else if (table === 'grupos_compartidos') {
            rows = [...state.gruposCompartidos]
          } else if (table === 'tasas_cambio') {
            rows = state.tasas.map(t => ({
              fuente: t.fuente,
              tasa: t.tasa,
              fecha: t.fecha
            }))
          } else if (table === 'comisiones_config') {
            rows = []
          } else if (table === 'snapshots_mensuales') {
            rows = [
              { mes: '2026-08', balance_neto_usd: 1450 },
              { mes: '2026-09', balance_neto_usd: 1720 },
              { mes: '2026-10', balance_neto_usd: 1980 },
              { mes: '2026-11', balance_neto_usd: 2150 }
            ]
          }

          const builder: any = {
            _rows: rows,
            order(col: string, opts?: { ascending?: boolean }) {
              const asc = opts?.ascending ?? true
              builder._rows.sort((a: any, b: any) => {
                const valA = a[col]
                const valB = b[col]
                if (valA < valB) return asc ? -1 : 1
                if (valA > valB) return asc ? 1 : -1
                return 0
              })
              return builder
            },
            eq(col: string, val: any) {
              builder._rows = builder._rows.filter((r: any) => r[col] === val)
              return builder
            },
            gte(col: string, val: any) {
              builder._rows = builder._rows.filter((r: any) => r[col] >= val)
              return builder
            },
            lte(col: string, val: any) {
              builder._rows = builder._rows.filter((r: any) => r[col] <= val)
              return builder
            },
            or(_cond: string) {
              return builder
            },
            not(col: string, operator: string, val: any) {
              if (operator === 'is' && val === null) {
                builder._rows = builder._rows.filter((r: any) => r[col] !== null && r[col] !== undefined)
              }
              return builder
            },
            limit(count: number) {
              builder._rows = builder._rows.slice(0, count)
              return builder
            },
            single() {
              const row = builder._rows[0] || null
              return Promise.resolve({ data: row, error: null })
            },
            then(resolve: any) {
              return Promise.resolve({ data: builder._rows, error: null }).then(resolve)
            }
          }

          return builder
        },

        insert(records: any | any[]) {
          const arr = Array.isArray(records) ? records : [records]
          const inserted: any[] = []

          arr.forEach((rec: any) => {
            const item = {
              ...rec,
              id: rec.id || `item-demo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              created_at: rec.created_at || new Date().toISOString()
            }
            if (table === 'cuentas') {
              item.saldo_cache = item.saldo_cache ?? 0
              item.activa = item.activa ?? true
              state.cuentas.unshift(item)
            } else if (table === 'categorias') {
              state.categorias.push(item)
            } else if (table === 'transacciones') {
              state.transacciones.unshift(item)
            } else if (table === 'metas') {
              item.monto_actual = item.monto_actual ?? 0
              state.metas.unshift(item)
            } else if (table === 'deudas') {
              item.saldo_pendiente = item.saldo_pendiente ?? item.monto_total
              state.deudas.unshift(item)
            } else if (table === 'tarjetas_credito') {
              state.tarjetasCredito.unshift(item)
            } else if (table === 'compras_credito') {
              state.comprasCredito.unshift(item)
            }
            inserted.push(item)
          })

          setDemoState(state)

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0] || null, error: null })
                },
                then(resolve: any) {
                  return Promise.resolve({ data: inserted, error: null }).then(resolve)
                }
              }
            },
            then(resolve: any) {
              return Promise.resolve({ data: inserted, error: null }).then(resolve)
            }
          }
        },

        upsert(records: any | any[]) {
          const arr = Array.isArray(records) ? records : [records]
          arr.forEach((rec: any) => {
            if (table === 'presupuestos') {
              const idx = state.presupuestos.findIndex(
                p => p.categoria_id === rec.categoria_id && p.mes === rec.mes
              )
              if (idx >= 0) {
                state.presupuestos[idx] = { ...state.presupuestos[idx], ...rec }
              } else {
                state.presupuestos.push({
                  id: `pre-demo-${Date.now()}`,
                  user_id: DEMO_USER.id,
                  ...rec
                })
              }
            }
          })
          setDemoState(state)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: arr[0] || null, error: null })
                },
                then(resolve: any) {
                  return Promise.resolve({ data: arr, error: null }).then(resolve)
                }
              }
            },
            then(resolve: any) {
              return Promise.resolve({ data: arr, error: null }).then(resolve)
            }
          }
        },

        update(updates: any) {
          return {
            eq(col: string, val: any) {
              if (table === 'cuentas') {
                const c = state.cuentas.find((item: any) => item[col] === val)
                if (c) Object.assign(c, updates)
              } else if (table === 'categorias') {
                const c = state.categorias.find((item: any) => item[col] === val)
                if (c) Object.assign(c, updates)
              } else if (table === 'metas') {
                const m = state.metas.find((item: any) => item[col] === val)
                if (m) Object.assign(m, updates)
              } else if (table === 'deudas') {
                const d = state.deudas.find((item: any) => item[col] === val)
                if (d) Object.assign(d, updates)
              }
              setDemoState(state)
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({ data: updates, error: null })
                    }
                  }
                },
                then(resolve: any) {
                  return Promise.resolve({ data: updates, error: null }).then(resolve)
                }
              }
            }
          }
        },

        delete() {
          return {
            eq(col: string, val: any) {
              if (table === 'cuentas') {
                state.cuentas = state.cuentas.filter((item: any) => item[col] !== val)
              } else if (table === 'categorias') {
                state.categorias = state.categorias.filter((item: any) => item[col] !== val)
              } else if (table === 'metas') {
                state.metas = state.metas.filter((item: any) => item[col] !== val)
              } else if (table === 'deudas') {
                state.deudas = state.deudas.filter((item: any) => item[col] !== val)
              }
              setDemoState(state)
              return Promise.resolve({ data: null, error: null })
            }
          }
        }
      }
    }
  }
}
