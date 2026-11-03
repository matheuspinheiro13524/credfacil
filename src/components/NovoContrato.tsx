import { useState, useEffect, useMemo } from 'react';
import {
  Search, UserPlus, ChevronLeft, ChevronRight, Check, X, Upload, FileText,
  Calendar, DollarSign, Percent, Calculator, CreditCard, Repeat, AlertCircle,
  PartyPopper, Share2, Save, Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cliente, ContratoForm, ParcelaCalculada, Contrato } from '@/lib/types';
import { calcularContrato } from '@/lib/calculator';
import { formatMoeda, formatData, formatTelefone, formatCPF, validarCPF, validarTelefone } from '@/lib/format';
import { gerarPDFContrato, compartilharWhatsApp } from '@/lib/pdf';

interface Props {
  preselectedClientId?: string;
  onNavigate: (page: 'dashboard' | 'clientes' | 'novo-contrato') => void;
}

const TOTAL_STEPS = 10;

const INTERVALOS: { value: ContratoForm['intervalo']; label: string }[] = [
  { value: 'diario', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'flexivel', label: 'Flexível' },
];

const MULTAS: { value: ContratoForm['multa_tipo']; label: string; desc: string }[] = [
  { value: 'nenhuma', label: 'Não cobrar', desc: 'Sem multa por atraso' },
  { value: 'fixo_dia', label: 'Valor fixo por dia', desc: 'Cobrar um valor fixo por cada dia de atraso' },
  { value: 'percent_dia', label: '% ao dia', desc: 'Percentual sobre o valor da parcela por dia' },
];

