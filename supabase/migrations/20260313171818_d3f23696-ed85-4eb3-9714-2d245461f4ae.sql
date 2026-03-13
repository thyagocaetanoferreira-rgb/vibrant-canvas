
-- Enum de perfis
CREATE TYPE public.tipo_perfil AS ENUM (
  'Administrador',
  'Auxiliar',
  'Comercial',
  'Coordenador',
  'Juridico',
  'Suporte'
);

-- Tabela de módulos do sistema
CREATE TABLE public.modulos (
  id        SERIAL PRIMARY KEY,
  chave     TEXT NOT NULL UNIQUE,
  nome      TEXT NOT NULL,
  descricao TEXT,
  ordem     INTEGER DEFAULT 0
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dos módulos"
  ON public.modulos FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed de módulos
INSERT INTO public.modulos (chave, nome, descricao, ordem) VALUES
  ('dashboard',         'Dashboard',              'Painel de indicadores e resumo fiscal', 1),
  ('lancamentos',       'Lançamentos Mensais',    'Cadastro de dados fiscais mensais por município', 2),
  ('relatorios',        'Relatórios',             'Geração e visualização de relatórios fiscais', 3),
  ('municipios',        'Municípios',             'Cadastro e gestão de municípios', 4),
  ('usuarios',          'Usuários',               'Cadastro e gestão de usuários do sistema', 5),
  ('agenda',            'Agenda',                 'Calendário de visitas, reuniões e diligências', 6),
  ('controle_envios',   'Controle de Envios',     'Monitoramento de entregas TCM-GO e Siconfi', 7),
  ('demandas',          'Gestão de Demandas',     'Tarefas, suporte e fórum interno', 8),
  ('juridico',          'Jurídico',               'Diligências, julgamento de contas e processos', 9),
  ('gestao_riscos',     'Gestão de Riscos',       'Mapeamento de riscos fiscais e CAUC', 10),
  ('visitas',           'Visitas',                'Controle de viagens e visitas a clientes', 11),
  ('gente_gestao',      'Gente e Gestão',         'Férias e gestão de pessoas', 12),
  ('financeiro',        'Financeiro',             'Controle de faturamento da empresa', 13);

-- Tabela de permissões por perfil (template)
CREATE TABLE public.permissoes_perfil (
  id          SERIAL PRIMARY KEY,
  perfil      public.tipo_perfil NOT NULL,
  modulo_id   INTEGER NOT NULL REFERENCES public.modulos(id),
  pode_ver    BOOLEAN DEFAULT FALSE,
  pode_criar  BOOLEAN DEFAULT FALSE,
  pode_editar BOOLEAN DEFAULT FALSE,
  pode_excluir BOOLEAN DEFAULT FALSE,
  UNIQUE (perfil, modulo_id)
);

ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das permissões de perfil"
  ON public.permissoes_perfil FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed permissões: ADMINISTRADOR (acesso total)
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT 'Administrador', id, TRUE, TRUE, TRUE, TRUE FROM public.modulos;

-- COORDENADOR
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir) VALUES
  ('Coordenador', 1,  TRUE,  FALSE, FALSE, FALSE),
  ('Coordenador', 2,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 3,  TRUE,  TRUE,  FALSE, FALSE),
  ('Coordenador', 4,  TRUE,  FALSE, FALSE, FALSE),
  ('Coordenador', 5,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 6,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 7,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 8,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 9,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 10, TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 11, TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 12, TRUE,  TRUE,  TRUE,  FALSE),
  ('Coordenador', 13, TRUE,  FALSE, FALSE, FALSE);

