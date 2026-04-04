/**
 * api.ts — Dual-mode API layer
 * If Supabase is configured → uses real Supabase DB + Auth
 * If not configured (env vars missing) → falls back to localStorage mock
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import fallbackProducts from '../data/products'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface ApiProduct {
  id: number
  name: string
  nameTa?: string
  category: string
  remedy: string[]
  price: number
  offerPrice?: number
  description: string
  descriptionTa?: string
  benefits: string
  benefitsTa?: string
  image: string
  imageUrl?: string
  image_url?: string
  stock: number
  unit: string
  rating: number
}

export interface ApiOrder {
  id: string
  invoice_no: string
  customer_name: string
  phone: string
  address: string
  items: any[]
  subtotal: number
  shipping: number
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  created_at: string
  user_id?: string
}

// ─────────────────────────────────────────────────────────────
// localStorage helpers (fallback mode)
// ─────────────────────────────────────────────────────────────
const getDb = (key: string, defaultValue: any) => {
  try {
    const data = localStorage.getItem(`siddha_${key}`)
    return data ? JSON.parse(data) : defaultValue
  } catch { return defaultValue }
}
const setDb = (key: string, value: any) => {
  try { localStorage.setItem(`siddha_${key}`, JSON.stringify(value)) } catch {}
}

// Seed localStorage on first load
if (!localStorage.getItem('siddha_products')) {
  const formattedProds = fallbackProducts.map((p: any) => ({
    ...p,
    remedy: Array.isArray(p.remedy) ? p.remedy : [],
    image: p.image || p.imageUrl || '/assets/images/default-herb.jpg',
    unit: p.unit || '100g',
    rating: p.rating || 4.7,
  }))
  setDb('products', formattedProds)
}
if (!localStorage.getItem('siddha_categories')) {
  setDb('categories', [
    { id: 1, name_en: 'Herbal Powder', name_ta: 'மூலிகை பொடி', created_at: new Date().toISOString() },
    { id: 2, name_en: 'Herbal Oil', name_ta: 'மூலிகை எண்ணெய்', created_at: new Date().toISOString() },
    { id: 3, name_en: 'Herbal Root', name_ta: 'மூலிகை வேர்', created_at: new Date().toISOString() },
    { id: 4, name_en: 'Herbal Spice', name_ta: 'மூலிகை மசாலா', created_at: new Date().toISOString() },
    { id: 5, name_en: 'Herbal Gel', name_ta: 'மூலிகை ஜெல்', created_at: new Date().toISOString() },
    { id: 6, name_en: 'Mineral Herb', name_ta: 'தாது மூலிகை', created_at: new Date().toISOString() },
  ])
}
if (!localStorage.getItem('siddha_health_tags')) {
  setDb('health_tags', [
    { id: 1, name_en: 'Cold & Cough', name_ta: 'சளி மற்றும் இருமல்', created_at: new Date().toISOString() },
    { id: 2, name_en: 'Digestion', name_ta: 'செரிமானம்', created_at: new Date().toISOString() },
    { id: 3, name_en: 'Hair Growth', name_ta: 'முடி வளர்ச்சி', created_at: new Date().toISOString() },
    { id: 4, name_en: 'Immunity', name_ta: 'நோய் எதிர்ப்பு சக்தி', created_at: new Date().toISOString() },
    { id: 5, name_en: 'Skin Care', name_ta: 'சரும பராமரிப்பு', created_at: new Date().toISOString() },
    { id: 6, name_en: 'Stress', name_ta: 'மன அழுத்தம்', created_at: new Date().toISOString() },
    { id: 7, name_en: 'Fever', name_ta: 'காய்ச்சல்', created_at: new Date().toISOString() },
  ])
}

// ─────────────────────────────────────────────────────────────
// Map Supabase row → ApiProduct
// ─────────────────────────────────────────────────────────────
function mapProduct(row: any): ApiProduct {
  return {
    id: row.id,
    name: row.name,
    nameTa: row.name_ta,
    category: row.category,
    remedy: Array.isArray(row.remedy) ? row.remedy : [],
    price: Number(row.price),
    offerPrice: row.offer_price ? Number(row.offer_price) : undefined,
    description: row.description || '',
    descriptionTa: row.description_ta,
    benefits: row.benefits || '',
    benefitsTa: row.benefits_ta,
    image: row.image || '/assets/images/default-herb.jpg',
    stock: row.stock,
    unit: row.unit || '100g',
    rating: Number(row.rating) || 4.7,
  }
}

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────
export const api = {
  // ── Products ──────────────────────────────────────────────
  getProducts: async (): Promise<ApiProduct[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (error) throw error
      if (data && data.length > 0) return data.map(mapProduct)
      // If no products in DB yet, return localStorage seed
    }
    return getDb('products', fallbackProducts) as ApiProduct[]
  },

  getProductById: async (id: number): Promise<ApiProduct> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) throw new Error('Product not found')
      return mapProduct(data)
    }
    const p = getDb('products', []).find((x: any) => x.id === id)
    if (!p) throw new Error('Product not found')
    return p as ApiProduct
  },

  createProduct: async (product: Partial<ApiProduct>): Promise<ApiProduct> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').insert([{
        name: product.name,
        name_ta: product.nameTa,
        category: product.category,
        remedy: product.remedy || [],
        price: product.price,
        offer_price: product.offerPrice || null,
        description: product.description,
        description_ta: product.descriptionTa,
        benefits: product.benefits,
        benefits_ta: product.benefitsTa,
        image: product.image,
        stock: product.stock,
        unit: product.unit || '100g',
        rating: product.rating || 4.7,
      }]).select().single()
      if (error) throw error
      return mapProduct(data)
    }
    const products = getDb('products', [])
    const newProduct = { ...product, id: Date.now() }
    setDb('products', [newProduct, ...products])
    return newProduct as ApiProduct
  },

  updateProduct: async (id: number, payload: Partial<ApiProduct>): Promise<ApiProduct> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').update({
        name: payload.name,
        name_ta: payload.nameTa,
        category: payload.category,
        remedy: payload.remedy || [],
        price: payload.price,
        offer_price: payload.offerPrice || null,
        description: payload.description,
        description_ta: payload.descriptionTa,
        benefits: payload.benefits,
        benefits_ta: payload.benefitsTa,
        image: payload.image,
        stock: payload.stock,
        unit: payload.unit,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single()
      if (error) throw error
      return mapProduct(data)
    }
    let products = getDb('products', [])
    let updated: any = null
    products = products.map((p: any) => {
      if (p.id === id) { updated = { ...p, ...payload }; return updated }
      return p
    })
    setDb('products', products)
    return updated as ApiProduct
  },

  deleteProduct: async (id: number): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      return
    }
    setDb('products', getDb('products', []).filter((p: any) => p.id !== id))
  },

  // ── Categories ────────────────────────────────────────────
  getCategories: async () => {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('categories').select('*').order('id')
      return data || []
    }
    return getDb('categories', [])
  },

  addCategory: async (cat: { name_en: string; name_ta: string }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('categories').insert([cat]).select().single()
      if (error) throw error
      return data
    }
    const cats = getDb('categories', [])
    const newCat = { ...cat, id: Date.now(), created_at: new Date().toISOString() }
    setDb('categories', [...cats, newCat])
    return newCat
  },

  deleteCategory: async (id: number): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabase.from('categories').delete().eq('id', id)
      return
    }
    setDb('categories', getDb('categories', []).filter((x: any) => x.id !== id))
  },

  // ── Health Tags ───────────────────────────────────────────
  getHealthTags: async () => {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('health_tags').select('*').order('id')
      return data || []
    }
    return getDb('health_tags', [])
  },

  addHealthTag: async (tag: { name_en: string; name_ta: string }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('health_tags').insert([tag]).select().single()
      if (error) throw error
      return data
    }
    const tags = getDb('health_tags', [])
    const newTag = { ...tag, id: Date.now(), created_at: new Date().toISOString() }
    setDb('health_tags', [...tags, newTag])
    return newTag
  },

  deleteHealthTag: async (id: number): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabase.from('health_tags').delete().eq('id', id)
      return
    }
    setDb('health_tags', getDb('health_tags', []).filter((x: any) => x.id !== id))
  },

  // ── Orders ────────────────────────────────────────────────
  createOrder: async (order: {
    name: string; phone: string; address: string;
    items: any[]; subtotal: number; shipping: number; total: number;
    userId?: string
  }): Promise<ApiOrder> => {
    // Get invoice number
    let invoiceNo = ''
    if (isSupabaseConfigured) {
      const { data } = await supabase.rpc('get_next_invoice_no')
      invoiceNo = data || `INV-${new Date().getFullYear()}-${Date.now()}`
    } else {
      let counter = parseInt(localStorage.getItem('siddha_invoice_counter') || '0', 10)
      counter += 1
      localStorage.setItem('siddha_invoice_counter', counter.toString())
      invoiceNo = `INV-${new Date().getFullYear()}-${counter.toString().padStart(4, '0')}`
    }

    const orderData: any = {
      invoice_no: invoiceNo,
      customer_name: order.name,
      phone: order.phone,
      address: order.address,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: 'pending',
    }

    if (isSupabaseConfigured) {
      // Get the current user session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) orderData.user_id = user.id

      const { data, error } = await supabase.from('orders').insert([orderData]).select().single()
      if (error) throw error
      return data as ApiOrder
    }

    // localStorage fallback
    const newOrder = { ...orderData, id: Date.now().toString(), created_at: new Date().toISOString() }
    const orders = getDb('orders', [])
    setDb('orders', [newOrder, ...orders])

    // Update user orders array
    const sid = localStorage.getItem('siddha_session')
    if (sid && sid !== 'admin-id') {
      let users = getDb('users', [])
      users = users.map((u: any) => {
        if (u.id === sid) return { ...u, orders: [newOrder, ...(u.orders || [])] }
        return u
      })
      setDb('users', users)
    }

    return newOrder as ApiOrder
  },

  getMyOrders: async (userId?: string): Promise<ApiOrder[]> => {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) return []
      return data as ApiOrder[]
    }
    // localStorage fallback
    const sid = userId || localStorage.getItem('siddha_session')
    if (!sid) return []
    const users = getDb('users', [])
    const u = users.find((x: any) => x.id === sid)
    return (u?.orders || []) as ApiOrder[]
  },

  getAllOrders: async (): Promise<ApiOrder[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) return []
      return data as ApiOrder[]
    }
    return getDb('orders', []) as ApiOrder[]
  },

  updateOrderStatus: async (id: string, status: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabase.from('orders').update({ status }).eq('id', id)
      return
    }
    const orders = getDb('orders', [])
    setDb('orders', orders.map((o: any) => o.id === id ? { ...o, status } : o))
  },

  // ── Summary (admin) ───────────────────────────────────────
  getSummary: async () => {
    if (isSupabaseConfigured) {
      const [prods, orders] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
      ])
      const totalRevenue = (orders.data || []).reduce((s: number, o: any) => s + Number(o.total), 0)
      return {
        totalProducts: prods.count || 0,
        totalOrders: orders.data?.length || 0,
        totalRevenue,
      }
    }
    const products = getDb('products', [])
    let users = getDb('users', [])
    let revenue = 0, ordersCount = 0
    users.forEach((u: any) => {
      if (u.orders) {
        u.orders.forEach((o: any) => { ordersCount++; revenue += (o.total || 0) })
      }
    })
    return { totalProducts: products.length, totalOrders: ordersCount, totalRevenue: revenue }
  },
}
