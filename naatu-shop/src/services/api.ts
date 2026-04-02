import fallbackProducts from '../data/products'

export interface ApiProduct {
  id: number
  name: string
  category: string
  price: number
  description: string
  benefits: string
  image_url?: string
  imageUrl?: string
  image?: string
  stock: number
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: 'admin' | 'customer'
  }
}

// Mock Database helpers for seamless client demo
const getDb = (key: string, defaultValue: any) => {
  const data = localStorage.getItem(`srisiddha-db-${key}`)
  return data ? JSON.parse(data) : defaultValue
}
const setDb = (key: string, value: any) => {
  localStorage.setItem(`srisiddha-db-${key}`, JSON.stringify(value))
}

// Initialize mock DBs
if (!localStorage.getItem('srisiddha-db-products')) {
  setDb('products', fallbackProducts)
}
if (!localStorage.getItem('srisiddha-db-orders')) {
  setDb('orders', [])
}
if (!localStorage.getItem('srisiddha-db-favorites')) {
  setDb('favorites', [])
}

const mockDelay = () => new Promise(res => setTimeout(res, 200))

export const api = {
  health: async () => { await mockDelay(); return { status: 'ok', service: 'mock' } },

  register: async (payload: RegisterPayload) => {
    await mockDelay()
    return { token: 'demo-token', user: { id: 1, name: payload.name, email: payload.email, role: 'admin' as const } }
  },

  login: async (payload: LoginPayload) => {
    await mockDelay()
    return { token: 'demo-token', user: { id: 1, name: 'Admin', email: payload.email, role: 'admin' as const } }
  },

  me: async () => {
    await mockDelay()
    return { id: 1, name: 'Admin', email: 'admin@srisiddha.com', role: 'admin' as const }
  },

  getProducts: async (query?: string) => {
    await mockDelay()
    return getDb('products', []) as ApiProduct[]
  },

  getProductById: async (id: number) => {
    await mockDelay()
    const products = getDb('products', [])
    const p = products.find((p: any) => p.id === id)
    if (!p) throw new Error('Product not found')
    return p as ApiProduct
  },

  createProduct: async (payload: Record<string, unknown>) => {
    await mockDelay()
    const products = getDb('products', [])
    // @ts-ignore
    const newProduct = { ...payload, id: Date.now(), image: payload.imageUrl || '/assets/images/default-herb.jpg' }
    setDb('products', [newProduct, ...products])
    return newProduct as ApiProduct
  },

  updateProduct: async (id: number, payload: Record<string, unknown>) => {
    await mockDelay()
    let products = getDb('products', [])
    let updated = null
    products = products.map((p: any) => {
      if (p.id === id) {
        updated = { ...p, ...payload }
        return updated
      }
      return p
    })
    setDb('products', products)
    return updated as unknown as ApiProduct
  },

  deleteProduct: async (id: number) => {
    await mockDelay()
    const products = getDb('products', [])
    setDb('products', products.filter((p: any) => p.id !== id))
    return { message: 'Deleted successfully' }
  },

  getFavorites: async () => {
    await mockDelay()
    const favIds = getDb('favorites', [])
    const products = getDb('products', [])
    return products.filter((p: any) => favIds.includes(p.id)) as ApiProduct[]
  },

  addFavorite: async (productId: number) => {
    await mockDelay()
    const favIds = getDb('favorites', [])
    if (!favIds.includes(productId)) setDb('favorites', [...favIds, productId])
    return { message: 'Added to favorites' }
  },

  removeFavorite: async (productId: number) => {
    await mockDelay()
    const favIds = getDb('favorites', [])
    setDb('favorites', favIds.filter((id: number) => id !== productId))
    return { message: 'Removed from favorites' }
  },

  createOrder: async (items: Array<{ productId: number; quantity: number }>) => {
    await mockDelay()
    const orders = getDb('orders', [])
    const products = getDb('products', [])
    
    let totalPrice = 0
    items.forEach(item => {
        const p = products.find((p: any) => p.id === item.productId)
        if (p) totalPrice += (p.price * item.quantity)
    })
    
    const newOrder = { id: Date.now(), items, totalPrice, createdAt: new Date().toISOString() }
    setDb('orders', [newOrder, ...orders])
    return newOrder
  },

  getMyOrders: async () => {
    await mockDelay()
    return getDb('orders', [])
  },

  getAllOrders: async () => {
    await mockDelay()
    return getDb('orders', [])
  },

  getSummary: async () => {
    await mockDelay()
    const products = getDb('products', [])
    const orders = getDb('orders', [])
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.totalPrice, 0)
    return { totalProducts: products.length, totalOrders: orders.length, totalRevenue }
  },
}
