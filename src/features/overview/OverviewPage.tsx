import { useEffect, useState } from 'react'
import { Card, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'

export function OverviewPage() {
  const { t } = useTranslation()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    api
      .listBuckets()
      .then((res) => setCount(res.buckets.length))
      .catch((error) => notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack>
      <Title order={2}>{t('nav.overview')}</Title>
      <Card withBorder w={200}>
        <Text c="dimmed" size="sm">{t('overview.bucketCount')}</Text>
        <Title order={2}>{count ?? '-'}</Title>
      </Card>
    </Stack>
  )
}
