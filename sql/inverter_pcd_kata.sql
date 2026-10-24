-- Inverte os códigos 33 e 34 (PCD Kata) para ficarem em ordem de idade:
--   33 = até 7 anos, Absoluto   |   34 = 8 a 10 anos, Amarela e Vermelha
-- Rode UMA ÚNICA VEZ (rodar de novo desfaz a troca). Não apaga nada.
begin;

-- o gatilho apagaria as chaves ao mudar a categoria; desligado só durante a troca
alter table public.atletas disable trigger atletas_limpa_chave;

-- atletas: 33 vira 34 e 34 vira 33
update public.atletas
   set kata_cod = case kata_cod when 33 then 34 when 34 then 33 end
 where kata_cod in (33, 34);

-- chaves já sorteadas dessas categorias acompanham a troca (os atletas dentro delas não mudam)
create temp table _ch as select * from public.chaves where cod in (33, 34);
delete from public.chaves where cod in (33, 34);
insert into public.chaves (cod, pares, updated_at)
select case cod when 33 then 34 else 33 end, pares, updated_at from _ch;

alter table public.atletas enable trigger atletas_limpa_chave;

commit;
