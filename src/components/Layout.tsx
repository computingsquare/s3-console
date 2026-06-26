import { AppShell, Group, NavLink, Text, Title, ActionIcon, useMantineColorScheme, Image, Button } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconBucket, IconLayoutDashboard, IconLogout, IconMoon, IconSettings, IconSun } from '@tabler/icons-react'
import { useAuth } from '../app/providers/useAuth'

export function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs" h="100%">
            <Image src="/logo.jpg" alt="S3 Console" w={36} h={36} radius="sm" />
            <Title>S3 Console</Title>
          </Group>
          <Group gap="sm">
            {user && <Text size="sm" c="dimmed">{user.email}</Text>}
            <ActionIcon
              variant="subtle"
              aria-label={t('settings.theme')}
              onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
            >
              {t('auth.logout')}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink
          label={t('nav.overview')}
          leftSection={<IconLayoutDashboard size={16} />}
          active={location.pathname === '/'}
          onClick={() => navigate('/')}
        />
        <NavLink
          label={t('nav.buckets')}
          leftSection={<IconBucket size={16} />}
          active={location.pathname.startsWith('/buckets')}
          onClick={() => navigate('/buckets')}
        />
        <NavLink
          label={t('nav.settings')}
          leftSection={<IconSettings size={16} />}
          active={location.pathname === '/settings'}
          onClick={() => navigate('/settings')}
        />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
