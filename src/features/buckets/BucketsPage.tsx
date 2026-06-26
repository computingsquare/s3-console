import { useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { IconBucket, IconSettings, IconTrash } from '@tabler/icons-react'
import { useAuth } from '../../app/providers/useAuth'
import { api, type BucketSummary } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'
import { BucketSettingsModal } from './BucketSettingsModal'

const PAGE_SIZE = 25

export function BucketsPage() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [buckets, setBuckets] = useState<BucketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [settingsTarget, setSettingsTarget] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.listBuckets()
      setBuckets(res.buckets)
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () => buckets.filter((b) => b.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [buckets, filter],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const createBucket = async () => {
    if (!newName.trim()) return
    try {
      await api.createBucket(newName.trim())
      setCreateOpen(false)
      setNewName('')
      refresh()
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    }
  }

  const deleteBucket = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteBucket(deleteTarget)
      setDeleteTarget(null)
      refresh()
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{t('buckets.title')}</Title>
        {isAdmin && <Button onClick={() => setCreateOpen(true)}>{t('buckets.create')}</Button>}
      </Group>

      <TextInput
        placeholder={t('buckets.filter')}
        value={filter}
        onChange={(e) => {
          setFilter(e.currentTarget.value)
          setPage(1)
        }}
      />

      {!loading && filtered.length === 0 && <Text c="dimmed">{t('buckets.empty')}</Text>}

      {filtered.length > 0 && (
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('buckets.name')}</Table.Th>
              <Table.Th>{t('buckets.headerAccess')}</Table.Th>
              <Table.Th>{t('buckets.headerObjects')}</Table.Th>
              <Table.Th>{t('buckets.headerCreated')}</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageItems.map((bucket) => (
              <Table.Tr
                key={bucket.name}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/buckets/${bucket.name}/`)}
              >
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <IconBucket size={16} style={{ flexShrink: 0 }} />
                    <Text fw={500}>{bucket.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Badge
                    variant="light"
                    color={bucket.isPublic ? 'orange' : 'blue'}
                    size="sm"
                  >
                    {bucket.isPublic ? t('buckets.settingsPublic') : t('buckets.settingsPrivate')}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {bucket.firstLevelCount === null
                      ? t('overview.countUnavailable')
                      : t('overview.firstLevelCount', { count: bucket.firstLevelCount })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {bucket.creationDate
                      ? new Date(bucket.creationDate).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </Text>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => setSettingsTarget(bucket.name)}
                    >
                      <IconSettings size={16} />
                    </ActionIcon>
                    {isAdmin && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => setDeleteTarget(bucket.name)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {pageCount > 1 && <Pagination value={page} onChange={setPage} total={pageCount} />}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title={t('buckets.create')}>
        <Stack>
          <TextInput
            label={t('buckets.name')}
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && createBucket()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={createBucket} disabled={!newName.trim()}>
              {t('common.create')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('common.delete')}>
        <Stack>
          <Text>{t('buckets.confirmDelete', { name: deleteTarget })}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button color="red" onClick={deleteBucket}>
              {t('common.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <BucketSettingsModal
        key={settingsTarget ?? 'none'}
        bucket={settingsTarget}
        isAdmin={isAdmin}
        onClose={() => setSettingsTarget(null)}
      />
    </Stack>
  )
}
