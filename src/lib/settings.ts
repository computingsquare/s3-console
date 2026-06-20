import { useLocalStorage } from '@mantine/hooks'

// 'flat'  = raw S3 listing, all keys in the bucket, no '/' splitting (paginated, can be huge)
// 'tree'  = filesystem-style navigation: click a folder to open it (delimiter-based)
export type ViewMode = 'flat' | 'tree'

export function useViewMode() {
  return useLocalStorage<ViewMode>({ key: 's3-console:view-mode', defaultValue: 'tree' })
}

export type PaginationMode = 'classic' | 'scroll'

export function usePaginationMode() {
  return useLocalStorage<PaginationMode>({ key: 's3-console:pagination-mode', defaultValue: 'classic' })
}
