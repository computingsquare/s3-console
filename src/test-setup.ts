import '@testing-library/jest-dom/vitest'

window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})
