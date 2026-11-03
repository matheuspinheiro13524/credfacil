export type JurosTipo = 'percent' | 'fixed';
export type MetodoCalculo = 'padrao' | 'jurista';
export type TipoContrato = 'a_vista' | 'parcelado';
export type Intervalo = 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'flexivel';
export type MultaTipo = 'nenhuma' | 'fixo_dia' | 'percent_dia';
export type StatusContrato = 'ativo' | 'quitado' | 'cancelado';
export type StatusParcela = 'pendente' | 'pago' | 'atrasado';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cidade: string;
  observacao: string;
  created_at: string;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  valor_total: number;
  juros_tipo: JurosTipo;
  juros_valor: number;
  metodo_calculo: MetodoCalculo;
  tipo: TipoContrato;
  num_parcelas: number;
  intervalo: Intervalo;
  primeiro_vencimento: string;
  multa_tipo: MultaTipo;
  multa_valor: number;
  ignorar_feriados: boolean;
  ignorar_fds: boolean;
  observacao: string;
  comprovante_url: string;
  status: StatusContrato;
  total_com_juros: number;
  valor_parcela: number;
  created_at: string;
  cliente?: Cliente;
}

export interface Parcela {
  id: string;
  contrato_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: StatusParcela;
  pago_at: string | null;
  valor_multa: number;
  saldo_devedor: number;
  created_at: string;
}

export interface ContratoForm {
  cliente_id: string;
  valor_total: number;
  juros_tipo: JurosTipo;
  juros_valor: number;
  metodo_calculo: MetodoCalculo;
  tipo: TipoContrato;
  num_parcelas: number;
  intervalo: Intervalo;
  primeiro_vencimento: string;
  multa_tipo: MultaTipo;
  multa_valor: number;
  ignorar_feriados: boolean;
  ignorar_fds: boolean;
  observacao: string;
  comprovante_url: string;
}

export interface ParcelaCalculada {
  numero: number;
  valor: number;
  vencimento: string;
  saldo_devedor: number;
}
