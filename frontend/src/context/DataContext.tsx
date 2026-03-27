import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, Department, Activity, Recommendation, Notification, QuestionCompetence, UserStatus, NotificationType } from '../types'
import { useAuth } from './AuthContext'
import { toast } from '../../hooks/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getAuthStorage(): Storage {
  return localStorage.getItem('auth_remember_me') === 'true' ? localStorage : sessionStorage
}

function getAuthItem(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

function methodLabel(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'Création'
    case 'PATCH':
    case 'PUT':
      return 'Mise à jour'
    case 'DELETE':
      return 'Suppression'
    default:
      return 'Action'
  }
}

interface DataContextType {
  users: User[]
  departments: Department[]
  activities: Activity[]
  recommendations: Recommendation[]
  notifications: Notification[]
  questionCompetences: QuestionCompetence[]
  addUser: (user: User) => void
  updateUser: (user: User) => void
  deleteUser: (id: string) => void
  addDepartment: (dept: Department) => void
  updateDepartment: (dept: Department) => void
  deleteDepartment: (id: string) => void
  addActivity: (activity: Activity) => void
  updateActivity: (activity: Activity) => void
  deleteActivity: (id: string) => void
  updateRecommendation: (rec: Recommendation) => void
  markNotificationRead: (id: string) => void
  getUnreadCount: (userId: string) => number
  getUserNotifications: (userId: string) => Notification[]
  getActivityRecommendations: (activityId: string) => Recommendation[]
  getDepartmentName: (id: string) => string
  importUsersFromCsv: (file: File) => Promise<{
    message: string
    createdCount: number
    errorCount: number
  }>
  sendNotification: (userId: string, activityId: string | undefined, title: string, message: string, type: NotificationType) => void
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>
  refreshNotifications: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

function normalizeRole(role: unknown): 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' {
  const normalized = String(role ?? '').toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'HR' || normalized === 'MANAGER' || normalized === 'EMPLOYEE') {
    return normalized
  }
  return 'EMPLOYEE'
}

function mapBackendStatusToFrontend(status: string | undefined): UserStatus {
  switch (status) {
    case 'ACTIVE':
      return 'active'
    case 'INACTIVE':
      return 'inactive'
    case 'SUSPENDED':
      return 'suspended'
    default:
      return 'active'
  }
}

function mapFrontendStatusToBackend(status: UserStatus | undefined): string | undefined {
  switch (status) {
    case 'active':
      return 'ACTIVE'
    case 'inactive':
      return 'INACTIVE'
    case 'suspended':
      return 'SUSPENDED'
    default:
      return undefined
  }
}

function mapBackendUserToUi(backendUser: any): User {
  return {
    id: String(backendUser._id ?? backendUser.id ?? ''),
    name: backendUser.name ?? '',
    matricule: backendUser.matricule ?? '',
    telephone: backendUser.telephone ?? '',
    email: backendUser.email ?? '',
    // Never expose real password on frontend
    password: '',
    date_embauche:
      typeof backendUser.date_embauche === 'string'
        ? backendUser.date_embauche
        : backendUser.date_embauche
          ? new Date(backendUser.date_embauche).toISOString()
          : new Date().toISOString(),
    departement_id: backendUser.department_id ? String(backendUser.department_id) : '',
    manager_id: backendUser.manager_id ? String(backendUser.manager_id) : null,
    status: mapBackendStatusToFrontend(backendUser.status),
    en_ligne: backendUser.en_ligne ?? false,
    role: normalizeRole(backendUser.role),
    avatar: backendUser.avatar,
  }
}

