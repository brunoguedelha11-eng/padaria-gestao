'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, Package, BarChart3, Recycle,
  TrendingUp, Bot, Bell, LogOut, ChefHat
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/vendas', label: 'Vendas Diárias', icon: ShoppingCart },
  { href: '/compras', label: 'Compras', icon: Package },
  { href: '/balanco', label: 'Balanço Financeiro', icon: BarChart3 },
  { href: '/producao', label: 'Produção e Desperdício', icon: Recycle },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/assistente', label: 'Assistente IA', icon: Bot },
  { href: '/alertas', label: 'Alertas', icon: Bell },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-amber-900 text-white flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-amber-700">
        <ChefHat className="w-8 h-8 text-amber-300" />
        <div>
          <h1 className="font-bold text-lg leading-tight">Gestão</h1>
          <p className="text-amber-300 text-xs">Padaria</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                active
                  ? 'bg-amber-700 text-white font-medium'
                  : 'text-amber-100 hover:bg-amber-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-amber-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-amber-100 hover:bg-amber-800 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
