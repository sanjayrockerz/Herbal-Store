import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface Product {
  id: number
  name: string
  category: string
  remedy: string[]
  price: number
  offerPrice?: number
  unit: string
  rating: number
  stock: number
  description: string
  descriptionTa?: string
  benefits: string
  nameTa?: string
  benefitsTa?: string
  image: string
}

export interface CartItem extends Product {
  qty: number
}

interface AuthUser {
  id: string
  name: string
  email: string
  mobile?: string
  role: 'admin' | 'customer'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  loading: boolean
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  initialize: () => Promise<void>
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

const ADMIN_EMAIL = 'admin@srisiddha.com'
let productsFetchInFlight: Promise<void> | null = null
let lastProductsFetchAt = 0

const hashToPositiveInt = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 1
}

const normalizeProductId = (rawId: unknown, fallbackSeed: string) => {
  const numericId = Number(rawId)
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId
  }
  return hashToPositiveInt(fallbackSeed)
}

const normalizeRemedy = (rawRemedy: unknown) => {
  if (Array.isArray(rawRemedy)) {
    return rawRemedy.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof rawRemedy === 'string' && rawRemedy.trim()) {
    return rawRemedy
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [] as string[]
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: true,
      setAuth: (token, user) => {
        localStorage.setItem('srisiddha-token', token)
        set({ token, user, loading: false })
      },
      logout: () => {
        localStorage.removeItem('srisiddha-token')
        set({ token: null, user: null, loading: false })
      },
      initialize: async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const session = sessionData.session
          if (!session?.access_token || !session.user) {
            set({ token: null, user: null, loading: false })
            return
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          set({
            token: session.access_token,
            user: {
              id: session.user.id,
              name: profile?.name || session.user.email || session.user.phone || 'Customer',
              email: session.user.email || '',
              mobile: profile?.mobile || session.user.phone || '',
              role: profile?.role === 'admin' || session.user.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'customer',
            },
            loading: false,
          })
        } catch {
          set({ token: null, user: null, loading: false })
        }
      },
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin' || get().user?.email?.toLowerCase() === ADMIN_EMAIL,
    }),
    { name: 'srisiddha-auth' },
  ),
)

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  fetchProducts: async () => {
    if (productsFetchInFlight) {
      return productsFetchInFlight
    }

    if (Date.now() - lastProductsFetchAt < 400 && get().products.length > 0) {
      return
    }

    productsFetchInFlight = (async () => {
      set({ loading: true, error: null })
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true })

          if (error) {
            set({ products: [], loading: false, error: error.message || 'Failed to load live products' })
            return
          }

          const liveRows = Array.isArray(data) ? data : []
          if (liveRows.length === 0) {
            set({
              products: [],
              loading: false,
              error: 'Live products table is empty. Admin should add products in Supabase.',
            })
            return
          }

          const mapped = liveRows.map((product: any, index: number) => {
            const name = String(product.name || 'Herbal Product')
            const category = String(product.category || 'Herbal Product')
            const fallbackSeed = `${name}-${category}-${index}`

            return {
              id: normalizeProductId(product.id, fallbackSeed),
              name,
              category,
              remedy: normalizeRemedy(product.remedy),
              price: Number(product.price) || 0,
              offerPrice: product.offer_price == null ? undefined : Number(product.offer_price),
              unit: String(product.unit || '100g'),
              rating: Number(product.rating) || 4.7,
              stock: Number(product.stock) || 0,
              description: String(product.description || ''),
              descriptionTa: String(product.description_ta || ''),
              benefits: String(product.benefits || ''),
              nameTa: String(product.name_ta || name),
              benefitsTa: String(product.benefits_ta || product.benefits || ''),
              image: String(product.image || product.image_url || '/assets/images/default-herb.jpg'),
            }
          }) as Product[]

          set({ products: mapped, loading: false, error: null })
          return
        }

        set({ products: [], loading: false, error: 'Supabase is not configured. Live products cannot be loaded.' })
      } catch (error) {
        set({
          loading: false,
          products: [],
          error: error instanceof Error ? error.message : 'Failed to load live products',
        })
      }
    })().finally(() => {
      lastProductsFetchAt = Date.now()
      productsFetchInFlight = null
    })

    return productsFetchInFlight
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
        const exists = !!get().items.find((item) => item.id === product.id)

        if (exists) {
          set((state) => ({ items: state.items.filter((item) => item.id !== product.id) }))
        } else {
          set((state) => ({ items: [...state.items, product] }))
        }
      },
      isFav: (id) => !!get().items.find((item) => item.id === id),
      syncFromServer: async () => {
        return
      },
    }),
    { name: 'srisiddha-favorites' },
  ),
)
