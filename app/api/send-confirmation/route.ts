import { NextRequest, NextResponse } from 'next/server'
import {
  sendOrderConfirmation,
  sendRegistrationConfirmation,
  type OrderPayload,
  type RegistrationPayload,
} from '@/lib/confirmation-emails'

type Payload =
  | (OrderPayload & { type: 'order' })
  | (RegistrationPayload & { type: 'registration' })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Payload

    if (!body.customerEmail || !body.customerName) {
      return NextResponse.json({ error: 'Missing customerEmail or customerName' }, { status: 400 })
    }

    let ok: boolean
    if (body.type === 'order') {
      ok = await sendOrderConfirmation(body)
    } else if (body.type === 'registration') {
      ok = await sendRegistrationConfirmation(body)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (!ok) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('send-confirmation error:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
