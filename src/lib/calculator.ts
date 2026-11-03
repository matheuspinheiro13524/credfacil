import type {
  ContratoForm,
  ParcelaCalculada,
  Intervalo,
} from './types';

// Brazilian national holidays (fixed dates)
const FERIADOS_NACIONAIS = [
  '01-01', // Confraternização
  '04-21', // Tiradentes
  '05-01', // Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
];

function isFeriado(date: Date): boolean {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return FERIADOS_NACIONAIS.includes(mmdd);
}

function isFimDeSemana(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function ajustarData(
  date: Date,
  ignorarFeriados: boolean,
  ignorarFds: boolean,
): Date {
  let adjusted = new Date(date);
  let safety = 0;
  while (safety < 365) {
    const skipFds = ignorarFds && isFimDeSemana(adjusted);
    const skipFeriado = ignorarFeriados && isFeriado(adjusted);
    if (!skipFds && !skipFeriado) break;
    adjusted.setDate(adjusted.getDate() + 1);
    safety++;
  }
  return adjusted;
}

function addIntervalo(date: Date, intervalo: Intervalo, unidades: number): Date {
  const result = new Date(date);
  switch (intervalo) {
    case 'diario':
      result.setDate(result.getDate() + unidades);
      break;
    case 'semanal':
      result.setDate(result.getDate() + 7 * unidades);
      break;
    case 'quinzenal':
      result.setDate(result.getDate() + 15 * unidades);
      break;
    case 'mensal':
      result.setMonth(result.getMonth() + unidades);
      break;
    case 'flexivel':
      result.setDate(result.getDate() + unidades);
      break;
  }
  return result;
}

export interface ResultadoCalculo {
  totalComJuros: number;
  totalJuros: number;
  valorParcela: number;
  parcelas: ParcelaCalculada[];
}

export function calcularContrato(form: ContratoForm): ResultadoCalculo {
  const valorTotal = form.valor_total || 0;
  const numParcelas = form.tipo === 'a_vista' ? 1 : Math.max(1, form.num_parcelas || 1);

  // Calculate interest amount
  let jurosValor: number;
  if (form.juros_tipo === 'percent') {
    jurosValor = (valorTotal * (form.juros_valor || 0)) / 100;
  } else {
    jurosValor = form.juros_valor || 0;
  }

  const totalComJuros = valorTotal + jurosValor;

  // Generate due dates
  const datasVencimento: Date[] = [];
  const dataBase = new Date(form.primeiro_vencimento + 'T00:00:00');

  for (let i = 0; i < numParcelas; i++) {
    let data: Date;
    if (i === 0) {
      data = new Date(dataBase);
    } else {
      data = addIntervalo(dataBase, form.intervalo, i);
    }
    data = ajustarData(data, form.ignorar_feriados, form.ignorar_fds);
    datasVencimento.push(data);
  }

  const parcelas: ParcelaCalculada[] = [];

  if (form.metodo_calculo === 'jurista') {
    // Jurista: interest on remaining balance, decreasing installments
    // Each installment = principal portion + interest on remaining balance
    const principalParcela = valorTotal / numParcelas;
    let saldoDevedor = valorTotal;

    for (let i = 0; i < numParcelas; i++) {
      // Interest for this period on remaining balance
      let jurosPeriodo: number;
      if (form.juros_tipo === 'percent') {
        jurosPeriodo = (saldoDevedor * (form.juros_valor || 0)) / 100;
      } else {
        // For fixed amount, divide equally per period
        jurosPeriodo = jurosValor / numParcelas;
      }

      const valorParcela = principalParcela + jurosPeriodo;
      saldoDevedor -= principalParcela;

      parcelas.push({
        numero: i + 1,
        valor: Math.round(valorParcela * 100) / 100,
        vencimento: datasVencimento[i].toISOString().split('T')[0],
        saldo_devedor: Math.round(Math.max(0, saldoDevedor) * 100) / 100,
      });
    }
  } else {
    // Padrão: simple interest on total, equal installments
    const valorParcela = totalComJuros / numParcelas;
    let saldoDevedor = totalComJuros;

    for (let i = 0; i < numParcelas; i++) {
      saldoDevedor -= valorParcela;
      parcelas.push({
        numero: i + 1,
        valor: Math.round(valorParcela * 100) / 100,
        vencimento: datasVencimento[i].toISOString().split('T')[0],
        saldo_devedor: Math.round(Math.max(0, saldoDevedor) * 100) / 100,
      });
    }
  }

  const totalCalculado = parcelas.reduce((sum, p) => sum + p.valor, 0);

  return {
    totalComJuros: Math.round(totalCalculado * 100) / 100,
    totalJuros: Math.round((totalCalculado - valorTotal) * 100) / 100,
    valorParcela: parcelas.length > 0 ? parcelas[0].valor : 0,
    parcelas,
  };
}

export function calcularMulta(
  valorParcela: number,
  multaTipo: string,
  multaValor: number,
  diasAtraso: number,
): number {
  if (diasAtraso <= 0) return 0;
  switch (multaTipo) {
    case 'fixo_dia':
      return Math.round(multaValor * diasAtraso * 100) / 100;
    case 'percent_dia':
      return Math.round((valorParcela * multaValor * diasAtraso / 100) * 100) / 100;
    default:
      return 0;
  }
}

export function diasAtraso(vencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento + 'T00:00:00');
  const diff = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