-- AUXILIAR
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir) VALUES
  ('Auxiliar', 1,  TRUE,  FALSE, FALSE, FALSE),
  ('Auxiliar', 2,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Auxiliar', 3,  TRUE,  FALSE, FALSE, FALSE),
  ('Auxiliar', 4,  FALSE, FALSE, FALSE, FALSE),
  ('Auxiliar', 5,  FALSE, FALSE, FALSE, FALSE),
  ('Auxiliar', 6,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Auxiliar', 7,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Auxiliar', 8,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Auxiliar', 9,  FALSE, FALSE, FALSE, FALSE),
  ('Auxiliar', 10, TRUE,  FALSE, FALSE, FALSE),
  ('Auxiliar', 11, TRUE,  TRUE,  FALSE, FALSE),
  ('Auxiliar', 12, TRUE,  TRUE,  FALSE, FALSE),
  ('Auxiliar', 13, FALSE, FALSE, FALSE, FALSE);

-- JURÍDICO
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir) VALUES
  ('Juridico', 1,  TRUE,  FALSE, FALSE, FALSE),
  ('Juridico', 2,  FALSE, FALSE, FALSE, FALSE),
  ('Juridico', 3,  TRUE,  FALSE, FALSE, FALSE),
  ('Juridico', 4,  FALSE, FALSE, FALSE, FALSE),
  ('Juridico', 5,  FALSE, FALSE, FALSE, FALSE),
  ('Juridico', 6,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Juridico', 7,  FALSE, FALSE, FALSE, FALSE),
  ('Juridico', 8,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Juridico', 9,  TRUE,  TRUE,  TRUE,  TRUE),
  ('Juridico', 10, TRUE,  TRUE,  TRUE,  FALSE),
  ('Juridico', 11, TRUE,  FALSE, FALSE, FALSE),
  ('Juridico', 12, FALSE, FALSE, FALSE, FALSE),
  ('Juridico', 13, FALSE, FALSE, FALSE, FALSE);

-- SUPORTE
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir) VALUES
  ('Suporte', 1,  TRUE,  FALSE, FALSE, FALSE),
  ('Suporte', 2,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 3,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 4,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 5,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 6,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Suporte', 7,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 8,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Suporte', 9,  FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 10, FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 11, TRUE,  FALSE, FALSE, FALSE),
  ('Suporte', 12, FALSE, FALSE, FALSE, FALSE),
  ('Suporte', 13, FALSE, FALSE, FALSE, FALSE);

-- COMERCIAL
INSERT INTO public.permissoes_perfil (perfil, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir) VALUES
  ('Comercial', 1,  TRUE,  FALSE, FALSE, FALSE),
  ('Comercial', 2,  FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 3,  TRUE,  TRUE,  FALSE, FALSE),
  ('Comercial', 4,  TRUE,  FALSE, FALSE, FALSE),
  ('Comercial', 5,  FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 6,  TRUE,  TRUE,  TRUE,  FALSE),
  ('Comercial', 7,  FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 8,  FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 9,  FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 10, FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 11, TRUE,  TRUE,  TRUE,  FALSE),
  ('Comercial', 12, FALSE, FALSE, FALSE, FALSE),
  ('Comercial', 13, TRUE,  FALSE, FALSE, FALSE);

-- Tabela de usuários
CREATE TABLE public.usuarios (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id        UUID UNIQUE,
  nome           TEXT NOT NULL,
  username       TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  telefone       TEXT,
  foto_url       TEXT,
  perfil         public.tipo_perfil NOT NULL,
  municipio_id   BIGINT NOT NULL REFERENCES public.municipios(id),
  ativo          BOOLEAN DEFAULT TRUE,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública dos usuários"
  ON public.usuarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Inserção de usuários autenticados"
  ON public.usuarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Atualização de usuários autenticados"
  ON public.usuarios FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de permissões individuais por usuário
CREATE TABLE public.permissoes_usuario (
  id           SERIAL PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  modulo_id    INTEGER NOT NULL REFERENCES public.modulos(id),
  pode_ver     BOOLEAN DEFAULT FALSE,
  pode_criar   BOOLEAN DEFAULT FALSE,
  pode_editar  BOOLEAN DEFAULT FALSE,
  pode_excluir BOOLEAN DEFAULT FALSE,
  UNIQUE (usuario_id, modulo_id)
);

ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das permissões de usuário"
  ON public.permissoes_usuario FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Inserção de permissões"
  ON public.permissoes_usuario FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Atualização de permissões"
  ON public.permissoes_usuario FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Exclusão de permissões"
  ON public.permissoes_usuario FOR DELETE
  TO anon, authenticated
  USING (true);

-- Função para copiar permissões do perfil para o usuário
CREATE OR REPLACE FUNCTION public.copiar_permissoes_perfil(
  p_usuario_id UUID,
  p_perfil public.tipo_perfil
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM permissoes_usuario WHERE usuario_id = p_usuario_id;
  INSERT INTO permissoes_usuario (usuario_id, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir)
  SELECT p_usuario_id, modulo_id, pode_ver, pode_criar, pode_editar, pode_excluir
  FROM permissoes_perfil
  WHERE perfil = p_perfil;
END;
$$;

-- Trigger para atualizar atualizado_em
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
