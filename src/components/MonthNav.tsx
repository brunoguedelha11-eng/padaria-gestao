'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  mes: Date
  onChange: (mes: Date) => void
}

export default function MonthNav({ mes, onChange }: Props) {
  const isCurrentMonth = format(mes, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
      <button onClick={() => onChange(subMonths(mes, 1))}
        className="text-gray-400 hover:text-gray-700 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-gray-700 w-36 text-center capitalize">
        {format(mes, 'MMMM yyyy', { locale: ptBR })}
      </span>
      <button onClick={() => onChange(addMonths(mes, 1))} disabled={isCurrentMonth}
        className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
