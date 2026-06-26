import { type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { Layout } from '../../components/Layout'
import { OverviewPage } from '../../features/overview/OverviewPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { BucketsPage } from '../../features/buckets/BucketsPage'
import { ObjectsPage } from '../../features/objects/ObjectsPage'
import { LoginPage } from '../../features/auth/LoginPage'
import { useAuth } from '../providers/useAuth'

function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, unauthenticated } = useAuth()
  if (loading) return <Center h="100vh"><Loader /></Center>
  if (unauthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<OverviewPage />} />
          <Route path="/buckets" element={<BucketsPage />} />
          <Route path="/buckets/:bucketName/*" element={<ObjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
