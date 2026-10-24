-- =====================================================================
-- I COPINHA ASDOKS - Banco de dados (Supabase)
-- Cole TUDO isto em: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1) TABELAS ----------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz default now()
);

create table public.atletas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idade int not null check (idade between 3 and 99),
  sexo char(1) not null check (sexo in ('M','F')),
  grad text not null,
  acad text,
  pcd boolean not null default false,
  pcd_descricao text,
  kata_cod int check (kata_cod between 1 and 14 or kata_cod in (33, 34)),     -- categoria de Kata (vazio = não participa)
  kumite_cod int check (kumite_cod between 15 and 32 or kumite_cod in (35, 36)), -- categoria de Kumitê (vazio = não participa)
  check (kata_cod is not null or kumite_cod is not null),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

create table public.chaves (
  cod int primary key check (cod between 1 and 36),
  pares jsonb not null,                              -- confrontos sorteados
  updated_at timestamptz default now()
);

-- 2) FUNÇÕES E TRIGGERS ------------------------------------------------
create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- toda conta nova vira perfil com role 'user'
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- se um atleta entra, sai ou muda de categoria, só as chaves afetadas são apagadas (precisa sortear de novo)
create function public.limpar_chave() returns trigger
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
create trigger atletas_limpa_chave
after insert or delete or update of kata_cod, kumite_cod on public.atletas
for each row execute function public.limpar_chave();

-- 3) SEGURANÇA (RLS) ---------------------------------------------------
alter table public.profiles enable row level security;
alter table public.atletas  enable row level security;
alter table public.chaves   enable row level security;

-- perfis: cada um vê o seu; admin vê e altera todos
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- atletas: usuário comum cadastra e vê/remove só os SEUS; admin faz tudo
create policy atletas_select on public.atletas for select using (created_by = auth.uid() or public.is_admin());
create policy atletas_insert on public.atletas for insert with check (created_by = auth.uid());
create policy atletas_update on public.atletas for update using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy atletas_delete on public.atletas for delete using (created_by = auth.uid() or public.is_admin());

-- chaves: somente admin
create policy chaves_admin on public.chaves for all using (public.is_admin()) with check (public.is_admin());

-- 4) TORNAR ALGUÉM ADMINISTRADOR (rode depois de criar a conta pela tela de login)
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