function mapBackendActivityToUi(a: any): Activity {
  return {
    id: a?._id?.toString() ?? a?.id ?? crypto.randomUUID(),
    title: a?.title ?? '',
    description: a?.description ?? '',
    type: a?.type ?? 'training',
    required_skills: (a?.requiredSkills ?? []).map((s: any) => ({
      skill_name: s?.skill_name ?? '',
      desired_level: s?.desired_level ?? 'medium',
    })),
    seats: a?.maxParticipants ?? 0,
    date: a?.startDate ? new Date(a.startDate).toISOString() : new Date().toISOString(),
    end_date: a?.endDate ? new Date(a.endDate).toISOString() : undefined,
    duration: a?.duration ?? 'N/A',
    location: a?.location ?? 'N/A',
    priority: a?.priority ?? 'consolidate_medium',
    status: a?.status ?? 'open',
    created_by: a?.created_by ?? 'HR',
    assigned_manager: a?.assigned_manager,
    created_at: a?.createdAt ?? new Date().toISOString(),
    updated_at: a?.updatedAt ?? new Date().toISOString(),
  }
}

function mapBackendDepartmentToUi(d: any): Department {
  return {
    id: d?._id?.toString() ?? d?.id ?? crypto.randomUUID(),
    name: d?.name ?? '',
    code: d?.code ?? '',
    description: d?.description ?? '',
    manager_id: d?.manager_id ?? '',
    created_at: d?.createdAt ?? new Date().toISOString(),
    updated_at: d?.updatedAt ?? new Date().toISOString(),
  }
}

function mapBackendQuestionCompetenceToUi(q: any): QuestionCompetence {
  return {
    id: q?._id?.toString?.() ?? q?.id ?? crypto.randomUUID(),
    intitule: q?.intitule ?? '',
    details: q?.details ?? '',
    status: q?.status === 'active' ? 'active' : 'inactive',
    created_at: q?.created_at ?? q?.createdAt ?? new Date().toISOString(),
    updated_at: q?.updated_at ?? q?.updatedAt ?? new Date().toISOString(),
  }
}

function mapBackendNotificationTypeToFrontend(type: string | undefined): NotificationType {
  switch (type) {
    case 'EMPLOYEE_CONFIRMATION_REQUIRED':
      return 'activity_assigned'
    case 'RECOMMENDATION_SENT_TO_MANAGER':
      return 'recommendation'
    case 'EMPLOYEE_CONFIRMED':
      return 'participation_confirmed'
    case 'MANAGER_APPROVED':
    case 'MANAGER_REJECTED':
    case 'EMPLOYEE_DECLINED':
    default:
      return 'general'
  }
}

