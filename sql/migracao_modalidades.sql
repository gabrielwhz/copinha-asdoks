-- =====================================================================
-- MIGRAÇÃO: um atleta = UMA linha, com Kata e/ou Kumitê
-- Preserva todos os dados. Cria cópias de segurança antes de mexer.
--
-- ORDEM: 1) rode a PRÉVIA (parte A)  2) rode a MIGRAÇÃO (parte B)
--        3) logo em seguida, publique os arquivos novos do site no GitHub.
-- (Entre o passo 2 e o 3 o site antigo fica fora do ar por alguns minutos.
--  Faça fora do horário de uso.)
-- =====================================================================


-- ================= PARTE A - PRÉVIA (não altera nada) =================
-- Mostra quais cadastros serão unidos: mesmo cadastrador, nome, sexo, idade, faixa e academia,
-- um em categoria de Kata e outro em categoria de Kumitê.
with base as (
  select id, nome, created_by, lower(btrim(nome)) n, sexo, idade, grad,
         lower(btrim(coalesce(acad,''))) a, cod,
         case when cod <= 14 then 'kata' else 'kumite' end m, created_at
  from public.atletas
), r as (
  select *, row_number() over (partition by created_by, n, sexo, idade, grad, a, m order by created_at, id) rn
  from base
)
select k.nome, k.idade, k.grad, k.cod as cod_kata, u.cod as cod_kumite
from r k join r u
  on k.created_by = u.created_by and k.n = u.n and k.sexo = u.sexo and k.idade = u.idade
 and k.grad = u.grad and k.a = u.a and k.rn = u.rn and k.m = 'kata' and u.m = 'kumite'
order by k.nome;
-- Resultado vazio = ninguém estava cadastrado nas duas. Tudo bem, a migração segue normalmente.


-- ================= PARTE B - MIGRAÇÃO (rode só depois da prévia) ======
begin;

-- 1) Cópias de segurança (ficam bloqueadas para o site: RLS ligado e sem política)
create table public.atletas_backup_v1 as table public.atletas;
create table public.chaves_backup_v1  as table public.chaves;
alter table public.atletas_backup_v1 enable row level security;
alter table public.chaves_backup_v1  enable row level security;

-- 2) Desliga o gatilho que apaga chaves, para a migração não apagar sorteios
alter table public.atletas disable trigger atletas_limpa_chave;

-- 3) Novas colunas: categoria de Kata e categoria de Kumitê (qualquer uma pode ficar vazia)
alter table public.atletas add column kata_cod int, add column kumite_cod int;
update public.atletas set kata_cod   = cod where cod between 1 and 14;
update public.atletas set kumite_cod = cod where cod between 15 and 32;

-- 4) Une os cadastros duplicados (Kata + Kumitê da mesma pessoa) em uma linha só
create temp table _par as
with base as (
  select id, created_by, lower(btrim(nome)) n, sexo, idade, grad,
         lower(btrim(coalesce(acad,''))) a,
         case when kata_cod is not null then 'kata' else 'kumite' end m, created_at
  from public.atletas
), r as (
  select *, row_number() over (partition by created_by, n, sexo, idade, grad, a, m order by created_at, id) rn
  from base
)
select k.id as keep_id, u.id as drop_id
from r k join r u
  on k.created_by = u.created_by and k.n = u.n and k.sexo = u.sexo and k.idade = u.idade
 and k.grad = u.grad and k.a = u.a and k.rn = u.rn and k.m = 'kata' and u.m = 'kumite';

update public.atletas a
   set kumite_cod = d.kumite_cod
  from _par p join public.atletas d on d.id = p.drop_id
 where a.id = p.keep_id;

-- as chaves já sorteadas passam a apontar para o cadastro que ficou
do $$
declare r record;
begin
  for r in select keep_id, drop_id from _par loop
    update public.chaves
       set pares = replace(pares::text, '"' || r.drop_id || '"', '"' || r.keep_id || '"')::jsonb
     where pares::text like '%' || r.drop_id || '%';
  end loop;
end $$;

delete from public.atletas where id in (select drop_id from _par);

-- 5) A coluna antiga "cod" fica guardada como "cod_antigo" (pode apagar depois, se quiser)
alter table public.atletas rename column cod to cod_antigo;
alter table public.atletas alter column cod_antigo drop not null;

-- 6) Regras novas
alter table public.atletas
  add constraint atletas_modalidade_chk check (kata_cod is not null or kumite_cod is not null),
  add constraint atletas_kata_chk       check (kata_cod   is null or kata_cod   between 1  and 14),
  add constraint atletas_kumite_chk     check (kumite_cod is null or kumite_cod between 15 and 32);

-- 7) Gatilho novo: se o atleta muda de categoria, só as chaves afetadas são apagadas
create or replace function public.limpar_chave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.chaves where cod in (old.kata_cod, old.kumite_cod);
  elsif tg_op = 'INSERT' then
    delete from public.chaves where cod in (new.kata_cod, new.kumite_cod);
  else
    if new.kata_cod is distinct from old.kata_cod then
      delete from public.chaves where cod in (old.kata_cod, new.kata_cod);
    end if;
    if new.kumite_cod is distinct from old.kumite_cod then
      delete from public.chaves where cod in (old.kumite_cod, new.kumite_cod);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists atletas_limpa_chave on public.atletas;
create trigger atletas_limpa_chave
after insert or delete or update of kata_cod, kumite_cod on public.atletas
for each row execute function public.limpar_chave();

-- 8) Cadastrador comum pode alterar os SEUS atletas (para adicionar a outra modalidade)
drop policy if exists atletas_update on public.atletas;
create policy atletas_update on public.atletas for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

commit;


-- ================= PARTE C - CONFERÊNCIA (opcional) ====================
-- select (select count(*) from public.atletas_backup_v1) as antes,
--        (select count(*) from public.atletas)           as depois,
--        (select count(*) from public.atletas where kata_cod is not null and kumite_cod is not null) as nas_duas;
-- (antes - depois) deve ser igual ao número de linhas da prévia.
--
-- Para DESFAZER (se algo sair errado), peça ajuda: os dados originais estão em atletas_backup_v1 e chaves_backup_v1.
