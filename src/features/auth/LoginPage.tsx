import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../app/providers/useAuth'
import { classifyApiError } from '../../lib/errors'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) return <Navigate to="/" replace />

  const submit = async () => {
    if (!username || !password) return
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
    } catch (err) {
      const code = classifyApiError(err)
      setError(code === 'accessDenied' ? t('auth.invalidCredentials') : t(`errors.${code}`))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Center h="100vh">
      <Paper withBorder shadow="md" p="xl" w={360}>
        <Stack>
          <Title order={2} ta="center">
            S3 Console
          </Title>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          <TextInput
            label={t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <PasswordInput
            label={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <Button onClick={submit} loading={busy} disabled={!username || !password} fullWidth>
            {t('auth.login')}
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            {t('auth.proxyNote')}
          </Text>
        </Stack>
      </Paper>
    </Center>
  )
}
