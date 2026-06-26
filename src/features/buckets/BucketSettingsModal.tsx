import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react'
import { api, type BucketSettings, type BucketStats, type NotificationConfig, type Tag } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'
import { formatBytes } from '../../lib/format'

interface BucketSettingsModalProps {
  bucket: string | null
  isAdmin: boolean
  onClose: () => void
}

export function BucketSettingsModal({ bucket, isAdmin, onClose }: BucketSettingsModalProps) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<BucketSettings | null>(null)
  const [policyDraft, setPolicyDraft] = useState('')
  const [corsDraft, setCorsDraft] = useState('')
  const [lifecycleDraft, setLifecycleDraft] = useState('')
  const [versioning, setVersioning] = useState<string | null>(null)
  const [bucketTags, setBucketTags] = useState<Tag[] | null>(null)
  const [tagsDraft, setTagsDraft] = useState<Tag[]>([])
  const [, setNotifications] = useState<NotificationConfig | null>(null)
  const [notifDraft, setNotifDraft] = useState('')
  const [stats, setStats] = useState<BucketStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!bucket) return
    api.getBucketSettings(bucket).then((res) => {
      setSettings(res)
      setPolicyDraft(res.policy ?? '')
      setCorsDraft(JSON.stringify(res.cors, null, 2))
      setLifecycleDraft(JSON.stringify(res.lifecycle, null, 2))
    })
    api.getBucketVersioning(bucket).then((r) => setVersioning(r.status)).catch(() => setVersioning('Off'))
    api.getBucketTagging(bucket).then((r) => { setBucketTags(r.tags); setTagsDraft(r.tags) }).catch(() => { setBucketTags([]); setTagsDraft([]) })
    api.getBucketNotifications(bucket)
      .then((r) => {
        setNotifications(r.config)
        setNotifDraft(JSON.stringify(r.config ?? {}, null, 2))
      })
      .catch(() => { setNotifications(null); setNotifDraft('{}') })
  }, [bucket])

  if (!bucket) return null

  const reload = () => api.getBucketSettings(bucket).then(setSettings)

  const togglePublic = async (checked: boolean) => {
    setSaving(true)
    try {
      await api.setBucketPublic(bucket, checked)
      await reload()
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const toggleVersioning = async (checked: boolean) => {
    setSaving(true)
    try {
      await api.setBucketVersioning(bucket, checked)
      setVersioning(checked ? 'Enabled' : 'Suspended')
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const saveTags = async () => {
    setSaving(true)
    try {
      await api.setBucketTagging(bucket, tagsDraft)
      setBucketTags(tagsDraft)
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const savePolicy = async () => {
    setSaving(true)
    try {
      await api.setBucketPolicy(bucket, policyDraft)
      await reload()
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const saveCors = async () => {
    let rules
    try { rules = JSON.parse(corsDraft || '[]') } catch {
      notifications.show({ color: 'red', message: t('buckets.settingsInvalidJson') })
      return
    }
    setSaving(true)
    try {
      await api.setBucketCors(bucket, rules)
      await reload()
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const saveLifecycle = async () => {
    let rules
    try { rules = JSON.parse(lifecycleDraft || '[]') } catch {
      notifications.show({ color: 'red', message: t('buckets.settingsInvalidJson') })
      return
    }
    setSaving(true)
    try {
      await api.setBucketLifecycle(bucket, rules)
      await reload()
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const saveNotifications = async () => {
    let cfg
    try { cfg = JSON.parse(notifDraft || '{}') } catch {
      notifications.show({ color: 'red', message: t('buckets.settingsInvalidJson') })
      return
    }
    setSaving(true)
    try {
      await api.setBucketNotifications(bucket, cfg as NotificationConfig)
      setNotifications(cfg as NotificationConfig)
      notifications.show({ message: t('common.saved') })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setSaving(false)
    }
  }

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const s = await api.getBucketStats(bucket)
      setStats(s)
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title={t('buckets.settingsTitle', { name: bucket })} size="xl">
      {!settings ? (
        <Text c="dimmed">{t('common.loading')}</Text>
      ) : (
        <Tabs defaultValue="access">
          <Tabs.List>
            <Tabs.Tab value="access">{t('buckets.settingsAccess')}</Tabs.Tab>
            <Tabs.Tab value="policy">{t('buckets.settingsPolicy')}</Tabs.Tab>
            <Tabs.Tab value="cors">{t('buckets.settingsCors')}</Tabs.Tab>
            <Tabs.Tab value="lifecycle">{t('buckets.settingsLifecycle')}</Tabs.Tab>
            <Tabs.Tab value="notifications">{t('buckets.settingsNotifications')}</Tabs.Tab>
            <Tabs.Tab value="monitoring">{t('buckets.settingsMonitoring')}</Tabs.Tab>
          </Tabs.List>

          {/* Access: public toggle + versioning + bucket tags */}
          <Tabs.Panel value="access" pt="md">
            <Stack>
              <Stack gap="xs">
                <Text fw={500} size="sm">{t('buckets.settingsAccessSection')}</Text>
                <Switch
                  label={settings.isPublic ? t('buckets.settingsPublic') : t('buckets.settingsPrivate')}
                  checked={settings.isPublic}
                  disabled={saving || !isAdmin}
                  onChange={(e) => togglePublic(e.currentTarget.checked)}
                />
                <Text size="xs" c="dimmed">{t('buckets.settingsPublicHint')}</Text>
              </Stack>

              <Stack gap="xs" mt="sm">
                <Text fw={500} size="sm">{t('buckets.settingsVersioningSection')}</Text>
                {versioning === null ? (
                  <Text size="sm" c="dimmed">{t('common.loading')}</Text>
                ) : (
                  <>
                    <Group gap="sm">
                      <Switch
                        label={t('buckets.settingsVersioning')}
                        checked={versioning === 'Enabled'}
                        disabled={saving || !isAdmin}
                        onChange={(e) => toggleVersioning(e.currentTarget.checked)}
                      />
                      <Badge variant="light" color={versioning === 'Enabled' ? 'green' : versioning === 'Suspended' ? 'orange' : 'gray'} size="sm">
                        {versioning}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">{t('buckets.settingsVersioningHint')}</Text>
                  </>
                )}
              </Stack>

              <Stack gap="xs" mt="sm">
                <Text fw={500} size="sm">{t('buckets.settingsTagsSection')}</Text>
                {bucketTags === null ? (
                  <Text size="sm" c="dimmed">{t('common.loading')}</Text>
                ) : (
                  <>
                    <Table withTableBorder withColumnBorders>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('objects.tagKey')}</Table.Th>
                          <Table.Th>{t('objects.tagValue')}</Table.Th>
                          {isAdmin && <Table.Th w={40} />}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {tagsDraft.map((tag, i) => (
                          <Table.Tr key={i}>
                            <Table.Td>
                              <TextInput
                                value={tag.Key}
                                size="xs"
                                disabled={!isAdmin}
                                onChange={(e) => {
                                  const next = [...tagsDraft]
                                  next[i] = { ...next[i], Key: e.currentTarget.value }
                                  setTagsDraft(next)
                                }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <TextInput
                                value={tag.Value}
                                size="xs"
                                disabled={!isAdmin}
                                onChange={(e) => {
                                  const next = [...tagsDraft]
                                  next[i] = { ...next[i], Value: e.currentTarget.value }
                                  setTagsDraft(next)
                                }}
                              />
                            </Table.Td>
                            {isAdmin && (
                              <Table.Td>
                                <ActionIcon
                                  size="xs"
                                  color="red"
                                  variant="subtle"
                                  onClick={() => setTagsDraft(tagsDraft.filter((_, j) => j !== i))}
                                >
                                  <IconTrash size={12} />
                                </ActionIcon>
                              </Table.Td>
                            )}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                    {isAdmin && (
                      <Group justify="space-between">
                        <Button
                          size="xs"
                          variant="default"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => setTagsDraft([...tagsDraft, { Key: '', Value: '' }])}
                        >
                          {t('buckets.addTag')}
                        </Button>
                        <Button size="xs" onClick={saveTags} loading={saving}>
                          {t('common.save')}
                        </Button>
                      </Group>
                    )}
                  </>
                )}
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="policy" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">{t('buckets.settingsPolicyHint')}</Text>
              <Textarea
                value={policyDraft}
                onChange={(e) => setPolicyDraft(e.currentTarget.value)}
                minRows={10}
                autosize
                disabled={!isAdmin}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
              />
              {isAdmin && (
                <Group justify="flex-end">
                  <Button onClick={savePolicy} loading={saving}>{t('common.save')}</Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="cors" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">{t('buckets.settingsCorsLabel')}</Text>
              <Textarea
                value={corsDraft}
                onChange={(e) => setCorsDraft(e.currentTarget.value)}
                minRows={10}
                autosize
                disabled={!isAdmin}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
              />
              {isAdmin && (
                <Group justify="flex-end">
                  <Button onClick={saveCors} loading={saving}>{t('common.save')}</Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="lifecycle" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">{t('buckets.settingsLifecycleLabel')}</Text>
              <Textarea
                value={lifecycleDraft}
                onChange={(e) => setLifecycleDraft(e.currentTarget.value)}
                minRows={10}
                autosize
                disabled={!isAdmin}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
              />
              {isAdmin && (
                <Group justify="flex-end">
                  <Button onClick={saveLifecycle} loading={saving}>{t('common.save')}</Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Notifications: S3 notification configuration (SNS/SQS/Lambda) */}
          <Tabs.Panel value="notifications" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">{t('buckets.settingsNotificationsHint')}</Text>
              <Textarea
                value={notifDraft}
                onChange={(e) => setNotifDraft(e.currentTarget.value)}
                minRows={12}
                autosize
                disabled={!isAdmin}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
              />
              {isAdmin && (
                <Group justify="flex-end">
                  <Button onClick={saveNotifications} loading={saving}>{t('common.save')}</Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Monitoring: stats */}
          <Tabs.Panel value="monitoring" pt="md">
            <Stack>
              <Group justify="space-between">
                <Title order={5}>{t('buckets.settingsMonitoringTitle')}</Title>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={statsLoading ? <Loader size={12} /> : <IconRefresh size={14} />}
                  onClick={loadStats}
                  disabled={statsLoading}
                >
                  {t('buckets.statsLoad')}
                </Button>
              </Group>

              {stats ? (
                <Table withTableBorder>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td fw={500}>{t('buckets.statsObjectCount')}</Table.Td>
                      <Table.Td>
                        {stats.objectCount.toLocaleString()}
                        {stats.truncated && <Text span c="dimmed" size="xs"> {t('buckets.statsTruncated')}</Text>}
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={500}>{t('buckets.statsTotalSize')}</Table.Td>
                      <Table.Td>
                        {formatBytes(stats.totalSize)}
                        {stats.truncated && <Text span c="dimmed" size="xs"> {t('buckets.statsTruncated')}</Text>}
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td fw={500}>{t('buckets.settingsVersioningSection')}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={versioning === 'Enabled' ? 'green' : versioning === 'Suspended' ? 'orange' : 'gray'} size="sm">
                          {versioning ?? '…'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" size="sm">{t('buckets.statsPrompt')}</Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}
    </Modal>
  )
}
