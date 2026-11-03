import type { Cliente, Contrato, ParcelaCalculada } from './types';
import { formatMoeda, formatData, formatTelefone, formatCPF } from './format';

export function gerarPDFContrato(
  cliente: Cliente,
  contrato: Contrato,
  parcelas: ParcelaCalculada[],
): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const parcelasHTML = parcelas
    .map(
      (p, i) => `
      <tr class="${i % 2 === 0 ? 'bg-gray-50' : ''}">
        <td class="border border-gray-300 px-3 py-2 text-center">${p.numero}</td>
        <td class="border border-gray-300 px-3 py-2 text-right">${formatMoeda(p.valor)}</td>
        <td class="border border-gray-300 px-3 py-2 text-center">${formatData(p.vencimento)}</td>
        <td class="border border-gray-300 px-3 py-2 text-right">${formatMoeda(p.saldo_devedor)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Empréstimo - ${cliente.nome}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #FF6B00; padding-bottom: 20px; }
  .header h1 { color: #FF6B00; font-size: 28px; margin-bottom: 5px; }
  .header p { color: #666; font-size: 14px; }
  .section { margin-bottom: 25px; }
  .section h2 { font-size: 16px; color: #FF6B00; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-item { padding: 8px 12px; background: #f8f8f8; border-radius: 6px; }
  .info-item .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .info-item .value { font-size: 14px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { background: #FF6B00; color: white; padding: 8px 12px; text-align: center; border: 1px solid #FF6B00; }
  .totals { margin-top: 20px; text-align: right; }
  .totals .row { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 14px; }
  .totals .row.total { font-size: 18px; font-weight: bold; color: #FF6B00; border-top: 2px solid #FF6B00; padding-top: 10px; margin-top: 5px; }
  .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature { text-align: center; width: 45%; }
  .signature .line { border-top: 1px solid #333; margin-bottom: 5px; padding-top: 40px; }
  .signature p { font-size: 12px; color: #666; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>CREDFÁCIL</h1>
    <p>Contrato de Empréstimo Pessoal</p>
  </div>

  <div class="section">
    <h2>Dados do Cliente</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Nome</div><div class="value">${cliente.nome}</div></div>
      <div class="info-item"><div class="label">CPF</div><div class="value">${formatCPF(cliente.cpf)}</div></div>
      <div class="info-item"><div class="label">Telefone</div><div class="value">${formatTelefone(cliente.telefone)}</div></div>
      <div class="info-item"><div class="label">Cidade</div><div class="value">${cliente.cidade || '-'}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Condições do Empréstimo</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Valor Emprestado</div><div class="value">${formatMoeda(contrato.valor_total)}</div></div>
      <div class="info-item"><div class="label">Total com Juros</div><div class="value">${formatMoeda(contrato.total_com_juros)}</div></div>
      <div class="info-item"><div class="label">Juros (${contrato.juros_tipo === 'percent' ? '%' : 'R$'})</div><div class="value">${contrato.juros_tipo === 'percent' ? contrato.juros_valor + '%' : formatMoeda(contrato.juros_valor)}</div></div>
      <div class="info-item"><div class="label">Método</div><div class="value">${contrato.metodo_calculo === 'padrao' ? 'Padrão (Juros Simples)' : 'Jurista (Saldo Devedor)'}</div></div>
      <div class="info-item"><div class="label">Tipo</div><div class="value">${contrato.tipo === 'a_vista' ? 'À Vista' : 'Parcelado (' + contrato.num_parcelas + 'x)'}</div></div>
      <div class="info-item"><div class="label">Intervalo</div><div class="value">${contrato.intervalo}</div></div>
      <div class="info-item"><div class="label">1º Vencimento</div><div class="value">${formatData(contrato.primeiro_vencimento)}</div></div>
      <div class="info-item"><div class="label">Multa por Atraso</div><div class="value">${contrato.multa_tipo === 'nenhuma' ? 'Não cobrar' : contrato.multa_tipo === 'fixo_dia' ? formatMoeda(contrato.multa_valor) + '/dia' : contrato.multa_valor + '%/dia'}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Plano de Parcelas</h2>
    <table>
      <thead>
        <tr>
          <th>Parcela</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Saldo Devedor</th>
        </tr>
      </thead>
      <tbody>${parcelasHTML}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="row"><span>Valor Emprestado:</span><span>${formatMoeda(contrato.valor_total)}</span></div>
    <div class="row"><span>Total de Juros:</span><span>${formatMoeda(contrato.total_com_juros - contrato.valor_total)}</span></div>
    <div class="row total"><span>Total a Pagar:</span><span>${formatMoeda(contrato.total_com_juros)}</span></div>
  </div>

  ${contrato.observacao ? `<div class="section"><h2>Observações</h2><p style="font-size:13px; line-height:1.6;">${contrato.observacao}</p></div>` : ''}

  <div class="signatures">
    <div class="signature">
      <div class="line"></div>
      <p>${cliente.nome}</p>
      <p>Cliente</p>
    </div>
    <div class="signature">
      <div class="line"></div>
      <p>Credor</p>
    </div>
  </div>

  <div class="footer">
    <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} | CredFácil - Gestão de Empréstimos Pessoais</p>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export function gerarMensagemWhatsApp(
  cliente: Cliente,
  contrato: Contrato,
  parcelas: ParcelaCalculada[],
): string {
  let msg = `*CREDFÁCIL - CONTRATO DE EMPRÉSTIMO*\n\n`;
  msg += `*Cliente:* ${cliente.nome}\n`;
  msg += `*CPF:* ${formatCPF(cliente.cpf)}\n\n`;
  msg += `*Valor Emprestado:* ${formatMoeda(contrato.valor_total)}\n`;
  msg += `*Total com Juros:* ${formatMoeda(contrato.total_com_juros)}\n`;
  msg += `*Parcelas:* ${contrato.num_parcelas}x de ${formatMoeda(contrato.valor_parcela)}\n\n`;
  msg += `*Plano de Parcelas:*\n`;
  parcelas.forEach((p) => {
    msg += `${p.numero}. ${formatMoeda(p.valor)} - Venc: ${formatData(p.vencimento)}\n`;
  });
  msg += `\n_CredFácil - Gestão de Empréstimos_`;
  return encodeURIComponent(msg);
}

export function compartilharWhatsApp(
  cliente: Cliente,
  contrato: Contrato,
  parcelas: ParcelaCalculada[],
): void {
  const msg = gerarMensagemWhatsApp(cliente, contrato, parcelas);
  const telefone = cliente.telefone.replace(/\D/g, '');
  const url = `https://wa.me/${telefone}?text=${msg}`;
  window.open(url, '_blank');
}
