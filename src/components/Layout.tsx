import { AppShell, Center, Group, Loader, NavLink, Text, Title, ActionIcon, useMantineColorScheme, Image } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconBucket, IconLayoutDashboard, IconMoon, IconSettings, IconSun } from '@tabler/icons-react'
import { useAuth } from '../app/providers/useAuth'

export function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, unauthenticated } = useAuth()
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs" h="100%" >
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
        {loading ? (
          <Center h="60vh">
            <Loader />
          </Center>
        ) : unauthenticated ? (
          <Center h="60vh">
            <Text c="dimmed">{t('auth.unauthenticated')}</Text>
          </Center>
        ) : (
          <Outlet />
        )}
      </AppShell.Main>
    </AppShell>
  )
}
