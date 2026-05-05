import { NextResponse } from 'next/server'
import { handleWebhook, verifyWebhookSignature } from '@/lib/billing/stripe'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
    }

    const event = verifyWebhookSignature(body, signature)
    await handleWebhook(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
