import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { OverviewPage } from '../../features/overview/OverviewPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { BucketsPage } from '../../features/buckets/BucketsPage'
import { ObjectsPage } from '../../features/objects/ObjectsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/buckets" element={<BucketsPage />} />
          <Route path="/buckets/:bucketName/*" element={<ObjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
