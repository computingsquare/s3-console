import { Select, SegmentedControl, Stack, Text, Title, useMantineColorScheme } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { usePaginationMode, useViewMode } from '../../lib/settings'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [viewMode, setViewMode] = useViewMode()
  const [paginationMode, setPaginationMode] = usePaginationMode()

  return (
    <Stack maw={420}>
      <Title order={2}>{t('nav.settings')}</Title>

      <Stack gap="xs">
        <Text fw={500}>{t('common.language')}</Text>
        <Select
          value={i18n.language.startsWith('fr') ? 'fr' : 'en'}
          onChange={(value) => value && i18n.changeLanguage(value)}
          data={[
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text fw={500}>{t('settings.theme')}</Text>
        <SegmentedControl
          value={colorScheme === 'dark' ? 'dark' : 'light'}
          onChange={(value) => setColorScheme(value as 'light' | 'dark')}
          data={[
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text fw={500}>{t('settings.viewMode')}</Text>
        <SegmentedControl
          value={viewMode}
          onChange={(value) => setViewMode(value as 'flat' | 'tree')}
          data={[
            { value: 'flat', label: t('settings.viewModeFlat') },
            { value: 'tree', label: t('settings.viewModeTree') },
          ]}
        />
      </Stack>

      <Stack gap="xs">
        <Text fw={500}>{t('settings.paginationMode')}</Text>
        <SegmentedControl
          value={paginationMode}
          onChange={(value) => setPaginationMode(value as 'classic' | 'scroll')}
          data={[
            { value: 'classic', label: t('settings.paginationClassic') },
            { value: 'scroll', label: t('settings.paginationScroll') },
          ]}
        />
      </Stack>
    </Stack>
  )
}
