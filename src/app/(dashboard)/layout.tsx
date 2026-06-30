'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior mobile */}
        <header className="md:hidden sticky top-0 z-10 bg-amber-900 text-white px-4 py-3 flex items-center gap-3 shadow">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-amber-200 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-sm">Gestão Padaria</span>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
