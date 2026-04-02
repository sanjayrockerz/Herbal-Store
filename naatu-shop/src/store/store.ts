import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type ApiProduct } from '../services/api'
import fallbackProducts from '../data/products'

export interface Product {
  id: number
  name: string
  category: string
  remedy: string[]
  price: number
  unit: string
  rating: number
  stock: number
  description: string
  benefits: string
  nameTa?: string
  benefitsTa?: string
  image: string
}

export interface CartItem extends Product {
  qty: number
}

interface AuthUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'customer'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

interface ProductState {
  products: Product[]
  loading: boolean
  error: string | null
  fetchProducts: () => Promise<void>
  upsertProduct: (product: Product) => void
  removeProduct: (id: number) => void
}

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

interface FavState {
  items: Product[]
  isOpen: boolean
  toggle: (p: Product) => Promise<void>
  isFav: (id: number) => boolean
  setOpen: (v: boolean) => void
  syncFromServer: () => Promise<void>
}

function toProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    remedy: [],
    price: product.price,
    unit: '100g',
    rating: 4.7,
    stock: product.stock,
    description: product.description,
    benefits: product.benefits,
    image: product.imageUrl || product.image_url || '/assets/images/default-herb.jpg',
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('srisiddha-token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('srisiddha-token')
        set({ token: null, user: null })
      },
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'srisiddha-auth' },
  ),
)

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.getProducts()
      set({ products: response.map(toProduct), loading: false })
    } catch (error) {
      set({
        loading: false,
        products: fallbackProducts,
        error: error instanceof Error ? error.message : 'Failed to load products',
      })
    }
  },
  upsertProduct: (product) => {
    const existing = get().products.find((item) => item.id === product.id)
    if (existing) {
      set({ products: get().products.map((item) => (item.id === product.id ? product : item)) })
    } else {
      set({ products: [product, ...get().products] })
    }
  },
  removeProduct: (id) => {
    set({ products: get().products.filter((item) => item.id !== id) })
  },
}))

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setOpen: (v) => set({ isOpen: v }),
      add: (product) => {
        const items = get().items
        const existing = items.find((item) => item.id === product.id)
        if (existing) {
          set({ items: items.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item)) })
        } else {
          set({ items: [...items, { ...product, qty: 1 }] })
        }
      },
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      updateQty: (id, qty) => {
        if (qty < 1) {
          get().remove(id)
          return
        }
        set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, qty } : item)) }))
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
      count: () => get().items.reduce((sum, item) => sum + item.qty, 0),
    }),
    { name: 'srisiddha-cart' },
  ),
)

export const useFavStore = create<FavState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setOpen: (v) => set({ isOpen: v }),
      toggle: async (product) => {
        const auth = useAuthStore.getState()
        const exists = !!get().items.find((item) => item.id === product.id)

        if (auth.token) {
          if (exists) {
            await api.removeFavorite(product.id)
            set((state) => ({ items: state.items.filter((item) => item.id !== product.id) }))
          } else {
            await api.addFavorite(product.id)
            set((state) => ({ items: [...state.items, product] }))
          }
          return
        }

        if (exists) {
          set((state) => ({ items: state.items.filter((item) => item.id !== product.id) }))
        } else {
          set((state) => ({ items: [...state.items, product] }))
        }
      },
      isFav: (id) => !!get().items.find((item) => item.id === id),
      syncFromServer: async () => {
        const auth = useAuthStore.getState()
        if (!auth.token) {
          return
        }
        const response = await api.getFavorites()
        set({ items: response.map(toProduct) })
      },
    }),
    { name: 'srisiddha-favorites' },
  ),
)
