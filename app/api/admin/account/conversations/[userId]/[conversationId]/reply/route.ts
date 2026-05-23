import { NextResponse } from 'next/server'
import { replyToAccountConversationFromAdmin } from '@/lib/server/account-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  request: Request,
  { params }: { params: { userId: string; conversationId: string } },
) {
  try {
    const body = (await request.json()) as { message?: string; closeConversation?: boolean }
    const result = await replyToAccountConversationFromAdmin({
      userId: params.userId,
      conversationId: params.conversationId,
      body: typeof body.message === 'string' ? body.message : '',
      closeConversation: body.closeConversation === true,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zapisać odpowiedzi.'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
