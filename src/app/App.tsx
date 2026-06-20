import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/notifications/styles.css'
import '../i18n'
import { AuthProvider } from './providers/AuthProvider'
import { AppRouter } from './router/AppRouter'
import { ErrorBoundary } from '../components/ErrorBoundary'

const theme = createTheme({ primaryColor: 'dark' })

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <ErrorBoundary>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ErrorBoundary>
    </MantineProvider>
  )
}
