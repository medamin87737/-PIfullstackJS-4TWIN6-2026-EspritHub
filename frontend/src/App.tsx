import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { AccessibilityProvider } from './context/AccessibilityContext'
import { TranslationProvider } from './context/TranslationContext'
import AccessibilityWidget from './components/shared/AccessibilityWidget'
import AppLoader from './components/shared/AppLoader'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from './components/auth/ProtectedRoute'

const RealtimeNotifications = lazy(() => import('./components/shared/RealtimeNotifications'))
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const GoogleAuthCallback = lazy(() => import('./pages/GoogleAuthCallback'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'))
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills'))
const AdminQuestions = lazy(() => import('./pages/admin/AdminQuestions'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const PromptRewriter = lazy(() => import('./pages/shared/PromptRewriter'))

// HR pages
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'))
const HRActivities = lazy(() => import('./pages/hr/HRActivities'))
const CreateActivity = lazy(() => import('./pages/hr/CreateActivity'))
const HRActivityChatCreator = lazy(() => import('./pages/hr/HRActivityChatCreator'))
const HRRecommendations = lazy(() => import('./pages/hr/HRRecommendations'))
const HRHistory = lazy(() => import('./pages/hr/HRHistory'))
const HRAnalytics = lazy(() => import('./pages/hr/HRAnalytics'))
const HRImportEmployees = lazy(() => import('./pages/hr/HRImportEmployees'))
const HRActivityRequests = lazy(() => import('./pages/hr/HRActivityRequests'))
const HRReports = lazy(() => import('./pages/hr/HRReports'))

// Manager pages
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'))
const ManagerActivities = lazy(() => import('./pages/manager/ManagerActivities'))
const ManagerActivityDetail = lazy(() => import('./pages/manager/ManagerActivityDetail'))
const ManagerValidations = lazy(() => import('./pages/manager/ManagerValidations'))
const ManagerHistory = lazy(() => import('./pages/manager/ManagerHistory'))
const ManagerActivityRequests = lazy(() => import('./pages/manager/ManagerActivityRequests'))

// Employee pages
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'))
const EmployeeActivities = lazy(() => import('./pages/employee/EmployeeActivities'))
const EmployeeNotifications = lazy(() => import('./pages/employee/EmployeeNotifications'))
const EmployeeHistory = lazy(() => import('./pages/employee/EmployeeHistory'))
const EmployeeProfile = lazy(() => import('./pages/employee/EmployeeProfile'))
const EmployeeSkillUpdates = lazy(() => import('./pages/employee/EmployeeSkillUpdates'))
const EmployeeCertificates = lazy(() => import('./pages/employee/EmployeeCertificates'))

function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <div key={location.pathname} className="route-fade-in">{children}</div>
}

function RouteProgress() {
  const location = useLocation()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const timer = setTimeout(() => setActive(false), 650)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className={`route-progress ${active ? 'is-active' : ''}`} aria-hidden="true">
      <span className="route-progress-bar" />
    </div>
  )
}

function AnimationBootstrap() {
  const location = useLocation()

  useEffect(() => {
    const isPublicRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/auth/google/callback')
    if (isPublicRoute) return

    const id = window.setTimeout(() => {
      void import('./initAnimations').then((mod) => mod.initGlobalAnimations())
    }, 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return null
}

function LazySection({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Chargement...</div>}>
      {children}
    </Suspense>
  )
}

function RouteEnhancements() {
  const location = useLocation()
  const isPublicRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/auth/google/callback')

  if (isPublicRoute) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <RealtimeNotifications />
    </Suspense>
  )
}

export default function App() {
  const shouldShowBootLoader = import.meta.env.DEV
  const [isBootLoading, setIsBootLoading] = useState(shouldShowBootLoader)

  useEffect(() => {
    if (!shouldShowBootLoader) return
    const timer = setTimeout(() => setIsBootLoading(false), 250)
    return () => clearTimeout(timer)
  }, [shouldShowBootLoader])

  if (isBootLoading) {
    return <AppLoader />
  }

  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <TranslationProvider>
        <AuthProvider>
          <DataProvider>
            <AnimationBootstrap />
              <RouteProgress />
              <RouteEnhancements />
              <RouteTransition>
                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<LazySection><LoginPage /></LazySection>} />
                  <Route path="/auth/google/callback" element={<LazySection><GoogleAuthCallback /></LazySection>} />
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  {/* Admin routes */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <LazySection><DashboardLayout /></LazySection>
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/admin/dashboard" element={<LazySection><AdminDashboard /></LazySection>} />
                    <Route path="/admin/users" element={<LazySection><AdminUsers /></LazySection>} />
                    <Route path="/admin/departments" element={<LazySection><AdminDepartments /></LazySection>} />
                    <Route path="/admin/skills" element={<LazySection><AdminSkills /></LazySection>} />
                    <Route path="/admin/questions" element={<LazySection><AdminQuestions /></LazySection>} />
                    <Route path="/admin/analytics" element={<LazySection><AdminAnalytics /></LazySection>} />
                    <Route path="/admin/prompt-rewriter" element={<LazySection><PromptRewriter /></LazySection>} />
                  </Route>

                  {/* HR routes (accessible to HR and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
                        <LazySection><DashboardLayout /></LazySection>
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/hr/dashboard" element={<LazySection><HRDashboard /></LazySection>} />
                    <Route path="/hr/activities" element={<LazySection><HRActivities /></LazySection>} />
                    <Route path="/hr/reports" element={<LazySection><HRReports /></LazySection>} />
                    <Route path="/hr/create-activity" element={<LazySection><CreateActivity /></LazySection>} />
                    <Route path="/hr/create-activity-chat" element={<LazySection><HRActivityChatCreator /></LazySection>} />
                    <Route path="/hr/recommendations/:activityId" element={<LazySection><HRRecommendations /></LazySection>} />
                    <Route path="/hr/import-employees" element={<LazySection><HRImportEmployees /></LazySection>} />
                    <Route path="/hr/activity-requests" element={<LazySection><HRActivityRequests /></LazySection>} />
                    <Route path="/hr/history" element={<LazySection><HRHistory /></LazySection>} />
                    <Route path="/hr/analytics" element={<LazySection><HRAnalytics /></LazySection>} />
                    <Route path="/hr/prompt-rewriter" element={<LazySection><PromptRewriter /></LazySection>} />
                  </Route>

                  {/* Manager routes (accessible to MANAGER and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                        <LazySection><DashboardLayout /></LazySection>
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/manager/dashboard" element={<LazySection><ManagerDashboard /></LazySection>} />
                    <Route path="/manager/activities" element={<LazySection><ManagerActivities /></LazySection>} />
                    <Route path="/manager/activity/:id" element={<LazySection><ManagerActivityDetail /></LazySection>} />
                    <Route path="/manager/validations" element={<LazySection><ManagerValidations /></LazySection>} />
                    <Route path="/manager/activity-requests" element={<LazySection><ManagerActivityRequests /></LazySection>} />
                    <Route path="/manager/history" element={<LazySection><ManagerHistory /></LazySection>} />
                  </Route>

                  {/* Employee routes (accessible to EMPLOYEE and ADMIN) */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                        <LazySection><DashboardLayout /></LazySection>
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/employee/dashboard" element={<LazySection><EmployeeDashboard /></LazySection>} />
                    <Route path="/employee/activities" element={<LazySection><EmployeeActivities /></LazySection>} />
                    <Route path="/employee/notifications" element={<LazySection><EmployeeNotifications /></LazySection>} />
                    <Route path="/employee/certificates" element={<LazySection><EmployeeCertificates /></LazySection>} />
                    <Route path="/employee/history" element={<LazySection><EmployeeHistory /></LazySection>} />
                    <Route path="/employee/skill-updates" element={<LazySection><EmployeeSkillUpdates /></LazySection>} />
                    <Route path="/employee/profile" element={<LazySection><EmployeeProfile /></LazySection>} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </RouteTransition>
            <Toaster />
            <AccessibilityWidget />
          </DataProvider>
        </AuthProvider>
        </TranslationProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  )
}
