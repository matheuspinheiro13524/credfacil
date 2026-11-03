import { TrendingUp, Clock, AlertTriangle, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Contrato, Cliente } from '@/lib/types';
import { formatMoeda, formatData } from '@/lib/format';
import { diasAtraso } from '@/lib/calculator';

interface DashboardStats {
  totalEmprestado: number;
  aReceber: number;
  emAtraso: number;
  totalClientes: number;
}

interface Props {
  onNavigate: (page: 'dashboard' | 'clientes' | 'novo-contrato') => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmprestado: 0,
    aReceber: 0,
    emAtraso: 0,
    totalClientes: 0,
  });
  const [contratos, setContratos] = useState<(Contrato & { cliente?: Cliente })[]>([]);
  const [recebimentosMes, setRecebimentosMes] = useState<{ dia: string; valor: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: clientesData }, { data: contratosData }, { data: parcelasData }] =
      await Promise.all([
        supabase.from('clientes').select('id'),
        supabase.from('contratos').select('*, cliente:clientes(*)').order('created_at', { ascending: false }).limit(10),
        supabase.from('parcelas').select('valor, vencimento, status, pago_at'),
      ]);

    const clientes = clientesData || [];
    const contratos = (contratosData || []) as unknown as (Contrato & { cliente?: Cliente })[];
    const parcelas = parcelasData || [];

    const totalEmprestado = contratos.reduce((sum, c) => {
      // Only sum active contracts' total (not counting the recent 10 only, query all)
      return sum;
    }, 0);

    // Get all contracts for stats
    const { data: allContratos } = await supabase.from('contratos').select('valor_total, status');
    const allContratosList = allContratos || [];
    const totalEmp = allContratosList.reduce((sum, c) => sum + Number(c.valor_total), 0);

    const aReceber = parcelas
      .filter((p) => p.status !== 'pago')
      .reduce((sum, p) => sum + Number(p.valor) + Number((p as Record<string, unknown>).valor_multa || 0), 0);

    const emAtraso = parcelas.filter((p) => {
      if (p.status === 'pago') return false;
      return diasAtraso(p.vencimento) > 0;
    }).length;

    setStats({
      totalEmprestado: totalEmp,
      aReceber,
      emAtraso,
      totalClientes: clientes.length,
    });
    setContratos(contratos);

    // Monthly receipts chart - by day of current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const chartData: { dia: string; valor: number }[] = [];

    // Group paid parcels by day
    const dayTotals: Record<number, number> = {};
    parcelas.forEach((p) => {
      if (p.status === 'pago' && p.pago_at) {
        const d = new Date(p.pago_at);
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate();
          dayTotals[day] = (dayTotals[day] || 0) + Number(p.valor);
        }
      }
    });

    // Group by week for a cleaner chart
    const weeks = 4;
    const weekTotals: number[] = [0, 0, 0, 0];
    for (let day = 1; day <= daysInMonth; day++) {
      const weekIdx = Math.min(3, Math.floor((day - 1) / (daysInMonth / weeks)));
      weekTotals[weekIdx] += dayTotals[day] || 0;
    }

    const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    weekTotals.forEach((v, i) => {
      chartData.push({ dia: labels[i], valor: v });
    });

    setRecebimentosMes(chartData);
    setLoading(false);
  }

  const maxRecebimento = Math.max(...recebimentosMes.map((r) => r.valor), 1);

  function getContratoStatus(c: Contrato): { label: string; color: string } {
    if (c.status === 'quitado') return { label: 'Pago', color: 'text-emerald-400 bg-emerald-400/10' };
    if (c.status === 'cancelado') return { label: 'Cancelado', color: 'text-red-400 bg-red-400/10' };
    return { label: 'Ativo', color: 'text-[#FF6B00] bg-[#FF6B00]/10' };
  }

  const cards = [
    {
      label: 'Total Emprestado',
      value: formatMoeda(stats.totalEmprestado),
      icon: TrendingUp,
      trend: 'up',
      color: '#FF6B00',
    },
    {
      label: 'A Receber',
      value: formatMoeda(stats.aReceber),
      icon: Clock,
      trend: 'up',
      color: '#3B82F6',
    },
    {
      label: 'Em Atraso',
      value: String(stats.emAtraso),
      icon: AlertTriangle,
      trend: 'down',
      color: '#EF4444',
    },
    {
      label: 'Total de Clientes',
      value: String(stats.totalClientes),
      icon: Users,
      trend: 'up',
      color: '#10B981',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Visão geral dos seus empréstimos</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-[#151517] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${card.color}15` }}
                    >
                      <Icon size={22} style={{ color: card.color }} />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs font-medium ${
                        card.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {card.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                  </div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{card.label}</p>
                  <p className="text-xl lg:text-2xl font-bold">{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart */}
            <div className="lg:col-span-2 bg-[#151517] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-lg">Recebimentos do Mês</h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 h-48">
                {recebimentosMes.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B00] to-[#FF8533] transition-all duration-500 hover:opacity-80 relative group"
                        style={{
                          height: `${(r.valor / maxRecebimento) * 100}%`,
                          minHeight: r.valor > 0 ? '8px' : '2px',
                        }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium bg-[#222] px-2 py-1 rounded whitespace-nowrap">
                          {formatMoeda(r.valor)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-white/40">{r.dia}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick action */}
            <div className="bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-xl text-white mb-2">Novo Empréstimo</h2>
                <p className="text-white/80 text-sm">
                  Crie um novo contrato em 10 passos com cálculo automático de parcelas.
                </p>
              </div>
              <button
                onClick={() => onNavigate('novo-contrato')}
                className="mt-4 bg-white text-[#FF6B00] font-semibold py-3 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                <ArrowUpRight size={18} />
                Criar Contrato
              </button>
            </div>
          </div>

          {/* Recent contracts */}
          <div className="mt-8 bg-[#151517] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Contratos Recentes</h2>
              <button
                onClick={() => onNavigate('clientes')}
                className="text-[#FF6B00] text-sm font-medium hover:underline"
              >
                Ver todos
              </button>
            </div>
            {contratos.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <p>Nenhum contrato criado ainda.</p>
                <button
                  onClick={() => onNavigate('novo-contrato')}
                  className="mt-3 text-[#FF6B00] text-sm font-medium hover:underline"
                >
                  Criar primeiro contrato
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {contratos.map((c) => {
                  const status = getContratoStatus(c);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-all border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] font-bold text-sm shrink-0">
                          {(c.cliente?.nome || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.cliente?.nome || 'Cliente'}</p>
                          <p className="text-xs text-white/40">
                            {formatData(c.created_at)} • {c.num_parcelas}x
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">{formatMoeda(c.total_com_juros)}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
