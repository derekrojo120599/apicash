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
  deuda_id?: string | null;
  meta_id?: string | null;
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