function mapBackendNotificationToUi(raw: any, fallbackUserId?: string): Notification {
  const activityFromData = raw?.data?.activityId ?? raw?.data?.activity_id
  return {
    id: String(raw?._id ?? raw?.id ?? crypto.randomUUID()),
    user_id: String(raw?.userId ?? raw?.user_id ?? fallbackUserId ?? ''),
    title: raw?.title ?? '',
    message: raw?.message ?? '',
    type: mapBackendNotificationTypeToFrontend(raw?.type),
    read: Boolean(raw?.read),
    activity_id:
      raw?.activityId
        ? String(raw.activityId)
        : activityFromData
          ? String(activityFromData)
          : undefined,
    created_at:
      typeof raw?.created_at === 'string'
        ? raw.created_at
        : raw?.created_at
          ? new Date(raw.created_at).toISOString()
          : new Date().toISOString(),
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [questionCompetences, setQuestionCompetences] = useState<QuestionCompetence[]>([])
  const { user } = useAuth()

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = getAuthItem('auth_refresh_token')
    if (!refreshToken) return null

    const res = await fetch(`${API_BASE_URL}/users/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_refresh_token')
      localStorage.removeItem('auth_user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_refresh_token')
      sessionStorage.removeItem('auth_user')
      return null
    }

    const payload = await res.json()
    const newAccessToken = payload.token as string | undefined
    if (!newAccessToken) return null
    getAuthStorage().setItem('auth_token', newAccessToken)
    return newAccessToken
  }, [])

  const fetchWithAuth = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const method = String(init.method ?? 'GET').toUpperCase()
      const isMutation = method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE'
      const silentToast = String(new Headers(init.headers || {}).get('x-toast-silent') ?? '').toLowerCase() === 'true'
      const toastMutationResult = async (res: Response) => {
        if (silentToast) return
        if (!isMutation) return
        if (res.ok) {
          toast({
            title: 'Succès',
            description: `${methodLabel(method)} effectuée avec succès.`,
            variant: 'success',
            duration: 1600,
          })
          return
        }
        let message = `Erreur ${res.status}`
        try {
          const payload = await res.clone().json()
          if (typeof payload?.message === 'string') message = payload.message
          else if (Array.isArray(payload?.message) && payload.message.length > 0) message = String(payload.message[0])
        } catch {
          // keep default message
        }
        toast({
          title: 'Action refusée',
          description: message,
          variant: 'destructive',
          duration: 2600,
        })
      }
      const toastReadError = async (res: Response) => {
        if (silentToast || isMutation || res.ok) return
        let message = `Erreur ${res.status}`
        try {
          const payload = await res.clone().json()
          if (typeof payload?.message === 'string') message = payload.message
          else if (Array.isArray(payload?.message) && payload.message.length > 0) message = String(payload.message[0])
        } catch {
          // keep default message
        }
        toast({
          title: 'Erreur de chargement',
          description: message,
          variant: 'destructive',
          duration: 2600,
        })
      }
      let token = getAuthItem('auth_token')
      if (!token) {
        token = await refreshAccessToken()
      }
      if (!token) {
        throw new Error('Utilisateur non authentifie')
      }

      const headers = new Headers(init.headers || {})
      headers.set('Authorization', `Bearer ${token}`)
      let firstTry: Response
      try {
        firstTry = await fetch(url, { ...init, headers })
      } catch {
        if (!silentToast) {
          toast({
            title: 'Erreur réseau',
            description: 'Connexion au serveur impossible.',
            variant: 'destructive',
            duration: 2600,
          })
        }
        throw new Error('Connexion au serveur impossible')
      }

      // Some guards return 403 instead of 401 for expired/invalid token.
      if (firstTry.status !== 401 && firstTry.status !== 403) {
        await toastMutationResult(firstTry)
        await toastReadError(firstTry)
        return firstTry
      }

      const renewedToken = await refreshAccessToken()
      if (!renewedToken) {
        await toastMutationResult(firstTry)
        return firstTry
      }

      const retryHeaders = new Headers(init.headers || {})
      retryHeaders.set('Authorization', `Bearer ${renewedToken}`)
      let finalResponse: Response
      try {
        finalResponse = await fetch(url, { ...init, headers: retryHeaders })
      } catch {
        if (!silentToast) {
          toast({
            title: 'Erreur réseau',
            description: 'Connexion au serveur impossible.',
            variant: 'destructive',
            duration: 2600,
          })
        }
        throw new Error('Connexion au serveur impossible')
      }
      await toastMutationResult(finalResponse)
      await toastReadError(finalResponse)
      return finalResponse
    },
    [refreshAccessToken],
  )

  const refreshNotifications = useCallback(async () => {
    if (!user || !(getAuthItem('auth_token') || getAuthItem('auth_refresh_token'))) {
      setNotifications([])
      return
    }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications/me`)
      if (!res.ok) {
        throw new Error(`Erreur fetch notifications: ${res.status}`)
      }
      const payload = await res.json()
      const data = Array.isArray(payload) ? payload : []
      setNotifications(data.map(n => mapBackendNotificationToUi(n, user.id)))
    } catch (err) {
      console.error('Erreur fetch notifications:', err)
      setNotifications([])
    }
  }, [fetchWithAuth, user])

  useEffect(() => {
    // Activities (currently public endpoint)
    fetch(`${API_BASE_URL}/activities`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setActivities(data.map(mapBackendActivityToUi)))
      .catch(err => console.error('Erreur fetch activités:', err))

    // Users/departments are restricted to HR / ADMIN by backend.
    const role = normalizeRole(user?.role)
    if ((role === 'HR' || role === 'ADMIN') && (getAuthItem('auth_token') || getAuthItem('auth_refresh_token'))) {
      fetchWithAuth(`${API_BASE_URL}/departments`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Erreur fetch départements: ${res.status}`)
          }
          return res.json()
        })
        .then(payload => {
          const data = Array.isArray(payload.data) ? payload.data : payload
          setDepartments(data.map(mapBackendDepartmentToUi))
        })
        .catch(err => console.error('Erreur fetch départements:', err))

      fetchWithAuth(`${API_BASE_URL}/users`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Erreur fetch utilisateurs: ${res.status}`)
          }
          return res.json()
        })
        .then(payload => {
          const data = Array.isArray(payload.data) ? payload.data : payload
          setUsers(data.map(mapBackendUserToUi))
        })
        .catch(err => console.error('Erreur fetch utilisateurs:', err))

      fetchWithAuth(`${API_BASE_URL}/users/question-competences/all`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Erreur fetch questions compétences: ${res.status}`)
          }
          return res.json()
        })
        .then(payload => {
          const data = Array.isArray(payload.data) ? payload.data : payload
          setQuestionCompetences(data.map(mapBackendQuestionCompetenceToUi))
        })
        .catch(err => {
          console.error('Erreur fetch questions compétences:', err)
          setQuestionCompetences([])
        })
    }
  }, [fetchWithAuth, user?.role])

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const addActivity = useCallback((a: Activity) => setActivities(prev => [a, ...prev]), [])
  const updateActivity = useCallback((a: Activity) => setActivities(prev => prev.map(x => x.id === a.id ? a : x)), [])
  const deleteActivity = useCallback((id: string) => setActivities(prev => prev.filter(x => x.id !== id)), [])

  const addUser = useCallback((u: User) => {
    ;(async () => {
      try {
        const payload = {
          name: u.name,
          matricule: u.matricule,
          telephone: u.telephone,
          email: u.email,
          // Default initial password that respects backend validation rules
          password: 'Password123!',
          date_embauche: u.date_embauche,
          role: u.role,
          status: mapFrontendStatusToBackend(u.status),
        }

        const res = await fetchWithAuth(`${API_BASE_URL}/users/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error('Erreur création utilisateur:', await res.text())
          return
        }

        const data = await res.json()
        const backendUser = data.user ?? data
        const mapped = mapBackendUserToUi(backendUser)
        setUsers(prev => [mapped, ...prev])
      } catch (err) {
        console.error('Erreur addUser:', err)
      }
    })()
  }, [fetchWithAuth])

  const importUsersFromCsv = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetchWithAuth(`${API_BASE_URL}/users/import-csv`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "Erreur lors de l'import CSV")
    }

    const payload = await res.json()
    const created = Array.isArray(payload.created) ? payload.created : []
    const mapped = created.map(mapBackendUserToUi)

    setUsers(prev => [...mapped, ...prev])

    return {
      message: payload.message ?? `Import terminé: ${mapped.length} utilisateurs créés`,
      createdCount: payload.createdCount ?? mapped.length,
      errorCount: payload.errorCount ?? (Array.isArray(payload.errors) ? payload.errors.length : 0),
    }
  }, [fetchWithAuth])

  const updateUser = useCallback((u: User) => {
    ;(async () => {
      try {
        const payload: any = {
          name: u.name,
          matricule: u.matricule,
          telephone: u.telephone,
          email: u.email,
          date_embauche: u.date_embauche,
          role: u.role,
          status: mapFrontendStatusToBackend(u.status),
          en_ligne: u.en_ligne,
        }

        const res = await fetchWithAuth(`${API_BASE_URL}/users/${u.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error('Erreur mise à jour utilisateur:', await res.text())
          return
        }

        const data = await res.json()
        const backendUser = data.user ?? data
        const mapped = mapBackendUserToUi(backendUser)
        setUsers(prev => prev.map(x => (x.id === mapped.id ? mapped : x)))
      } catch (err) {
        console.error('Erreur updateUser:', err)
      }
    })()
  }, [fetchWithAuth])

  const deleteUser = useCallback((id: string) => {
    ;(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/users/${id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          console.error('Erreur suppression utilisateur:', await res.text())
          return
        }

        setUsers(prev => prev.filter(u => u.id !== id))
      } catch (err) {
        console.error('Erreur deleteUser:', err)
      }
    })()
  }, [fetchWithAuth])

  const addDepartment = useCallback((dept: Department) => {
    ;(async () => {
      try {
        const payload = {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          manager_id: dept.manager_id || undefined,
        }

        const res = await fetchWithAuth(`${API_BASE_URL}/departments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          console.error('Erreur création département:', await res.text())
          return
        }
        const data = await res.json()
        const backendDepartment = data.department ?? data
        setDepartments(prev => [mapBackendDepartmentToUi(backendDepartment), ...prev])
      } catch (err) {
        console.error('Erreur addDepartment:', err)
      }
    })()
  }, [fetchWithAuth])

  const updateDepartment = useCallback((dept: Department) => {
    ;(async () => {
      try {
        const payload = {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          manager_id: dept.manager_id || undefined,
        }

        const res = await fetchWithAuth(`${API_BASE_URL}/departments/${dept.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          console.error('Erreur mise à jour département:', await res.text())
          return
        }
        const data = await res.json()
        const backendDepartment = data.department ?? data
        const mapped = mapBackendDepartmentToUi(backendDepartment)
        setDepartments(prev => prev.map(d => (d.id === mapped.id ? mapped : d)))
      } catch (err) {
        console.error('Erreur updateDepartment:', err)
      }
    })()
  }, [fetchWithAuth])

  const deleteDepartment = useCallback((id: string) => {
    ;(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/departments/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          console.error('Erreur suppression département:', await res.text())
          return
        }
        setDepartments(prev => prev.filter(d => d.id !== id))
      } catch (err) {
        console.error('Erreur deleteDepartment:', err)
      }
    })()
  }, [fetchWithAuth])

  const updateRecommendation = useCallback((rec: Recommendation) => {
    setRecommendations(prev => prev.map(r => (r.id === rec.id ? rec : r)))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    ;(async () => {
      try {
        await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH' })
      } catch (err) {
        console.error('Erreur markNotificationRead:', err)
      }
    })()
  }, [fetchWithAuth])

  const getUnreadCount = useCallback((userId: string) => {
    return notifications.filter(n => n.user_id === userId && !n.read).length
  }, [notifications])

  const getUserNotifications = useCallback((userId: string) => {
    return notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [notifications])

  const getActivityRecommendations = useCallback((activityId: string) => {
    return recommendations.filter(r => r.activity_id === activityId)
  }, [recommendations])

  const sendNotification = useCallback((userId: string, activityId: string | undefined, title: string, message: string, type: NotificationType) => {
    const now = new Date().toISOString()
    const notif: Notification = {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      message,
      type,
      read: false,
      activity_id: activityId,
      created_at: now,
    }
    setNotifications(prev => [notif, ...prev])
  }, [])

  const getDepartmentName = useCallback((id: string) => {
    if (!id) return 'N/A'
    const found = departments.find(d => d.id === id)
    return found?.name ?? 'N/A'
  }, [departments])

  return (
    <DataContext.Provider value={{
      users, departments, activities, recommendations, notifications, questionCompetences,
      addUser, updateUser, deleteUser,
      addDepartment, updateDepartment, deleteDepartment,
      addActivity, updateActivity, deleteActivity,
      updateRecommendation,
      markNotificationRead,
      getUnreadCount,
      getUserNotifications,
      getActivityRecommendations,
      getDepartmentName,
      importUsersFromCsv,
      sendNotification,
      fetchWithAuth,
      refreshNotifications,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within a DataProvider')
  return context
}
