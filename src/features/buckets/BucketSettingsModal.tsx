import { useEffect, useState } from 'react'
import { Button, Code, Group, Modal, Stack, Switch, Tabs, Text, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { api, type BucketSettings } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!bucket) return
    api.getBucketSettings(bucket).then((res) => {
      setSettings(res)
      setPolicyDraft(res.policy ?? '')
      setCorsDraft(JSON.stringify(res.cors, null, 2))
      setLifecycleDraft(JSON.stringify(res.lifecycle, null, 2))
    })
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
    try {
      rules = JSON.parse(corsDraft || '[]')
    } catch {
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
    try {
      rules = JSON.parse(lifecycleDraft || '[]')
    } catch {
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

  return (
    <Modal opened onClose={onClose} title={t('buckets.settingsTitle', { name: bucket })} size="lg">
      {!settings ? (
        <Text c="dimmed">{t('common.loading')}</Text>
      ) : (
        <Tabs defaultValue="access">
          <Tabs.List>
            <Tabs.Tab value="access">{t('buckets.settingsAccess')}</Tabs.Tab>
            <Tabs.Tab value="policy">{t('buckets.settingsPolicy')}</Tabs.Tab>
            <Tabs.Tab value="cors">{t('buckets.settingsCors')}</Tabs.Tab>
            <Tabs.Tab value="lifecycle">{t('buckets.settingsLifecycle')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="access" pt="md">
            <Stack>
              <Switch
                label={settings.isPublic ? t('buckets.settingsPublic') : t('buckets.settingsPrivate')}
                checked={settings.isPublic}
                disabled={saving || !isAdmin}
                onChange={(e) => togglePublic(e.currentTarget.checked)}
              />
              <Text size="sm" c="dimmed">
                {t('buckets.settingsPublicHint')}
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="policy" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">
                {t('buckets.settingsPolicyHint')}
              </Text>
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
                  <Button onClick={savePolicy} loading={saving}>
                    {t('common.save')}
                  </Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="cors" pt="md">
            <Stack>
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
                  <Button onClick={saveCors} loading={saving}>
                    {t('common.save')}
                  </Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="lifecycle" pt="md">
            <Stack>
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
                  <Button onClick={saveLifecycle} loading={saving}>
                    {t('common.save')}
                  </Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}

      {settings && (
        <Stack mt="lg" gap={4}>
          <Text fw={500} size="sm">
            {t('buckets.settingsCurrentConfig')}
          </Text>
          <Code block style={{ maxHeight: 160, overflow: 'auto' }}>
            {JSON.stringify(settings, null, 2)}
          </Code>
        </Stack>
      )}
    </Modal>
  )
}
