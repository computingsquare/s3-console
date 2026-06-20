import { useEffect, useState } from 'react'
import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { api, type BucketSummary } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'

export function OverviewPage() {
  const { t } = useTranslation()
  const [buckets, setBuckets] = useState<BucketSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listBuckets()
      .then((res) => setBuckets(res.buckets))
      .catch((error) => notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack>
      <Title order={2}>{t('nav.overview')}</Title>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card withBorder>
          <Text c="dimmed" size="sm">{t('overview.bucketCount')}</Text>
          <Title order={2}>{loading ? '-' : buckets.length}</Title>
        </Card>
      </SimpleGrid>

      <Title order={3} mt="md">{t('overview.perBucket')}</Title>
      <Stack gap="xs">
        {buckets.map((bucket) => (
          <Group key={bucket.name} justify="space-between">
            <Text>{bucket.name}</Text>
            <Text c="dimmed">
              {bucket.firstLevelCount === null
                ? t('overview.countUnavailable')
                : t('overview.firstLevelCount', { count: bucket.firstLevelCount })}
            </Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}
