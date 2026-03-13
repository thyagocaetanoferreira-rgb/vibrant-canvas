
-- Enum para tipos de serviço
CREATE TYPE tipo_servico AS ENUM ('Contábil', 'Jurídico', 'Auditoria', 'Compliance');

-- Tabela principal de clientes
CREATE TABLE clientes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio_id     INTEGER NOT NULL REFERENCES municipios(id),
  tipos_servico    tipo_servico[] NOT NULL DEFAULT '{}',
  status           BOOLEAN DEFAULT TRUE,
  link_sistema     TEXT,
  login_sistema    TEXT,
  senha_sistema    TEXT,
  criado_por       UUID REFERENCES usuarios(id),
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (municipio_id)
);

-- Trigger para atualizado_em
CREATE TRIGGER trg_clientes_atualizado_em
BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de auditoria
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  cliente_id UUID REFERENCES clientes(id),
  acao TEXT NOT NULL,
  detalhes JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dos clientes" ON clientes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserção de clientes" ON clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualização de clientes" ON clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- RLS para audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de audit_log" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserção de audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
