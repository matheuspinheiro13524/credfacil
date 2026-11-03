import { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, MapPin, FileText, ArrowLeft, Trash2, Users, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cliente, Contrato } from '@/lib/types';
import { formatMoeda, formatData, formatTelefone, formatCPF, validarCPF, validarTelefone } from '@/lib/format';

interface Props {
  onNavigate: (page: 'dashboard' | 'clientes' | 'novo-contrato') => void;
  onNewContractForClient?: (clienteId: string) => void;
}

export default function Clientes({ onNavigate, onNewContractForClient }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [importing, setImporting] = useState(false);

  // Form state
  const [form, setForm] = useState({ nome: '', telefone: '', cpf: '', cidade: '', observacao: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
    setClientes((data || []) as Cliente[]);
    setLoading(false);
  }

  function validarForm() {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!validarTelefone(form.telefone)) e.telefone = 'Telefone inválido (mínimo 10 dígitos com DDD)';
    if (!validarCPF(form.cpf)) e.cpf = 'CPF inválido (11 dígitos)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function salvarCliente() {
    if (!validarForm()) return;
    setSaving(true);
    const { data } = await supabase
      .from('clientes')
      .insert({
        nome: form.nome.trim(),
        telefone: form.telefone.replace(/\D/g, ''),
        cpf: form.cpf.replace(/\D/g, ''),
        cidade: form.cidade.trim(),
        observacao: form.observacao.trim(),
      })
      .select()
      .single();
    setSaving(false);
    if (data) {
      await loadClientes();
      setShowForm(false);
      setForm({ nome: '', telefone: '', cpf: '', cidade: '', observacao: '' });
    }
  }

  async function importarAgenda() {
    setImporting(true);
    // Simulated import - creates a few sample clients
    const clientesSimulados = [
      { nome: 'João Silva Santos', telefone: '11987654321', cpf: '12345678901', cidade: 'São Paulo', observacao: 'Importado da agenda' },
      { nome: 'Maria Oliveira Costa', telefone: '21998765432', cpf: '98765432109', cidade: 'Rio de Janeiro', observacao: 'Importado da agenda' },
      { nome: 'Carlos Eduardo Lima', telefone: '31987651234', cpf: '45678912345', cidade: 'Belo Horizonte', observacao: 'Importado da agenda' },
    ];

    for (const c of clientesSimulados) {
      await supabase.from('clientes').insert(c);
    }
    await loadClientes();
    setImporting(false);
  }

  async function excluirCliente(id: string) {
    if (!confirm('Excluir este cliente e todos os seus contratos?')) return;
    await supabase.from('clientes').delete().eq('id', id);
    await loadClientes();
    setClienteSelecionado(null);
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  if (clienteSelecionado) {
    return (
      <ClienteProfile
        cliente={clienteSelecionado}
        onBack={() => setClienteSelecionado(null)}
        onDelete={() => excluirCliente(clienteSelecionado.id)}
        onNewContract={() => {
          setClienteSelecionado(null);
          onNewContractForClient?.(clienteSelecionado.id);
        }}
      />
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-white/40 text-sm mt-1">Gerencie seus clientes e seus históricos</p>
      </div>

      {/* Search and actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#151517] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
          />
        </div>
        <button
          onClick={importarAgenda}
          disabled={importing}
          className="bg-[#151517] border border-white/5 rounded-xl px-5 py-3 text-sm font-medium hover:bg-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload size={18} />
          {importing ? 'Importando...' : 'Importar da Agenda'}
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#FF6B00] rounded-xl px-5 py-3 text-sm font-semibold hover:bg-[#FF7A1A] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-white/30" />
          </div>
          <p className="text-white/40 mb-4">
            {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </p>
          {!busca && (
            <button
              onClick={() => setShowForm(true)}
              className="text-[#FF6B00] text-sm font-medium hover:underline"
            >
              Cadastrar primeiro cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientesFiltrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setClienteSelecionado(c)}
              className="bg-[#151517] border border-white/5 rounded-2xl p-5 text-left hover:border-[#FF6B00]/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] font-bold text-lg shrink-0">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-[#FF6B00] transition-colors">
                    {c.nome}
                  </p>
                  <p className="text-xs text-white/40 truncate">{formatCPF(c.cpf)}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-white/30" />
                  {formatTelefone(c.telefone)}
                </div>
                {c.cidade && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-white/30" />
                    {c.cidade}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New client modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-[#151517] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Cliente</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  placeholder="Nome completo"
                />
                {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Telefone (com DDD) *</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  placeholder="(11) 98765-4321"
                />
                {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">CPF *</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && <p className="text-red-400 text-xs mt-1">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]/50 transition-colors resize-none"
                  placeholder="Notas sobre o cliente..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-white/5 rounded-xl py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCliente}
                disabled={saving}
                className="flex-1 bg-[#FF6B00] rounded-xl py-3 text-sm font-semibold hover:bg-[#FF7A1A] transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cliente Profile component
function ClienteProfile({
  cliente,
  onBack,
  onDelete,
  onNewContract,
}: {
  cliente: Cliente;
  onBack: () => void;
  onDelete: () => void;
  onNewContract: () => void;
}) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContratos();
  }, [cliente.id]);

  async function loadContratos() {
    setLoading(true);
    const { data } = await supabase
      .from('contratos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false });
    setContratos((data || []) as Contrato[]);
    setLoading(false);
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para clientes
      </button>

      {/* Header */}
      <div className="bg-[#151517] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] font-bold text-2xl shrink-0">
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold">{cliente.nome}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Phone size={14} /> {formatTelefone(cliente.telefone)}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={14} /> {formatCPF(cliente.cpf)}
              </span>
              {cliente.cidade && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {cliente.cidade}
                </span>
              )}
            </div>
          </div>
        </div>

        {cliente.observacao && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Observação</p>
            <p className="text-sm text-white/70">{cliente.observacao}</p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onNewContract}
            className="bg-[#FF6B00] rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#FF7A1A] transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            Novo Contrato
          </button>
          <button
            onClick={onDelete}
            className="bg-red-500/10 text-red-400 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </div>

      {/* Contract history */}
      <div className="bg-[#151517] border border-white/5 rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-4">Histórico de Contratos</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : contratos.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <p>Nenhum contrato para este cliente.</p>
            <button
              onClick={onNewContract}
              className="mt-3 text-[#FF6B00] text-sm font-medium hover:underline"
            >
              Criar primeiro contrato
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {contratos.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {formatMoeda(c.total_com_juros)} • {c.num_parcelas}x de {formatMoeda(c.valor_parcela)}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Criado em {formatData(c.created_at)} • 1º venc: {formatData(c.primeiro_vencimento)}
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium self-start ${
                    c.status === 'quitado'
                      ? 'text-emerald-400 bg-emerald-400/10'
                      : c.status === 'cancelado'
                        ? 'text-red-400 bg-red-400/10'
                        : 'text-[#FF6B00] bg-[#FF6B00]/10'
                  }`}
                >
                  {c.status === 'quitado' ? 'Quitado' : c.status === 'cancelado' ? 'Cancelado' : 'Ativo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
