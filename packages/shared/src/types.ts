export type Moneda = 'USD' | 'VES';

export type TipoTransaccion = 'ingreso' | 'gasto' | 'transferencia' | 'ajuste';

export type TipoCuenta = 'banco' | 'efectivo' | 'exchange' | 'billetera_digital';

export interface TransaccionBase {
  id: string;
  user_id: string;
  cuenta_id: string;
  categoria_id: string | null;
  tipo: TipoTransaccion;
  transferencia_direccion?: 'salida' | 'entrada' | null;
  transferencia_vinculada_id?: string | null;
  cuenta_destino_id?: string | null;
  monto_original: number;
  moneda_original: Moneda;
  tasa_al_momento: number | null;
  monto_usd_calculado: number;
  descripcion: string;
  fecha: string;
  anulada: boolean;
  deleted_at?: string | null;
  tarjeta_credito_id?: string | null;
  compra_credito_id?: string | null;
  deuda_id?: string | null;
  meta_id?: string | null;
}

export interface TarjetaCreditoBase {
  id: string;
  user_id: string;
  nombre: string;
  banco?: string | null;
  moneda: Moneda;
  limite_credito: number;
  saldo_deuda: number;
  dia_corte: number;
  dia_pago: number;
  pago_minimo_pct: number;
  interes_mensual_pct: number;
  activa: boolean;
  created_at?: string;
}

export interface CompraCreditoBase {
  id: string;
  user_id: string;
  comercio: string;
  descripcion: string;
  categoria_id?: string | null;
  moneda: Moneda;
  monto_total: number;
  monto_inicial: number;
  saldo_pendiente: number;
  numero_cuotas: number;
  intervalo_dias: number;
  cuenta_inicial_id?: string | null;
  fecha_compra: string;
  estado: 'activa' | 'completada' | 'cancelada';
  created_at?: string;
}

export interface CuotaCompraBase {
  id: string;
  compra_credito_id: string;
  user_id: string;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago?: string | null;
  transaccion_id?: string | null;
  estado: 'pendiente' | 'pagada' | 'vencida';
  created_at?: string;
}

export interface CuentaBase {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoCuenta;
  moneda: Moneda;
  saldo_cache: number;
  color?: string | null;
  icono?: string | null;
  activa: boolean;
}

export interface CategoriaBase {
  id: string;
  user_id: string;
  nombre: string;
  icono: string;
  color: string;
  tipo: 'ingreso' | 'gasto';
}

export interface TasaCambioBase {
  id: string;
  fuente: string;
  tasa: number;
  fecha_actualizacion: string;
}
