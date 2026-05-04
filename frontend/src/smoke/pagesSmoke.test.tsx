/**
 * Smoke tests: mount each dashboard/page route under real providers so large TSX modules execute.
 */
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client')
vi.stubEnv('VITE_GOOGLE_API_KEY', 'test-google-key')

vi.mock('../hooks/useHandGesture', () => ({
  useHandGesture: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    isActive: false,
    currentGesture: null,
    confidenceScore: 0,
    fps: 0,
    error: null,
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
  }),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

vi.mock('recharts', () => {
  const ReactMod = require('react') as typeof import('react')
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    ReactMod.createElement('div', { 'data-testid': 'recharts-stub' }, children)
  const chartExports = [
    'ResponsiveContainer',
    'BarChart',
    'Bar',
    'XAxis',
    'YAxis',
    'CartesianGrid',
    'Tooltip',
    'PieChart',
    'Pie',
    'Cell',
    'LineChart',
    'Line',
    'RadarChart',
    'PolarGrid',
    'PolarAngleAxis',
    'PolarRadiusAxis',
    'Radar',
    'Legend',
    'Brush',
    'AreaChart',
    'Area',
    'ReferenceLine',
  ]
  const mod: Record<string, unknown> = {}
  for (const name of chartExports) mod[name] = Stub
  return mod
})

vi.mock('react-leaflet', () => {
  const ReactMod = require('react') as typeof import('react')
  const Box = ({ children }: { children?: React.ReactNode }) =>
    ReactMod.createElement('div', null, children)
  return {
    MapContainer: Box,
    TileLayer: Box,
    Marker: Box,
    Popup: Box,
    useMapEvents: () => ({}),
    useMap: () => ({}),
  }
})

vi.mock('leaflet', () => {
  function IconCtor(this: unknown) {}
  IconCtor.prototype = { _getIconUrl: '' }
  ;(IconCtor as any).Default = IconCtor
  ;(IconCtor as any).mergeOptions = () => {}
  return { Icon: IconCtor }
})

import { AccessibilityProvider } from '../context/AccessibilityContext'
import { AuthProvider } from '../context/AuthContext'
import { DataProvider } from '../context/DataContext'
import { TranslationProvider } from '../context/TranslationContext'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import DashboardLayout from '../components/layout/DashboardLayout'

import LoginPage from '../pages/LoginPage'
import GoogleAuthCallback from '../pages/GoogleAuthCallback'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminDepartments from '../pages/admin/AdminDepartments'
import AdminSkills from '../pages/admin/AdminSkills'
import AdminQuestions from '../pages/admin/AdminQuestions'
import AdminAnalytics from '../pages/admin/AdminAnalytics'
import PromptRewriter from '../pages/shared/PromptRewriter'
import HRDashboard from '../pages/hr/HRDashboard'
import HRActivities from '../pages/hr/HRActivities'
import CreateActivity from '../pages/hr/CreateActivity'
import HRActivityChatCreator from '../pages/hr/HRActivityChatCreator'
import HRRecommendations from '../pages/hr/HRRecommendations'
import HRHistory from '../pages/hr/HRHistory'
import HRAnalytics from '../pages/hr/HRAnalytics'
import HRImportEmployees from '../pages/hr/HRImportEmployees'
import HRActivityRequests from '../pages/hr/HRActivityRequests'
import HRReports from '../pages/hr/HRReports'
import EditActivity from '../pages/hr/EditActivity'
import ManagerDashboard from '../pages/manager/ManagerDashboard'
import ManagerActivities from '../pages/manager/ManagerActivities'
import ManagerActivityDetail from '../pages/manager/ManagerActivityDetail'
import ManagerValidations from '../pages/manager/ManagerValidations'
import ManagerHistory from '../pages/manager/ManagerHistory'
import ManagerActivityRequests from '../pages/manager/ManagerActivityRequests'
import EmployeeDashboard from '../pages/employee/EmployeeDashboard'
import EmployeeActivities from '../pages/employee/EmployeeActivities'
import EmployeeNotifications from '../pages/employee/EmployeeNotifications'
import EmployeeHistory from '../pages/employee/EmployeeHistory'
import EmployeeProfile from '../pages/employee/EmployeeProfile'
import EmployeeSkillUpdates from '../pages/employee/EmployeeSkillUpdates'
import EmployeeCertificates from '../pages/employee/EmployeeCertificates'

function mkJson(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    clone() {
      return this
    },
  } as Response
}

const ADMIN_USER = {
  id: 'u-admin',
  name: 'Admin User',
  matricule: 'ADM1',
  telephone: '',
  email: 'admin@test.local',
  password: '',
  date_embauche: new Date().toISOString(),
  departement_id: 'd1',
  manager_id: null,
  status: 'active' as const,
  en_ligne: true,
  role: 'ADMIN' as const,
}

