-- Capa (banner no topo, tipo Facebook) e descrição pro cliente ver — cor de
-- fundo já cabe dentro de barbearias.tema (jsonb), sem precisar de coluna.
alter table barbearias add column if not exists capa_url text;
alter table barbearias add column if not exists descricao text;
