import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDownload,
  IconFile,
  IconFileCode,
  IconFileSpreadsheet,
  IconFileText,
  IconFileZip,
  IconFolder,
  IconFolderPlus,
  IconPhoto,
  IconUpload,
  IconVideo,
  IconX,
} from '@tabler/icons-react'
import { useAuth } from '../../app/providers/useAuth'
import { api, uploadObject, type BucketSummary, type ObjectEntry, type Tag } from '../../lib/api'
import { classifyApiError } from '../../lib/errors'
import { formatBytes } from '../../lib/format'
import { usePaginationMode, useViewMode } from '../../lib/settings'
import { PreviewPane } from './PreviewPane'

const FLAT_PAGE_SIZE = 50

interface UploadState {
  progress: number
  status: 'uploading' | 'done' | 'error'
}

function fileIcon(key: string, size = 15) {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif'].includes(ext))
    return <IconPhoto size={size} />
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'].includes(ext))
    return <IconVideo size={size} />
  if (['pdf'].includes(ext))
    return <IconFileText size={size} />
  if (['zip', 'gz', 'tar', 'bz2', 'xz', 'rar', '7z', 'zst'].includes(ext))
    return <IconFileZip size={size} />
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'json'].includes(ext))
    return <IconFileCode size={size} />
  if (['csv', 'parquet', 'xlsx', 'xls', 'ods'].includes(ext))
    return <IconFileSpreadsheet size={size} />
  if (['txt', 'md', 'rst', 'log'].includes(ext))
    return <IconFileText size={size} />
  return <IconFile size={size} />
}

