/*
# Pagaê Clone - Schema for Loan Management

Creates the complete database schema for a personal loan management app (single-tenant, no auth).
Three tables: clientes, contratos, parcelas. RLS enabled with full CRUD for anon+authenticated.
*/

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  cpf text NOT NULL,
  cidade text DEFAULT '',
  observacao text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  juros_tipo text NOT NULL DEFAULT 'percent',
  juros_valor numeric(12,2) NOT NULL DEFAULT 0,
  metodo_calculo text NOT NULL DEFAULT 'padrao',
  tipo text NOT NULL DEFAULT 'parcelado',
  num_parcelas int NOT NULL DEFAULT 1,
  intervalo text NOT NULL DEFAULT 'mensal',
  primeiro_vencimento date NOT NULL DEFAULT CURRENT_DATE,
  multa_tipo text NOT NULL DEFAULT 'nenhuma',
  multa_valor numeric(12,2) NOT NULL DEFAULT 0,
  ignorar_feriados boolean NOT NULL DEFAULT false,
  ignorar_fds boolean NOT NULL DEFAULT false,
  observacao text DEFAULT '',
  comprovante_url text DEFAULT '',
  status text NOT NULL DEFAULT 'ativo',
  total_com_juros numeric(12,2) NOT NULL DEFAULT 0,
  valor_parcela numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON contratos TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_contratos" ON contratos;
CREATE POLICY "anon_select_contratos" ON contratos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contratos" ON contratos;
CREATE POLICY "anon_insert_contratos" ON contratos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contratos" ON contratos;
CREATE POLICY "anon_update_contratos" ON contratos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contratos" ON contratos;
CREATE POLICY "anon_delete_contratos" ON contratos FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero int NOT NULL DEFAULT 1,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  vencimento date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendente',
  pago_at timestamptz,
  valor_multa numeric(12,2) NOT NULL DEFAULT 0,
  saldo_devedor numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON parcelas TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_parcelas" ON parcelas;
CREATE POLICY "anon_select_parcelas" ON parcelas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_parcelas" ON parcelas;
CREATE POLICY "anon_insert_parcelas" ON parcelas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_parcelas" ON parcelas;
CREATE POLICY "anon_update_parcelas" ON parcelas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_parcelas" ON parcelas;
CREATE POLICY "anon_delete_parcelas" ON parcelas FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contrato_id ON parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
