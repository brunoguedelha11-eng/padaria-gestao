# Gestão Padaria

Plataforma web completa de gestão para padaria, construída com Next.js 14, Supabase e Tailwind CSS.

## Módulos

- **Vendas Diárias** — lançamento por Dinheiro, Débito, Crédito e Pix, com meta mensal
- **Compras** — registro de compras por fornecedor com itens detalhados
- **Balanço Financeiro** — custos fixos, gastos pessoais e resultado líquido
- **Produção e Desperdício** — controle de produção com alerta de taxa de desperdício
- **Relatórios** — gráficos de vendas mensais, por pagamento e por dia da semana
- **Assistente IA** — chat com Claude especialista em padaria
- **Alertas** — estoque baixo, metas e desperdício
- **Acesso Funcionário** — tela simplificada apenas para produção

## Configuração

### 1. Variáveis de ambiente

Copie `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
ANTHROPIC_API_KEY=sua_chave_anthropic
```

### 2. Banco de dados

Execute o arquivo `supabase-schema.sql` no SQL Editor do Supabase.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy

Conecte o repositório na Vercel e adicione as variáveis de ambiente no painel.