export function ObjectsPage() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const params = useParams<{ bucketName: string; '*': string }>()
  const bucketName = params.bucketName!
  const routePrefix = params['*'] ?? ''
  const [viewMode] = useViewMode()
  const [paginationMode] = usePaginationMode()
  const isFlat = viewMode === 'flat'
  const prefix = isFlat ? '' : routePrefix
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [folders, setFolders] = useState<string[]>([])
  const [treeFiles, setTreeFiles] = useState<ObjectEntry[]>([])

  const [flatFiles, setFlatFiles] = useState<ObjectEntry[]>([])
  const [flatPageTokens, setFlatPageTokens] = useState<(string | undefined)[]>([undefined])
  const [flatPageIndex, setFlatPageIndex] = useState(0)
  const [flatNextToken, setFlatNextToken] = useState<string | undefined>(undefined)
  const [flatHasMore, setFlatHasMore] = useState(false)
  const [flatLoadingMore, setFlatLoadingMore] = useState(false)

  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [nameFilter, setNameFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [tagMatches, setTagMatches] = useState<Set<string> | null>(null)
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [panelExpanded, setPanelExpanded] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyTarget, setCopyTarget] = useState<string | null>(null)
  const [copyBusy, setCopyBusy] = useState(false)
  const [otherBuckets, setOtherBuckets] = useState<BucketSummary[]>([])
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [mkdirName, setMkdirName] = useState('')

  const files = isFlat ? flatFiles : treeFiles

  const refreshTree = async () => {
    setLoading(true)
    try {
      const res = await api.listObjects(bucketName, prefix)
      setFolders(res.folders)
      setTreeFiles(res.files.filter((f) => f.key !== prefix))
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setLoading(false)
    }
  }

  const fetchFlatPage = async (pageIndex: number, tokens: (string | undefined)[]) => {
    setLoading(true)
    try {
      const res = await api.listObjects(bucketName, '', {
        flat: true,
        continuationToken: tokens[pageIndex],
        maxKeys: FLAT_PAGE_SIZE,
      })
      setFlatFiles(res.files)
      setFlatHasMore(Boolean(res.nextContinuationToken))
      setFlatPageTokens((prev) => {
        if (!res.nextContinuationToken || prev[pageIndex + 1] !== undefined) return prev
        const next = [...prev]
        next[pageIndex + 1] = res.nextContinuationToken
        return next
      })
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setLoading(false)
    }
  }

  const fetchFlatScrollMore = async (token: string | undefined, replace: boolean) => {
    setFlatLoadingMore(true)
    if (replace) setLoading(true)
    try {
      const res = await api.listObjects(bucketName, '', { flat: true, continuationToken: token, maxKeys: FLAT_PAGE_SIZE })
      setFlatFiles((prev) => (replace ? res.files : [...prev, ...res.files]))
      setFlatNextToken(res.nextContinuationToken)
      setFlatHasMore(Boolean(res.nextContinuationToken))
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setFlatLoadingMore(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection/pagination on navigation/mode change
    setSelectedKey(null)
    setSelectedKeys(new Set())
    if (!isFlat) {
      refreshTree()
      return
    }
    setFlatPageIndex(0)
    setFlatPageTokens([undefined])
    if (paginationMode === 'classic') {
      fetchFlatPage(0, [undefined])
    } else {
      fetchFlatScrollMore(undefined, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketName, prefix, viewMode, paginationMode, refreshToken])

  useEffect(() => {
    if (!tagFilter.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bail-out branch of an otherwise async, cancellable effect
      setTagMatches(null)
      return
    }
    let cancelled = false
    Promise.all(
      files.map((file) =>
        api
          .tagsObject(bucketName, file.key!)
          .then((res) => ({ key: file.key!, match: matchesTag(res.tags, tagFilter) }))
          .catch(() => ({ key: file.key!, match: false })),
      ),
    ).then((results) => {
      if (!cancelled) setTagMatches(new Set(results.filter((r) => r.match).map((r) => r.key)))
    })
    return () => { cancelled = true }
  }, [tagFilter, files, bucketName])

  const keyName = (key: string) => key.slice(prefix.length)
  const folderName = (folderPrefix: string) => folderPrefix.slice(prefix.length).replace(/\/$/, '')
  const goTo = (newPrefix: string) => navigate(`/buckets/${bucketName}/${newPrefix}`.replace(/\/+/g, '/'))
  const breadcrumbSegments = prefix.split('/').filter(Boolean)

  const visibleFiles = useMemo(() => {
    const filterLower = nameFilter.trim().toLowerCase()
    return files.filter(
      (f) =>
        keyName(f.key!).toLowerCase().includes(filterLower) &&
        (tagMatches === null || tagMatches.has(f.key!)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, nameFilter, tagMatches, prefix])

  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every((f) => selectedKeys.has(f.key!))
  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      visibleFiles.forEach((f) => (allVisibleSelected ? next.delete(f.key!) : next.add(f.key!)))
      return next
    })
  }
  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleUpload = async (uploadedFiles: File[]) => {
    for (const file of uploadedFiles) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const key = `${prefix}${relativePath}`
      setUploads((prev) => ({ ...prev, [key]: { progress: 0, status: 'uploading' } }))
      setPanelExpanded(true)
      try {
        await uploadObject(bucketName, key, file, (percent) =>
          setUploads((prev) => ({ ...prev, [key]: { progress: percent, status: 'uploading' } })),
        )
        setUploads((prev) => ({ ...prev, [key]: { progress: 100, status: 'done' } }))
        setRefreshToken((v) => v + 1)
      } catch (error) {
        setUploads((prev) => ({ ...prev, [key]: { progress: 0, status: 'error' } }))
        notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteKey) return
    try {
      await api.deleteObjects(bucketName, [deleteKey])
      notifications.show({ color: 'green', message: t('objects.deleteSuccess', { name: deleteKey }) })
      if (selectedKey === deleteKey) setSelectedKey(null)
      setDeleteKey(null)
      setRefreshToken((v) => v + 1)
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    }
  }

  const confirmBulkDelete = async () => {
    try {
      await api.deleteObjects(bucketName, [...selectedKeys])
      notifications.show({ color: 'green', message: t('objects.deleteSuccess', { name: `${selectedKeys.size}` }) })
      setBulkDeleteOpen(false)
      setSelectedKeys(new Set())
      setRefreshToken((v) => v + 1)
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    }
  }

  const openCopy = () => {
    setCopyTarget(null)
    setCopyOpen(true)
    api.listBuckets().then((res) => setOtherBuckets(res.buckets.filter((b) => b.name !== bucketName)))
  }

  const confirmCopy = async () => {
    if (!copyTarget) return
    setCopyBusy(true)
    try {
      await api.copyObjects(bucketName, [...selectedKeys], copyTarget)
      notifications.show({ color: 'green', message: t('objects.copySuccess', { count: selectedKeys.size }) })
      setCopyOpen(false)
      setSelectedKeys(new Set())
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    } finally {
      setCopyBusy(false)
    }
  }

  const downloadSelection = async () => {
    setDownloadBusy(true)
    try {
      await api.downloadObjects(bucketName, [...selectedKeys])
    } catch {
      notifications.show({ color: 'red', message: t('errors.unknown') })
    } finally {
      setDownloadBusy(false)
    }
  }

  const confirmMkdir = async () => {
    const name = mkdirName.trim().replace(/\/+$/, '')
    if (!name) return
    const newPrefix = `${prefix}${name}/`
    try {
      await api.mkdir(bucketName, newPrefix)
      setMkdirOpen(false)
      setMkdirName('')
      setRefreshToken((v) => v + 1)
    } catch (error) {
      notifications.show({ color: 'red', message: t(`errors.${classifyApiError(error)}`) })
    }
  }

  const goFlatPage = (newIndex: number) => {
    setFlatPageIndex(newIndex)
    fetchFlatPage(newIndex, flatPageTokens)
  }

  const renderFileRow = (file: ObjectEntry) => (
    <Group
      key={file.key}
      justify="space-between"
      wrap="nowrap"
      bg={selectedKey === file.key ? 'var(--mantine-color-default-hover)' : undefined}
      style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}
      onClick={() => setSelectedKey(file.key!)}
    >
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Checkbox
          checked={selectedKeys.has(file.key!)}
          onChange={() => toggleSelect(file.key!)}
          onClick={(e) => e.stopPropagation()}
        />
        <Text c="dimmed" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {fileIcon(file.key!)}
        </Text>
        <Text truncate size="sm">{keyName(file.key!)}</Text>
      </Group>
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        {formatBytes(file.size ?? 0)}
      </Text>
    </Group>
  )

  const isEmpty = !loading && (isFlat ? visibleFiles.length === 0 : folders.length === 0 && visibleFiles.length === 0)

  const allUploadEntries = Object.entries(uploads)
  const activeCount = allUploadEntries.filter(([, s]) => s.status === 'uploading').length

  return (
    <Stack h="calc(100vh - 110px)">
      <Title order={2}>{bucketName}</Title>

      {isAdmin && (
        <Group gap="xs">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              if (picked.length > 0) handleUpload(picked)
              e.target.value = ''
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
            // @ts-expect-error webkitdirectory not in HTML types
            webkitdirectory=""
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              if (picked.length > 0) handleUpload(picked)
              e.target.value = ''
            }}
          />
          <Button
            variant="default"
            leftSection={<IconUpload size={15} />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('objects.upload')}
          </Button>
          <Button
            variant="default"
            leftSection={<IconFolder size={15} />}
            onClick={() => folderInputRef.current?.click()}
          >
            {t('objects.uploadFolder')}
          </Button>
          {!isFlat && (
            <Button
              variant="default"
              leftSection={<IconFolderPlus size={15} />}
              onClick={() => { setMkdirName(''); setMkdirOpen(true) }}
            >
              {t('objects.createPath')}
            </Button>
          )}
        </Group>
      )}

      <Group wrap="nowrap">
        <TextInput
          placeholder={t('objects.filterName')}
          value={nameFilter}
          onChange={(e) => setNameFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput
          placeholder={t('objects.filterTag')}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
      </Group>
      <Text size="xs" c="dimmed">{t('objects.tagFilterNote')}</Text>

      {selectedKeys.size > 0 && (
        <Group justify="space-between" bg="var(--mantine-color-default-hover)" p="xs" style={{ borderRadius: 4 }}>
          <Text size="sm">{t('objects.selectedCount', { count: selectedKeys.size })}</Text>
          <Group gap="xs">
            <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} loading={downloadBusy} onClick={downloadSelection}>
              {t('objects.downloadSelected')}
            </Button>
            {isAdmin && (
              <Button size="xs" variant="default" onClick={openCopy}>
                {t('objects.copySelected')}
              </Button>
            )}
            {isAdmin && (
              <Button size="xs" color="red" variant="default" onClick={() => setBulkDeleteOpen(true)}>
                {t('objects.deleteSelected')}
              </Button>
            )}
          </Group>
        </Group>
      )}

      <Group flex={1} align="stretch" wrap="nowrap" style={{ overflow: 'hidden' }}>
        <ScrollArea
          style={{ flex: 1, borderRight: '1px solid var(--mantine-color-default-border)' }}
          pr="md"
          onBottomReached={() => {
            if (isFlat && paginationMode === 'scroll' && flatHasMore && !flatLoadingMore) {
              fetchFlatScrollMore(flatNextToken, false)
            }
          }}
        >
          <Stack gap={2}>
            {!isFlat && (
              <Breadcrumbs>
                <Anchor onClick={() => navigate('/buckets')}>{t('objects.root')}</Anchor>
                <Anchor onClick={() => goTo('')}>{bucketName}</Anchor>
                {breadcrumbSegments.map((segment, idx) => (
                  <Anchor key={idx} onClick={() => goTo(breadcrumbSegments.slice(0, idx + 1).join('/') + '/')}>
                    {segment}
                  </Anchor>
                ))}
              </Breadcrumbs>
            )}

            {isEmpty && <Text c="dimmed">{t('objects.empty')}</Text>}

            {!isFlat &&
              folders.map((folderPrefix) => (
                <Group
                  key={folderPrefix}
                  gap="xs"
                  wrap="nowrap"
                  onClick={() => goTo(folderPrefix)}
                  style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}
                >
                  <IconFolder size={15} color="var(--mantine-color-yellow-6)" />
                  <Text size="sm">{folderName(folderPrefix)}</Text>
                </Group>
              ))}

            {visibleFiles.length > 0 && (
              <Checkbox
                label={t('common.selectAll')}
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                mt={4}
                mb={2}
              />
            )}
            {visibleFiles.map(renderFileRow)}

            {isFlat && paginationMode === 'classic' && (
              <Group justify="center" gap="sm" mt="xs">
                <Button
                  variant="default"
                  size="xs"
                  disabled={flatPageIndex === 0 || loading}
                  onClick={() => goFlatPage(flatPageIndex - 1)}
                >
                  <IconChevronLeft size={14} />
                </Button>
                <Text size="sm">{t('objects.page', { page: flatPageIndex + 1 })}</Text>
                <Button
                  variant="default"
                  size="xs"
                  disabled={!flatHasMore || loading}
                  onClick={() => goFlatPage(flatPageIndex + 1)}
                >
                  <IconChevronRight size={14} />
                </Button>
              </Group>
            )}
            {isFlat && paginationMode === 'scroll' && flatLoadingMore && (
              <Text size="xs" c="dimmed" ta="center">{t('common.loading')}</Text>
            )}
          </Stack>
        </ScrollArea>

        <ScrollArea style={{ flex: 1 }} pl="md">
          <PreviewPane key={selectedKey} bucket={bucketName} objectKey={selectedKey} isAdmin={isAdmin} onDelete={setDeleteKey} />
        </ScrollArea>
      </Group>

      {/* Background upload panel */}
      {allUploadEntries.length > 0 && (
        <Paper
          shadow="lg"
          withBorder
          style={{ position: 'fixed', bottom: 16, right: 16, width: 360, zIndex: 300 }}
        >
          <Group
            justify="space-between"
            p="xs"
            style={{
              cursor: 'pointer',
              borderBottom: panelExpanded ? '1px solid var(--mantine-color-default-border)' : 'none',
            }}
            onClick={() => setPanelExpanded((v) => !v)}
          >
            <Text size="sm" fw={500}>
              {activeCount > 0
                ? t('objects.uploadsInProgress', { count: activeCount })
                : t('objects.uploadsDone', { total: allUploadEntries.length })}
            </Text>
            <Group gap={4}>
              <ActionIcon size="xs" variant="transparent" component="div">
                {panelExpanded ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
              </ActionIcon>
              <ActionIcon
                size="xs"
                variant="transparent"
                component="div"
                onClick={(e) => {
                  e.stopPropagation()
                  setUploads({})
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
          </Group>
          {panelExpanded && (
            <ScrollArea mah={240} p="xs">
              <Stack gap={6}>
                {allUploadEntries.map(([key, state]) => (
                  <div key={key}>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {key.split('/').pop()}
                      </Text>
                      <Text size="xs" c={state.status === 'error' ? 'red' : state.status === 'done' ? 'green' : 'dimmed'} style={{ flexShrink: 0 }}>
                        {state.status === 'error' ? '✗' : state.status === 'done' ? '✓' : `${state.progress}%`}
                      </Text>
                    </Group>
                    <Progress
                      value={state.progress}
                      color={state.status === 'error' ? 'red' : state.status === 'done' ? 'green' : 'blue'}
                      size="xs"
                      animated={state.status === 'uploading'}
                    />
                  </div>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Paper>
      )}

      {/* Create path modal */}
      <Modal opened={mkdirOpen} onClose={() => setMkdirOpen(false)} title={t('objects.createPath')}>
        <Stack>
          <Text size="sm" c="dimmed">
            {t('objects.createPathHint', { prefix: prefix || '/' })}
          </Text>
          <TextInput
            label={t('objects.createPathLabel')}
            placeholder="my-folder/subfolder"
            value={mkdirName}
            onChange={(e) => setMkdirName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmMkdir()}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setMkdirOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={confirmMkdir} disabled={!mkdirName.trim()}>{t('common.create')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteKey} onClose={() => setDeleteKey(null)} title={t('common.delete')}>
        <Stack>
          <Text>{t('objects.confirmDelete', { name: deleteKey })}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteKey(null)}>{t('common.cancel')}</Button>
            <Button color="red" onClick={confirmDelete}>{t('common.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title={t('common.delete')}>
        <Stack>
          <Text>{t('objects.confirmDeleteSelected', { count: selectedKeys.size })}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setBulkDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button color="red" onClick={confirmBulkDelete}>{t('common.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={copyOpen} onClose={() => setCopyOpen(false)} title={t('objects.copyTitle', { count: selectedKeys.size })}>
        <Stack>
          <Select
            label={t('objects.destinationBucket')}
            data={otherBuckets.map((b) => ({ value: b.name, label: b.name }))}
            value={copyTarget}
            onChange={setCopyTarget}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCopyOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={confirmCopy} disabled={!copyTarget} loading={copyBusy}>{t('common.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

function matchesTag(tags: Tag[], filter: string): boolean {
  const lower = filter.trim().toLowerCase()
  return tags.some((tag) => tag.Key.toLowerCase().includes(lower) || tag.Value.toLowerCase().includes(lower))
}
