import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type ApiProduct } from '../services/api'
import { authService, type AuthUser } from '../services/authService'
import fallbackProducts from '../data/products'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface Product extends ApiProduct {}

export interface CartItem extends Product {
  qty: number
}

export { type AuthUser }

// ─────────────────────────────────────────────────────────────
// Auth Store
// ─────────────────────────────────────────────────────────────
interface AuthState {
  user: AuthUser | null
  loading: boolean
  setAuth: (user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  setAuth: (user) => set({ user }),

  logout: async () => {
    await authService.signOut()
    set({ user: null })
  },

  isAuthenticated: () => !!get().user,
  isAdmin: () => get().user?.role === 'admin',

  initialize: async () => {
    set({ loading: true })
    try {
      const user = await authService.getCurrentUser()
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }

    // Subscribe to auth changes (Supabase real-time)
    authService.onAuthStateChange((user) => {
      set({ user })
    })
  },
}))

// ─────────────────────────────────────────────────────────────
// Product Store
// ─────────────────────────────────────────────────────────────
interface ProductState {
  products: Product[]
  loading: boolean
  error: string | null
  fetchProducts: () => Promise<void>
  upsertProduct: (product: Product) => void
  removeProduct: (id: number) => void
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.getProducts()
      set({ products: response, loading: false })
    } catch {
      set({ loading: false, products: fallbackProducts as any, error: 'Failed to load products' })
    }
  },

  upsertProduct: (product) => {
    const existing = get().products.find(item => item.id === product.id)
    if (existing) {
      set({ products: get().products.map(item => item.id === product.id ? product : item) })
    } else {
      set({ products: [product, ...get().products] })
    }
  },

  removeProduct: (id) => {
    set({ products: get().products.filter(item => item.id !== id) })
  },
}))

// ─────────────────────────────────────────────────────────────
// Cart Store
// ─────────────────────────────────────────────────────────────
interface CartState {
  items: CartItem[]
  isOpen: boolean
  add: (p: Product) => void
  remove: (id: number) => void
  updateQty: (id: number, qty: number) => void
  clear: () => void
  total: () => number
  count: () => number
  setOpen: (v: boolean) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setOpen: (v) => set({ isOpen: v }),
      add: (product) => {
        const items = get().items
        const existing = items.find(item => item.id === product.id)
        if (existing) {
          set({ items: items.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) })
        } else {
          set({ items: [...items, { ...product, qty: 1 }] })
        }
        get().setOpen(true)
      },
      remove: (id) => set(state => ({ items: state.items.filter(item => item.id !== id) })),
      updateQty: (id, qty) => {
        if (qty < 1) { get().remove(id); return }
        set(state => ({ items: state.items.map(item => item.id === id ? { ...item, qty } : item) }))
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + (item.offerPrice || item.price) * item.qty, 0),
      count: () => get().items.reduce((sum, item) => sum + item.qty, 0),
    }),
    { name: 'srisiddha-cart' },
  ),
)

// ─────────────────────────────────────────────────────────────
// Favorites Store
// ─────────────────────────────────────────────────────────────
interface FavState {
  items: Product[]
  isOpen: boolean
  toggle: (p: Product) => void
  isFav: (id: number) => boolean
  setOpen: (v: boolean) => void
}

export const useFavStore = create<FavState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setOpen: (v) => set({ isOpen: v }),
      toggle: (product) => {
        const exists = !!get().items.find(item => item.id === product.id)
        if (exists) {
          set(state => ({ items: state.items.filter(item => item.id !== product.id) }))
        } else {
          set(state => ({ items: [...state.items, product] }))
        }
      },
      isFav: (id) => !!get().items.find(item => item.id === id),
    }),
    { name: 'srisiddha-favorites' },
  ),
)
