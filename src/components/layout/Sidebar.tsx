'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, Package, BarChart3, Recycle,
  TrendingUp, Bot, Bell, LogOut, ChefHat, LayoutDashboard, BookOpen, Download, Target, X, UtensilsCrossed
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/vendas', label: 'Vendas Diárias', icon: ShoppingCart },
  { href: '/compras', label: 'Compras', icon: Package },
  { href: '/balanco', label: 'Balanço Financeiro', icon: BarChart3 },
  { href: '/producao', label: 'Produção e Desperdício', icon: Recycle },
  { href: '/produtos', label: 'Produtos', icon: BookOpen },
  { href: '/receitas', label: 'Receitas e Preços', icon: UtensilsCrossed },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  { href: '/assistente', label: 'Assistente IA', icon: Bot },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/exportar', label: 'Exportar Dados', icon: Download },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-amber-900 text-white flex flex-col z-30
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-amber-700">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-300" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Gestão</h1>
              <p className="text-amber-300 text-xs">Padaria</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-amber-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  active ? 'bg-amber-700 text-white font-medium' : 'text-amber-100 hover:bg-amber-800'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-amber-700">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-amber-100 hover:bg-amber-800 transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