function UniversalFetch(input: RequestInfo | URL): Promise<Response> {
  const href =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input)

  if (href.includes('/api/recommendations/my')) {
    return Promise.resolve(mkJson([]))
  }

  if (href.includes('/notifications/me')) {
    return Promise.resolve(mkJson([]))
  }

  if (href.includes('open-meteo.com')) {
    return Promise.resolve(
      mkJson({
        current: {
          temperature_2m: 21,
          relative_humidity_2m: 55,
          weather_code: 0,
          wind_speed_10m: 12,
        },
      }),
    )
  }

  if (href.includes('translate.googleapis.com')) {
    return Promise.resolve(mkJson([[['traduit']]]))
  }

  if (href.includes('/users/login') || href.includes('/users/register')) {
    return Promise.resolve(mkJson({ user: ADMIN_USER, token: 't', refresh_token: 'r' }))
  }

  if (href.includes('/users/refresh')) {
    return Promise.resolve(mkJson({ token: 'refreshed' }))
  }

  if (href.includes('/chat') || (href.includes('/recommendations') && !href.includes('/api/recommendations/my')) || href.includes('/activities/')) {
    return Promise.resolve(mkJson({ data: [], message: 'ok' }))
  }

  return Promise.resolve(mkJson([]))
}

const ACTIVITY_ID = '507f1f77bcf86cd799439011'

function SmokeTree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/skills" element={<AdminSkills />} />
        <Route path="/admin/questions" element={<AdminQuestions />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/prompt-rewriter" element={<PromptRewriter />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/hr/activities" element={<HRActivities />} />
        <Route path="/hr/reports" element={<HRReports />} />
        <Route path="/hr/create-activity" element={<CreateActivity />} />
        <Route path="/hr/create-activity-chat" element={<HRActivityChatCreator />} />
        <Route path="/hr/recommendations/:activityId" element={<HRRecommendations />} />
        <Route path="/hr/import-employees" element={<HRImportEmployees />} />
        <Route path="/hr/activity-requests" element={<HRActivityRequests />} />
        <Route path="/hr/history" element={<HRHistory />} />
        <Route path="/hr/analytics" element={<HRAnalytics />} />
        <Route path="/hr/prompt-rewriter" element={<PromptRewriter />} />
        <Route path="/hr/edit/:id" element={<EditActivity />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/activities" element={<ManagerActivities />} />
        <Route path="/manager/activity/:id" element={<ManagerActivityDetail />} />
        <Route path="/manager/validations" element={<ManagerValidations />} />
        <Route path="/manager/activity-requests" element={<ManagerActivityRequests />} />
        <Route path="/manager/history" element={<ManagerHistory />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/activities" element={<EmployeeActivities />} />
        <Route path="/employee/notifications" element={<EmployeeNotifications />} />
        <Route path="/employee/certificates" element={<EmployeeCertificates />} />
        <Route path="/employee/history" element={<EmployeeHistory />} />
        <Route path="/employee/skill-updates" element={<EmployeeSkillUpdates />} />
        <Route path="/employee/profile" element={<EmployeeProfile />} />
      </Route>
    </Routes>
  )
}

const ROUTES_TO_MOUNT = [
  '/login',
  '/auth/google/callback',
  '/admin/dashboard',
  '/admin/users',
  '/admin/departments',
  '/admin/skills',
  '/admin/questions',
  '/admin/analytics',
  '/admin/prompt-rewriter',
  '/hr/dashboard',
  '/hr/activities',
  '/hr/reports',
  '/hr/create-activity',
  '/hr/create-activity-chat',
  `/hr/recommendations/${ACTIVITY_ID}`,
  '/hr/import-employees',
  '/hr/activity-requests',
  '/hr/history',
  '/hr/analytics',
  '/hr/prompt-rewriter',
  '/hr/edit/activity-1',
  '/manager/dashboard',
  '/manager/activities',
  '/manager/activity/act-1',
  '/manager/validations',
  '/manager/activity-requests',
  '/manager/history',
  '/employee/dashboard',
  '/employee/activities',
  '/employee/notifications',
  '/employee/certificates',
  '/employee/history',
  '/employee/skill-updates',
  '/employee/profile',
]

describe('pages smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(UniversalFetch))
    Element.prototype.scrollIntoView = vi.fn() as typeof Element.prototype.scrollIntoView
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('auth_user', JSON.stringify(ADMIN_USER))
    localStorage.setItem('auth_token', 'tok')
    localStorage.setItem('auth_refresh_token', 'rtok')
    localStorage.setItem('auth_remember_me', 'true')

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
  })

  it.each(ROUTES_TO_MOUNT)('mounts route %s', async (initialPath) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialPath]}>
          <AccessibilityProvider>
            <TranslationProvider>
              <AuthProvider>
                <DataProvider>
                  <SmokeTree />
                </DataProvider>
              </AuthProvider>
            </TranslationProvider>
          </AccessibilityProvider>
        </MemoryRouter>,
      )
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })
    expect(container.innerHTML.length).toBeGreaterThan(0)
  })
})
