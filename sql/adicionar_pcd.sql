-- =====================================================================
-- CATEGORIAS PCD + opção PCD no cadastro (rode UMA vez no SQL Editor)
-- Pode rodar mesmo que você já tenha rodado a versão anterior (33 e 34).
-- Não apaga nem altera atletas, chaves ou contas; só ajusta regras e cria 2 colunas.
-- =====================================================================
begin;

-- 1) Colunas novas: o atleta é PCD? e qual a deficiência/condição
alter table public.atletas add column if not exists pcd boolean not null default false;
alter table public.atletas add column if not exists pcd_descricao text;

-- 2) Remove as regras antigas de categoria (atletas e chaves)
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.atletas'::regclass and contype = 'c'
             and (pg_get_constraintdef(oid) like '%kata_cod%' or pg_get_constraintdef(oid) like '%kumite_cod%') loop
    execute format('alter table public.atletas drop constraint %I', c);
  end loop;
  for c in select conname from pg_constraint where conrelid = 'public.chaves'::regclass and contype = 'c' loop
    execute format('alter table public.chaves drop constraint %I', c);
  end loop;
end $$;

-- 3) Regras novas: Kata aceita 1-14 e 33-34 | Kumitê aceita 15-32 e 35-36 | chaves 1-36
alter table public.atletas
  add constraint atletas_modalidade_chk check (kata_cod is not null or kumite_cod is not null),
  add constraint atletas_kata_chk       check (kata_cod   is null or kata_cod   between 1  and 14 or kata_cod   in (33, 34)),
  add constraint atletas_kumite_chk     check (kumite_cod is null or kumite_cod between 15 and 32 or kumite_cod in (35, 36));
alter table public.chaves add constraint chaves_cod_check check (cod between 1 and 36);

-- 4) Quem já estiver em categoria PCD passa a constar como PCD
update public.atletas set pcd = true where kata_cod in (33, 34) or kumite_cod in (35, 36);

commit;
