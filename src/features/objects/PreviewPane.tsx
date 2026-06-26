import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { IconDownload, IconTrash } from '@tabler/icons-react'
import { api, contentUrl, type ObjectHead, type Tag } from '../../lib/api'
import { formatBytes } from '../../lib/format'

interface PreviewPaneProps {
  bucket: string
  objectKey: string | null
  isAdmin: boolean
  onDelete: (key: string) => void
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Table.Tr>
      <Table.Td fw={500} w="40%" style={{ verticalAlign: 'top' }}>
        {label}
      </Table.Td>
      <Table.Td style={{ wordBreak: 'break-all' }}>{value}</Table.Td>
    </Table.Tr>
  )
}

export function PreviewPane({ bucket, objectKey, isAdmin, onDelete }: PreviewPaneProps) {
  const { t } = useTranslation()
  const [head, setHead] = useState<ObjectHead | null>(null)
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    if (!objectKey) return
    api.headObject(bucket, objectKey).then(setHead).catch(() => {})
    api.tagsObject(bucket, objectKey).then((res) => setTags(res.tags)).catch(() => setTags([]))
  }, [bucket, objectKey])

  if (!objectKey) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t('objects.selectPrompt')}</Text>
      </Center>
    )
  }

  const name = objectKey.split('/').pop() ?? objectKey
  const contentType = head?.contentType ?? ''
  const isImage = contentType.startsWith('image/')
  const isPreviewable =
    isImage ||
    contentType.startsWith('text/') ||
    contentType === 'application/pdf' ||
    contentType === 'application/json'

  return (
    <Stack>
      <Group justify="space-between" wrap="nowrap">
        <Title order={5} style={{ wordBreak: 'break-all' }}>
          {name}
        </Title>
        <Group gap="xs" style={{ flexShrink: 0 }}>
          <Button
            size="xs"
            component="a"
            href={contentUrl(bucket, objectKey, true)}
            leftSection={<IconDownload size={14} />}
          >
            {t('objects.download')}
          </Button>
          {isAdmin && (
            <Button
              size="xs"
              color="red"
              variant="subtle"
              leftSection={<IconTrash size={14} />}
              onClick={() => onDelete(objectKey)}
            >
              {t('common.delete')}
            </Button>
          )}
        </Group>
      </Group>

      {isImage && (
        <Image src={contentUrl(bucket, objectKey)} mah={260} fit="contain" />
      )}
      {!isImage && isPreviewable && (
        <iframe
          src={contentUrl(bucket, objectKey)}
          style={{ width: '100%', height: 260, border: '1px solid var(--mantine-color-default-border)' }}
        />
      )}

      <Divider />

      <Table withRowBorders={false} verticalSpacing={4}>
        <Table.Tbody>
          <Row label={t('objects.detailName')} value={objectKey} />
          <Row label={t('objects.size')} value={head ? formatBytes(head.size ?? 0) : '…'} />
          <Row
            label={t('objects.lastModified')}
            value={head?.lastModified ? new Date(head.lastModified).toLocaleString() : '—'}
          />
          <Row
            label={t('objects.etag')}
            value={
              <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                {head?.etag ?? '—'}
              </Text>
            }
          />
          <Row label={t('objects.contentType')} value={head?.contentType ?? '—'} />
          <Row
            label={t('objects.storageClass')}
            value={head?.storageClass ? (
              <Badge variant="light" size="sm">{head.storageClass}</Badge>
            ) : '—'}
          />
          {head?.versionId && (
            <Row
              label={t('objects.versionId')}
              value={
                <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                  {head.versionId}
                </Text>
              }
            />
          )}
          <Row
            label={t('objects.legalHold')}
            value={head?.legalHold
              ? <Badge color={head.legalHold === 'ON' ? 'red' : 'gray'} variant="light" size="sm">{head.legalHold}</Badge>
              : <Text size="sm" c="dimmed">N/A</Text>}
          />
          <Row
            label={t('objects.retention')}
            value={
              head?.retentionMode
                ? (
                  <Stack gap={2}>
                    <Badge variant="light" size="sm">{head.retentionMode}</Badge>
                    {head.retainUntilDate && (
                      <Text size="xs" c="dimmed">
                        {new Date(head.retainUntilDate).toLocaleString()}
                      </Text>
                    )}
                  </Stack>
                )
                : <Text size="sm" c="dimmed">None</Text>
            }
          />
        </Table.Tbody>
      </Table>

      {tags.length > 0 && (
        <>
          <Divider label={t('objects.tags')} labelPosition="left" />
          <Table withRowBorders={false} verticalSpacing={4}>
            <Table.Tbody>
              {tags.map((tag) => (
                <Row key={tag.Key} label={tag.Key} value={tag.Value} />
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
      {tags.length === 0 && (
        <Group gap={4}>
          <Text size="sm" fw={500}>{t('objects.tags')}:</Text>
          <Text size="sm" c="dimmed">N/A</Text>
        </Group>
      )}

      {head?.metadata && Object.keys(head.metadata).length > 0 && (
        <>
          <Divider label={t('objects.metadata')} labelPosition="left" />
          <Table withRowBorders={false} verticalSpacing={4}>
            <Table.Tbody>
              {Object.entries(head.metadata).map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  )
}
