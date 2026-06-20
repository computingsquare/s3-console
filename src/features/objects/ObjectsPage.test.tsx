import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { describe, expect, it, vi } from 'vitest'
import '../../i18n'
import { ObjectsPage } from './ObjectsPage'

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api')
  return {
    ...actual,
    api: {
      ...actual.api,
      listObjects: vi.fn().mockResolvedValue({
        folders: ['photos/'],
        files: [{ key: 'readme.txt', size: 1024 }],
      }),
      tagsObject: vi.fn().mockResolvedValue({ tags: [] }),
    },
  }
})

vi.mock('../../app/providers/useAuth', () => ({
  useAuth: () => ({ user: { email: 'a@b.com', role: 'admin' }, isAdmin: true, loading: false, unauthenticated: false }),
}))

vi.mock('../../lib/settings', () => ({
  useViewMode: () => ['tree', vi.fn()],
  usePaginationMode: () => ['classic', vi.fn()],
}))

function renderObjectsPage() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/buckets/my-bucket/']}>
        <Routes>
          <Route path="/buckets/:bucketName/*" element={<ObjectsPage />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('ObjectsPage', () => {
  it('lists folders and files returned by the bucket', async () => {
    renderObjectsPage()
    expect(await screen.findByText('photos')).toBeInTheDocument()
    expect(screen.getByText('readme.txt')).toBeInTheDocument()
  })
})
