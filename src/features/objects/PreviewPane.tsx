import { useEffect, useState } from 'react'
import { Button, Center, Group, Image, Stack, Text } from '@mantine/core'
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

export function PreviewPane({ bucket, objectKey, isAdmin, onDelete }: PreviewPaneProps) {
  const { t } = useTranslation()
  const [head, setHead] = useState<ObjectHead | null>(null)
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    if (!objectKey) return
    api.headObject(bucket, objectKey).then(setHead).catch(() => {})
    api
      .tagsObject(bucket, objectKey)
      .then((res) => setTags(res.tags))
      .catch(() => setTags([]))
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
  const isPreviewable = isImage || contentType.startsWith('text/') || contentType === 'application/pdf' || contentType === 'application/json'

  return (
    <Stack>
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} truncate>
          {name}
        </Text>
        <Group gap="xs">
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

      {isImage && <Image src={contentUrl(bucket, objectKey)} mah={300} fit="contain" />}
      {!isImage && isPreviewable && (
        <iframe
          src={contentUrl(bucket, objectKey)}
          style={{ width: '100%', height: 300, border: '1px solid var(--mantine-color-default-border)' }}
        />
      )}

      <Stack gap={4}>
        <Text size="sm">
          {t('objects.size')}: {formatBytes(head?.size ?? 0)}
        </Text>
        <Text size="sm">{t('objects.contentType')}: {head?.contentType ?? '-'}</Text>
        <Text size="sm">
          {t('objects.lastModified')}: {head?.lastModified ? new Date(head.lastModified).toLocaleString() : '-'}
        </Text>
        <Text size="sm">{t('objects.etag')}: {head?.etag ?? '-'}</Text>
      </Stack>

      {tags.length > 0 && (
        <Stack gap={4}>
          <Text fw={500}>{t('objects.tags')}</Text>
          {tags.map((tag) => (
            <Text size="sm" key={tag.Key}>
              {tag.Key}: {tag.Value}
            </Text>
          ))}
        </Stack>
      )}

      {head?.metadata && Object.keys(head.metadata).length > 0 && (
        <Stack gap={4}>
          <Text fw={500}>{t('objects.metadata')}</Text>
          {Object.entries(head.metadata).map(([k, v]) => (
            <Text size="sm" key={k}>
              {k}: {v}
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
