export type Perfil = 'proprietario' | 'funcionario'

export interface User {
  id: string
  email: string
  nome: string
  perfil: Perfil
  created_at: string
}

export interface Venda {
  id: string
  data: string
  dinheiro: number
  debito: number
  credito: number
  pix: number
  saidas: number
  total: number
  obs?: string
  user_id: string
}

export interface Compra {
  id: string
  data: string
  fornecedor: string
  user_id: string
  itens?: ItemCompra[]
}

export interface ItemCompra {
  id: string
  compra_id: string
  produto: string
  quantidade: number
  apresentacao: 'kg' | 'mL' | 'L' | 'un' | 'cx' | 'pct' | 'g'
  valor_unitario: number
  total: number
}

export interface CustoFixo {
  id: string
  mes_referencia: string
  categoria: string
  valor: number
  descricao?: string
}

export interface GastoPessoal {
  id: string
  data: string
  descricao: string
  valor: number
}

export interface Producao {
  id: string
  data: string
  produto: string
  produzido: number
  descartado: number
  custo_estimado: number
  user_id: string
}

export interface Meta {
  id: string
  mes_referencia: string
  meta_vendas: number
  meta_compras: number
  meta_desperdicio_pct: number
}

export interface EstoqueMinimo {
  id: string
  produto: string
  quantidade_minima: number
  quantidade_atual: number
}
