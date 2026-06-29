-- Habilitar RLS em todas as tabelas
-- Execute este script no SQL Editor do Supabase

-- Tabela de usuários (extende auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nome text not null,
  perfil text not null default 'funcionario' check (perfil in ('proprietario', 'funcionario')),
  created_at timestamptz default now()
);

-- Vendas
create table if not exists public.vendas (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  dinheiro numeric(10,2) default 0,
  debito numeric(10,2) default 0,
  credito numeric(10,2) default 0,
  pix numeric(10,2) default 0,
  saidas numeric(10,2) default 0,
  total numeric(10,2) not null,
  obs text,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Compras
create table if not exists public.compras (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  fornecedor text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Itens de compra
create table if not exists public.itens_compra (
  id uuid default gen_random_uuid() primary key,
  compra_id uuid references public.compras(id) on delete cascade,
  produto text not null,
  quantidade numeric(10,3) not null,
  apresentacao text not null check (apresentacao in ('kg','mL','L','un','cx','pct','g')),
  valor_unitario numeric(10,2) not null,
  total numeric(10,2) not null
);

-- Custos fixos
create table if not exists public.custos_fixos (
  id uuid default gen_random_uuid() primary key,
  mes_referencia text not null,
  categoria text not null,
  valor numeric(10,2) not null,
  descricao text,
  created_at timestamptz default now()
);

-- Gastos pessoais
create table if not exists public.gastos_pessoais (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  descricao text not null,
  valor numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Produção e desperdício
create table if not exists public.producao (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  produto text not null,
  produzido integer not null,
  descartado integer not null default 0,
  custo_estimado numeric(10,2) default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Metas mensais
create table if not exists public.metas (
  id uuid default gen_random_uuid() primary key,
  mes_referencia text not null unique,
  meta_vendas numeric(10,2) not null,
  meta_compras numeric(10,2) not null,
  meta_desperdicio_pct numeric(5,2) not null default 5.0,
  created_at timestamptz default now()
);

-- Estoque mínimo
create table if not exists public.estoque_minimo (
  id uuid default gen_random_uuid() primary key,
  produto text not null,
  quantidade_minima numeric(10,3) not null,
  quantidade_atual numeric(10,3) not null,
  created_at timestamptz default now()
);

-- Trigger para criar perfil do usuário ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, nome, perfil)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 'proprietario');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Políticas RLS básicas (desabilita RLS para simplificar - habilite conforme necessário)
alter table public.vendas enable row level security;
alter table public.compras enable row level security;
alter table public.itens_compra enable row level security;
alter table public.custos_fixos enable row level security;
alter table public.gastos_pessoais enable row level security;
alter table public.producao enable row level security;
alter table public.metas enable row level security;
alter table public.estoque_minimo enable row level security;
alter table public.users enable row level security;

-- Políticas: usuários autenticados têm acesso total
create policy "Acesso autenticado" on public.vendas for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.compras for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.itens_compra for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.custos_fixos for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.gastos_pessoais for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.producao for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.metas for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.estoque_minimo for all to authenticated using (true) with check (true);
create policy "Acesso autenticado" on public.users for all to authenticated using (true) with check (true);

-- Meta de exemplo para o mês atual
insert into public.metas (mes_referencia, meta_vendas, meta_compras, meta_desperdicio_pct)
values (to_char(now(), 'YYYY-MM'), 20000.00, 8000.00, 5.0)
on conflict (mes_referencia) do nothing;
