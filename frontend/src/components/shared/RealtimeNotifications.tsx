import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useToast } from '../../../hooks/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export default function RealtimeNotifications() {
  const { user } = useAuth()
  const { refreshNotifications, fetchWithAuth } = useData()
  const { toast } = useToast()
  const lastUnreadRef = useRef<number>(0)

  useEffect(() => {
    if (!user?.id) return

    const socket: Socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      query: { userId: user.id },
    })

    const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
      toast({ title, description, variant })
      void refreshNotifications()
    }

    socket.on('notification_created', (payload: any) => {
      showToast(payload?.title ?? 'Notification', payload?.message ?? 'Nouvelle notification reçue')
    })
    socket.on('recommendation_ready', (payload: any) => {
      showToast('Recommandations prêtes', payload?.message ?? 'La génération IA est terminée')
    })
    socket.on('manager_review_required', (payload: any) => {
      showToast('Validation manager', `Nouvelle validation requise: ${payload?.activityTitle ?? 'activité'}`)
    })
    socket.on('activity_invitation', (payload: any) => {
      showToast('Invitation activité', payload?.message ?? 'Vous avez reçu une invitation')
    })
    socket.on('employee_response', (payload: any) => {
      showToast(
        'Réponse employé',
        `${payload?.employeeName ?? 'Employé'}: ${payload?.status ?? 'mise à jour'}`,
        payload?.status === 'DECLINED' ? 'destructive' : 'default',
      )
    })

    // Fallback: if websocket has issues, poll unread count and trigger generic popup.
    const poll = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/notifications/unread-count`)
        if (!res.ok) return
        const payload = await res.json()
        const unread = Number(payload?.unread ?? 0)
        if (unread > lastUnreadRef.current) {
          const delta = unread - lastUnreadRef.current
          toast({
            title: 'Nouvelle notification',
            description: `${delta} nouvelle(s) notification(s) reçue(s).`,
          })
          void refreshNotifications()
        }
        lastUnreadRef.current = unread
      } catch {
        // silent fallback polling
      }
    }, 5000)

    return () => {
      clearInterval(poll)
      socket.disconnect()
    }
  }, [fetchWithAuth, refreshNotifications, toast, user?.id])

  return null
}

