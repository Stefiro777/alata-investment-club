import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export type DiligenceBroadcastMessage = {
  id: string
  sender_role: string
  message: string
  attachment_url: string | null
  created_at: string
}

const CHANNEL_PREFIX = 'diligence-room-'

/**
 * Subscribes to a Realtime broadcast channel per room id (fed by the server right
 * after it inserts a diligence message — see the messages POST route) and appends
 * new messages to local state without waiting for the next poll.
 */
export function useDiligenceRealtime(
  roomIds: string[],
  onMessage: (roomId: string, message: DiligenceBroadcastMessage) => void
) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const key = roomIds.join(',')

  useEffect(() => {
    if (!key) return
    const supabase = createClient()
    const ids = key.split(',')

    const channels = ids.map((roomId) =>
      supabase
        .channel(`${CHANNEL_PREFIX}${roomId}`)
        .on('broadcast', { event: 'new_message' }, ({ payload }) => {
          onMessageRef.current(roomId, payload as DiligenceBroadcastMessage)
        })
        .subscribe()
    )

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [key])
}

export function appendDiligenceMessage<T extends { id: string }>(messages: T[], message: T): T[] {
  if (messages.some((m) => m.id === message.id)) return messages
  return [...messages, message]
}
