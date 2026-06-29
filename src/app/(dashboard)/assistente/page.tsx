'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string }

const sugestoes = [
  'Como posso reduzir meu desperdício?',
  'Analise minhas vendas deste mês',
  'Quais dias tenho mais vendas?',
  'Como aumentar meu lucro?',
  'Sugestões para cortar custos',
]

export default function AssistentePage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente especialista em negócios de padaria. Como posso te ajudar hoje?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    const newMessages: Msg[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)

    try {
      const res = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.content }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Erro ao conectar com o assistente. Verifique a configuração da API.' }])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-6 h-6 text-amber-700" />
        <h1 className="text-2xl font-bold text-gray-800">Assistente IA</h1>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-y-auto p-4 space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-800'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {sugestoes.map(s => (
          <button key={s} onClick={() => sendMessage(s)}
            className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors">
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pergunte algo sobre sua padaria..."
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="bg-amber-700 text-white p-3 rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