export default function NovoContrato({ preselectedClientId, onNavigate }: Props) {
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedContract, setSavedContract] = useState<{ contrato: Contrato; cliente: Cliente; parcelas: ParcelaCalculada[] } | null>(null);

  // New client form
  const [newClient, setNewClient] = useState({ nome: '', telefone: '', cpf: '', cidade: '', observacao: '' });
  const [newClientErrors, setNewClientErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<ContratoForm>({
    cliente_id: '',
    valor_total: 0,
    juros_tipo: 'percent',
    juros_valor: 0,
    metodo_calculo: 'padrao',
    tipo: 'parcelado',
    num_parcelas: 1,
    intervalo: 'mensal',
    primeiro_vencimento: today,
    multa_tipo: 'nenhuma',
    multa_valor: 0,
    ignorar_feriados: false,
    ignorar_fds: false,
    observacao: '',
    comprovante_url: '',
  });

  const [comprovantePreview, setComprovantePreview] = useState<string>('');

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (preselectedClientId) {
      setForm((f) => ({ ...f, cliente_id: preselectedClientId }));
    }
  }, [preselectedClientId]);

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
    setClientes((data || []) as Cliente[]);
  }

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase())),
    [clientes, busca],
  );

  const calculo = useMemo(() => {
    if (form.valor_total <= 0 || !form.primeiro_vencimento) return null;
    return calcularContrato(form);
  }, [form.valor_total, form.juros_tipo, form.juros_valor, form.metodo_calculo, form.tipo, form.num_parcelas, form.intervalo, form.primeiro_vencimento, form.ignorar_feriados, form.ignorar_fds, form]);

  function validarNewClient() {
    const e: Record<string, string> = {};
    if (!newClient.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!validarTelefone(newClient.telefone)) e.telefone = 'Telefone inválido';
    if (!validarCPF(newClient.cpf)) e.cpf = 'CPF inválido';
    setNewClientErrors(e);
    return Object.keys(e).length === 0;
  }

  async function salvarNewClient() {
    if (!validarNewClient()) return;
    const { data } = await supabase
      .from('clientes')
      .insert({
        nome: newClient.nome.trim(),
        telefone: newClient.telefone.replace(/\D/g, ''),
        cpf: newClient.cpf.replace(/\D/g, ''),
        cidade: newClient.cidade.trim(),
        observacao: newClient.observacao.trim(),
      })
      .select()
      .single();
    if (data) {
      await loadClientes();
      setForm({ ...form, cliente_id: (data as Cliente).id });
      setShowNewClient(false);
      setNewClient({ nome: '', telefone: '', cpf: '', cidade: '', observacao: '' });
    }
  }

  function handleComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setComprovantePreview(reader.result as string);
      setForm({ ...form, comprovante_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return !!form.cliente_id;
      case 2: return form.valor_total > 0;
      case 3: return form.juros_valor >= 0;
      case 4: return !!form.metodo_calculo;
      case 5: return form.tipo === 'a_vista' || form.num_parcelas >= 1;
      case 6: return !!form.intervalo;
      case 7: return !!form.primeiro_vencimento;
      case 8: return !!form.multa_tipo && (form.multa_tipo === 'nenhuma' || form.multa_valor > 0);
      case 9: return true;
      case 10: return true;
      default: return false;
    }
  }

  async function salvarContrato() {
    if (!calculo || !form.cliente_id) return;
    setSaving(true);

    const cliente = clientes.find((c) => c.id === form.cliente_id);
    if (!cliente) {
      setSaving(false);
      return;
    }

    const { data: contratoData } = await supabase
      .from('contratos')
      .insert({
        cliente_id: form.cliente_id,
        valor_total: form.valor_total,
        juros_tipo: form.juros_tipo,
        juros_valor: form.juros_valor,
        metodo_calculo: form.metodo_calculo,
        tipo: form.tipo,
        num_parcelas: form.tipo === 'a_vista' ? 1 : form.num_parcelas,
        intervalo: form.intervalo,
        primeiro_vencimento: form.primeiro_vencimento,
        multa_tipo: form.multa_tipo,
        multa_valor: form.multa_valor,
        ignorar_feriados: form.ignorar_feriados,
        ignorar_fds: form.ignorar_fds,
        observacao: form.observacao,
        comprovante_url: form.comprovante_url,
        status: 'ativo',
        total_com_juros: calculo.totalComJuros,
        valor_parcela: calculo.valorParcela,
      })
      .select()
      .single();

    if (contratoData) {
      const parcelasInsert = calculo.parcelas.map((p) => ({
        contrato_id: (contratoData as Contrato).id,
        numero: p.numero,
        valor: p.valor,
        vencimento: p.vencimento,
        status: 'pendente',
        saldo_devedor: p.saldo_devedor,
      }));

      await supabase.from('parcelas').insert(parcelasInsert);

      const contratoCompleto = contratoData as Contrato;
      setSavedContract({ contrato: contratoCompleto, cliente, parcelas: calculo.parcelas });
    }

    setSaving(false);
  }

  // Success screen
  if (savedContract) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-[#151517] border border-white/5 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Contrato Criado!</h1>
          <p className="text-white/50 text-sm mb-8">
            O contrato foi salvo com sucesso. As {savedContract.parcelas.length} parcelas foram geradas automaticamente.
          </p>

          <div className="bg-white/[0.02] rounded-xl p-5 text-left mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase mb-1">Cliente</p>
                <p className="font-medium">{savedContract.cliente.nome}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase mb-1">Total</p>
                <p className="font-medium">{formatMoeda(savedContract.contrato.total_com_juros)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase mb-1">Parcelas</p>
                <p className="font-medium">{savedContract.parcelas.length}x de {formatMoeda(savedContract.contrato.valor_parcela)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase mb-1">1º Vencimento</p>
                <p className="font-medium">{formatData(savedContract.contrato.primeiro_vencimento)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => gerarPDFContrato(savedContract.cliente, savedContract.contrato, savedContract.parcelas)}
              className="bg-white/5 rounded-xl py-3 px-4 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Gerar PDF
            </button>
            <button
              onClick={() => compartilharWhatsApp(savedContract.cliente, savedContract.contrato, savedContract.parcelas)}
              className="bg-[#25D366] rounded-xl py-3 px-4 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              WhatsApp
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-[#FF6B00] rounded-xl py-3 px-4 text-sm font-semibold hover:bg-[#FF7A1A] transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Concluir
            </button>
          </div>

          <button
            onClick={() => onNavigate('clientes')}
            className="text-white/40 text-sm hover:text-white/70 transition-colors"
          >
            Ver todos os clientes
          </button>
        </div>
      </div>
    );
  }

  const stepIcons = [Search, DollarSign, Percent, Calculator, CreditCard, Repeat, Calendar, AlertCircle, Check, FileText];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Novo Contrato</h1>
        <p className="text-white/40 text-sm mt-1">Crie um contrato de empréstimo em {TOTAL_STEPS} passos</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/40">Passo {step} de {TOTAL_STEPS}</span>
          <span className="text-xs font-medium text-[#FF6B00]">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= step ? 'bg-[#FF6B00]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-[#151517] border border-white/5 rounded-2xl p-6 lg:p-8">
        {/* Step content */}
        <div className="mb-8 min-h-[280px]">
          {renderStep()}
        </div>

        {/* Live calculation preview */}
        {calculo && step >= 5 && (
          <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-4 mb-6">
            <p className="text-xs text-[#FF6B00] uppercase tracking-wide font-medium mb-2">Prévia do Cálculo</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs">Total c/ Juros</p>
                <p className="font-bold">{formatMoeda(calculo.totalComJuros)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Juros</p>
                <p className="font-bold">{formatMoeda(calculo.totalJuros)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Parcelas</p>
                <p className="font-bold">{calculo.parcelas.length}x</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">1ª Parcela</p>
                <p className="font-bold">{formatMoeda(calculo.parcelas[0]?.valor || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => (step === 1 ? onNavigate('dashboard') : setStep(step - 1))}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors px-4 py-2"
          >
            <ChevronLeft size={18} />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 bg-[#FF6B00] rounded-xl px-6 py-3 text-sm font-semibold hover:bg-[#FF7A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={salvarContrato}
              disabled={saving || !calculo}
              className="flex items-center gap-2 bg-emerald-500 rounded-xl px-6 py-3 text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-30"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Contrato'}
            </button>
          )}
        </div>
      </div>

      {/* New client modal */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewClient(false)}>
          <div className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Cliente</h2>
              <button onClick={() => setShowNewClient(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Nome *</label>
                <input type="text" value={newClient.nome} onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50" placeholder="Nome completo" />
                {newClientErrors.nome && <p className="text-red-400 text-xs mt-1">{newClientErrors.nome}</p>}
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Telefone (com DDD) *</label>
                <input type="tel" value={newClient.telefone} onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50" placeholder="(11) 98765-4321" />
                {newClientErrors.telefone && <p className="text-red-400 text-xs mt-1">{newClientErrors.telefone}</p>}
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">CPF *</label>
                <input type="text" value={newClient.cpf} onChange={(e) => setNewClient({ ...newClient, cpf: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50" placeholder="000.000.000-00" />
                {newClientErrors.cpf && <p className="text-red-400 text-xs mt-1">{newClientErrors.cpf}</p>}
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Cidade</label>
                <input type="text" value={newClient.cidade} onChange={(e) => setNewClient({ ...newClient, cidade: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50" placeholder="Cidade" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Observação</label>
                <textarea value={newClient.observacao} onChange={(e) => setNewClient({ ...newClient, observacao: e.target.value })} rows={2}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 resize-none" placeholder="Notas..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewClient(false)} className="flex-1 bg-white/5 rounded-xl py-3 text-sm font-medium hover:bg-white/10">Cancelar</button>
              <button onClick={salvarNewClient} className="flex-1 bg-[#FF6B00] rounded-xl py-3 text-sm font-semibold hover:bg-[#FF7A1A]">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderStep() {
    const Icon = stepIcons[step - 1];

    switch (step) {
      case 1:
        return (
          <StepWrapper icon={Icon} title="Selecionar Cliente" subtitle="Escolha um cliente ou cadastre um novo">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50" />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {clientesFiltrados.length === 0 ? (
                <p className="text-center text-white/30 py-6 text-sm">Nenhum cliente encontrado</p>
              ) : (
                clientesFiltrados.map((c) => (
                  <button key={c.id} onClick={() => setForm({ ...form, cliente_id: c.id })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      form.cliente_id === c.id ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}>
                    <div className="w-10 h-10 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] font-bold shrink-0">
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.nome}</p>
                      <p className="text-xs text-white/40">{formatTelefone(c.telefone)} • {formatCPF(c.cpf)}</p>
                    </div>
                    {form.cliente_id === c.id && <Check size={18} className="text-[#FF6B00] shrink-0" />}
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setShowNewClient(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 rounded-xl py-3 text-sm font-medium hover:bg-white/10 transition-colors">
              <UserPlus size={18} /> Novo Cliente
            </button>
          </StepWrapper>
        );

      case 2:
        return (
          <StepWrapper icon={Icon} title="Valor Total Emprestado" subtitle="Quanto você está emprestando? (sem juros)">
            <div className="max-w-xs">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg font-medium">R$</span>
                <input type="number" min="0" step="0.01" value={form.valor_total || ''} onChange={(e) => setForm({ ...form, valor_total: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-2xl font-bold focus:outline-none focus:border-[#FF6B00]/50"
                  placeholder="0,00" />
              </div>
              {form.valor_total > 0 && (
                <p className="mt-3 text-sm text-white/50">
                  Valor emprestado: <span className="text-white font-medium">{formatMoeda(form.valor_total)}</span>
                </p>
              )}
            </div>
          </StepWrapper>
        );

      case 3:
        return (
          <StepWrapper icon={Icon} title="Juros" subtitle="Defina como cobrar juros sobre o empréstimo">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setForm({ ...form, juros_tipo: 'percent' })}
                className={`p-5 rounded-xl border transition-all ${form.juros_tipo === 'percent' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <Percent size={24} className={form.juros_tipo === 'percent' ? 'text-[#FF6B00]' : 'text-white/30'} />
                <p className="font-semibold mt-2 text-sm">Percentual (%)</p>
                <p className="text-xs text-white/40 mt-1">Cobrar juros em %</p>
              </button>
              <button onClick={() => setForm({ ...form, juros_tipo: 'fixed' })}
                className={`p-5 rounded-xl border transition-all ${form.juros_tipo === 'fixed' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <DollarSign size={24} className={form.juros_tipo === 'fixed' ? 'text-[#FF6B00]' : 'text-white/30'} />
                <p className="font-semibold mt-2 text-sm">Valor Fixo (R$)</p>
                <p className="text-xs text-white/40 mt-1">Cobrar valor em reais</p>
              </button>
            </div>
            <div className="max-w-xs">
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">
                {form.juros_tipo === 'percent' ? 'Juros (%)' : 'Juros (R$)'}
              </label>
              <div className="relative">
                {form.juros_tipo === 'fixed' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">R$</span>}
                <input type="number" min="0" step="0.01" value={form.juros_valor || ''}
                  onChange={(e) => setForm({ ...form, juros_valor: parseFloat(e.target.value) || 0 })}
                  className={`w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-3 text-lg font-bold focus:outline-none focus:border-[#FF6B00]/50 ${form.juros_tipo === 'fixed' ? 'pl-12' : 'pl-4'} pr-4`}
                  placeholder="0" />
                {form.juros_tipo === 'percent' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">%</span>}
              </div>
              {form.valor_total > 0 && form.juros_valor > 0 && (
                <p className="mt-3 text-sm text-white/50">
                  Juros: <span className="text-white font-medium">
                    {form.juros_tipo === 'percent'
                      ? formatMoeda((form.valor_total * form.juros_valor) / 100)
                      : formatMoeda(form.juros_valor)}
                  </span>
                </p>
              )}
            </div>
          </StepWrapper>
        );

      case 4:
        return (
          <StepWrapper icon={Icon} title="Método de Cálculo" subtitle="Como os juros serão aplicados">
            <div className="space-y-3">
              <button onClick={() => setForm({ ...form, metodo_calculo: 'padrao' })}
                className={`w-full p-5 rounded-xl border transition-all text-left ${form.metodo_calculo === 'padrao' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 ${form.metodo_calculo === 'padrao' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-white/20'}`} />
                  <div>
                    <p className="font-semibold text-sm">Padrão (Juros Simples)</p>
                    <p className="text-xs text-white/40 mt-1">Juros calculados sobre o valor total. Parcelas iguais.</p>
                  </div>
                </div>
              </button>
              <button onClick={() => setForm({ ...form, metodo_calculo: 'jurista' })}
                className={`w-full p-5 rounded-xl border transition-all text-left ${form.metodo_calculo === 'jurista' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 ${form.metodo_calculo === 'jurista' ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-white/20'}`} />
                  <div>
                    <p className="font-semibold text-sm">Jurista (Saldo Devedor)</p>
                    <p className="text-xs text-white/40 mt-1">Juros sobre saldo devedor. Parcelas decrescentes.</p>
                  </div>
                </div>
              </button>
            </div>
          </StepWrapper>
        );

      case 5:
        return (
          <StepWrapper icon={Icon} title="Tipo de Pagamento" subtitle="À vista ou parcelado?">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setForm({ ...form, tipo: 'a_vista', num_parcelas: 1 })}
                className={`p-5 rounded-xl border transition-all ${form.tipo === 'a_vista' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <DollarSign size={24} className={form.tipo === 'a_vista' ? 'text-[#FF6B00]' : 'text-white/30'} />
                <p className="font-semibold mt-2 text-sm">À Vista</p>
                <p className="text-xs text-white/40 mt-1">1 pagamento único</p>
              </button>
              <button onClick={() => setForm({ ...form, tipo: 'parcelado', num_parcelas: Math.max(2, form.num_parcelas) })}
                className={`p-5 rounded-xl border transition-all ${form.tipo === 'parcelado' ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                <CreditCard size={24} className={form.tipo === 'parcelado' ? 'text-[#FF6B00]' : 'text-white/30'} />
                <p className="font-semibold mt-2 text-sm">Parcelado</p>
                <p className="text-xs text-white/40 mt-1">Múltiplas parcelas</p>
              </button>
            </div>
            {form.tipo === 'parcelado' && (
              <div className="max-w-xs">
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Quantidade de Parcelas</label>
                <input type="number" min="2" max="360" value={form.num_parcelas} onChange={(e) => setForm({ ...form, num_parcelas: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-[#FF6B00]/50" />
              </div>
            )}
          </StepWrapper>
        );

      case 6:
        return (
          <StepWrapper icon={Icon} title="Intervalo entre Parcelas" subtitle="Com que frequência serão as cobranças?">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {INTERVALOS.map((opt) => (
                <button key={opt.value} onClick={() => setForm({ ...form, intervalo: opt.value })}
                  className={`p-4 rounded-xl border transition-all ${form.intervalo === opt.value ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                  <Repeat size={20} className={form.intervalo === opt.value ? 'text-[#FF6B00]' : 'text-white/30'} />
                  <p className="font-medium text-sm mt-2">{opt.label}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        );

      case 7:
        return (
          <StepWrapper icon={Icon} title="Data do Primeiro Vencimento" subtitle="Quando vence a primeira parcela?">
            <div className="max-w-xs">
              <input type="date" value={form.primeiro_vencimento} onChange={(e) => setForm({ ...form, primeiro_vencimento: e.target.value })}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-[#FF6B00]/50 [color-scheme:dark]" />
              <p className="mt-3 text-sm text-white/50">
                Data selecionada: <span className="text-white font-medium">{formatData(form.primeiro_vencimento)}</span>
              </p>
            </div>
          </StepWrapper>
        );

      case 8:
        return (
          <StepWrapper icon={Icon} title="Multa por Atraso" subtitle="Defina a penalidade para pagamentos atrasados">
            <div className="space-y-3 mb-4">
              {MULTAS.map((opt) => (
                <button key={opt.value} onClick={() => setForm({ ...form, multa_tipo: opt.value, multa_valor: opt.value === 'nenhuma' ? 0 : form.multa_valor })}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${form.multa_tipo === opt.value ? 'bg-[#FF6B00]/10 border-[#FF6B00]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 ${form.multa_tipo === opt.value ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-white/20'}`} />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-white/40">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {form.multa_tipo !== 'nenhuma' && (
              <div className="max-w-xs">
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">
                  {form.multa_tipo === 'fixo_dia' ? 'Valor por dia (R$)' : 'Percentual por dia (%)'}
                </label>
                <div className="relative">
                  {form.multa_tipo === 'fixo_dia' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">R$</span>}
                  <input type="number" min="0" step="0.01" value={form.multa_valor || ''} onChange={(e) => setForm({ ...form, multa_valor: parseFloat(e.target.value) || 0 })}
                    className={`w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-3 font-bold focus:outline-none focus:border-[#FF6B00]/50 ${form.multa_tipo === 'fixo_dia' ? 'pl-12' : 'pl-4'} pr-4`}
                    placeholder="0" />
                  {form.multa_tipo === 'percent_dia' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">%</span>}
                </div>
              </div>
            )}
          </StepWrapper>
        );

      case 9:
        return (
          <StepWrapper icon={Icon} title="Opções de Vencimento" subtitle="Ajuste as datas para evitar feriados e fins de semana">
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/10 transition-all">
                <input type="checkbox" checked={form.ignorar_feriados} onChange={(e) => setForm({ ...form, ignorar_feriados: e.target.checked })}
                  className="w-5 h-5 rounded accent-[#FF6B00]" />
                <div>
                  <p className="font-medium text-sm">Ignorar feriados nacionais</p>
                  <p className="text-xs text-white/40">Vencimentos não caem em feriados nacionais</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/10 transition-all">
                <input type="checkbox" checked={form.ignorar_fds} onChange={(e) => setForm({ ...form, ignorar_fds: e.target.checked })}
                  className="w-5 h-5 rounded accent-[#FF6B00]" />
                <div>
                  <p className="font-medium text-sm">Ignorar sábado e domingo</p>
                  <p className="text-xs text-white/40">Vencimentos não caem em fins de semana</p>
                </div>
              </label>
            </div>
          </StepWrapper>
        );

      case 10:
        return (
          <StepWrapper icon={Icon} title="Observação e Comprovante" subtitle="Adicione notas e o comprovante Pix">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Observação</label>
                <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} rows={3}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 resize-none"
                  placeholder="Notas sobre o contrato..." />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Comprovante Pix (imagem)</label>
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-[#0A0A0B] border border-dashed border-white/10 cursor-pointer hover:border-[#FF6B00]/50 transition-colors">
                  {comprovantePreview ? (
                    <img src={comprovantePreview} alt="Comprovante" className="max-h-48 rounded-lg" />
                  ) : (
                    <>
                      <Upload size={24} className="text-white/30" />
                      <p className="text-sm text-white/40">Clique para enviar uma imagem</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleComprovante} className="hidden" />
                </label>
                {comprovantePreview && (
                  <button onClick={() => { setComprovantePreview(''); setForm({ ...form, comprovante_url: '' }); }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300">Remover imagem</button>
                )}
              </div>

              {/* Summary */}
              {calculo && (
                <div className="bg-white/[0.02] rounded-xl p-4 mt-4">
                  <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Resumo Final</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-white/50">Cliente</span><span className="font-medium">{clientes.find((c) => c.id === form.cliente_id)?.nome}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Valor emprestado</span><span className="font-medium">{formatMoeda(form.valor_total)}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Juros</span><span className="font-medium">{formatMoeda(calculo.totalJuros)}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Método</span><span className="font-medium">{form.metodo_calculo === 'padrao' ? 'Padrão' : 'Jurista'}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Parcelas</span><span className="font-medium">{calculo.parcelas.length}x</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-2 text-base"><span className="font-medium">Total a pagar</span><span className="font-bold text-[#FF6B00]">{formatMoeda(calculo.totalComJuros)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </StepWrapper>
        );

      default:
        return null;
    }
  }
}

function StepWrapper({ icon: Icon, title, subtitle, children }: { icon: typeof Search; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
          <Icon size={20} className="text-[#FF6B00]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-white/40">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
