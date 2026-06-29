import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Você é um assistente especialista em gestão de padarias e negócios alimentícios no Brasil.
Você tem acesso aos dados da padaria do usuário (vendas, compras, produção, custos).
Responda sempre em português brasileiro, de forma prática e objetiva.
Foque em sugestões concretas e acionáveis para melhorar o negócio.`,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content })
}
