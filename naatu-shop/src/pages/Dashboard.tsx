import React, { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BarChart2, Trash2, Edit2, List, ShoppingCart, LayoutDashboard, Box, AlertCircle, ArrowUp, ArrowDown, Power } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuthStore, useProductStore, type Product } from '../store/store'
import { uploadProductImage } from '../lib/storage'
import {
  formatCurrency,
  normalizeUnitType,
  toNumber,
  type UnitType,
} from '../lib/retail'

/**
 * SRI SIDDHA HERBAL STORE - ADMIN DASHBOARD
 * Unified Management for Products, Orders, and Categories
 */

type Category = { id: string | number; name_en: string; name_ta: string; is_active?: boolean; sort_order?: number }
type HealthTag = { id: string | number; name_en: string; name_ta: string; is_active?: boolean; sort_order?: number }
type DashboardOrder = {
  id: string
  invoice_no: string
  customer_name: string
  phone: string
  created_at: string
  total: number
  status: string
  user_id: string | null
  items: unknown
}

type TabKey = 'overview' | 'billing' | 'products' | 'categories'

type DashboardAnalytics = {
  revenue: number
  totalOrders: number
  completedOrders: number
  lowStockCount: number
  topProducts: Array<{ name: string; qty: number; revenue: number }>
}

const emptyProductForm = {
  name: '',
  nameTa: '',
  category: '',
  categoryId: null as string | number | null,
  remedy: [] as string[],
  price: 0,
  offerPrice: '' as string | number,
  unitType: 'unit' as UnitType,
  unitLabel: 'piece',
  baseQuantity: 1,
  stockQuantity: 100,
  stockUnit: 'piece',
  allowDecimalQuantity: false,
  predefinedOptionsText: '',
  isActive: true,
  sortOrder: 0,
  stock: 100,
  description: '',
  descriptionTa: '',
  benefits: '',
  benefitsTa: '',
  image: '',
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { products, fetchProducts } = useProductStore()

  const [tab, setTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [productNotice, setProductNotice] = useState('')

  // Data States
  const [cats, setCats] = useState<Category[]>([])
  const [tags, setTags] = useState<HealthTag[]>([])
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [searchResults, setSearchResults] = useState<DashboardOrder[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState({
    invoiceNo: '',
    customerCode: '',
    product: '',
    dateFrom: '',
    dateTo: '',
  })
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    revenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    lowStockCount: 0,
    topProducts: [],
  })

  // Product Form State
  const [editingProd, setEditingProd] = useState<Product | null>(null)
  const [prodForm, setProdForm] = useState(emptyProductForm)

  // Category/Tag Form State
  const [newCat, setNewCat] = useState({ name_en: '', name_ta: '' })
  const [newTag, setNewTag] = useState({ name_en: '', name_ta: '' })

  const isAdmin = user?.role === 'admin'

  const toErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === 'string' && msg.trim()) return msg
    }
    return fallback
  }

  const toDashboardOrder = (row: Record<string, unknown>): DashboardOrder => ({
    id: String(row.id || ''),
    invoice_no: String(row.invoice_no || ''),
    customer_name: String(row.customer_name || ''),
    phone: String(row.phone || ''),
    created_at: String(row.created_at || ''),
    total: toNumber(row.total, 0),
    status: String(row.status || 'pending'),
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    items: row.items,
  })

  const computeAnalytics = useCallback((ordersData: DashboardOrder[], productsData: Product[]) => {
    const completed = ordersData.filter((o) => ['completed', 'paid'].includes(String(o.status || '').toLowerCase()))
    const revenue = completed.reduce((sum, o) => sum + toNumber(o.total, 0), 0)
    const lowStockCount = productsData.filter((p) => toNumber(p.stock, 0) < 10 || toNumber(p.stockQuantity, 0) < 10).length

    const productMap = new Map<string, { name: string; qty: number; revenue: number }>()
    completed.forEach((o) => {
      const rawItems = Array.isArray(o.items) ? o.items : []
      rawItems.forEach((rawItem) => {
        if (!rawItem || typeof rawItem !== 'object') return
        const item = rawItem as Record<string, unknown>
        const name = String(item.name || 'Product')
        const qty = toNumber(item.quantity ?? item.qty, 0)
        const lineTotal = toNumber(item.line_total ?? item.lineTotal, 0)
        const current = productMap.get(name) || { name, qty: 0, revenue: 0 }
        current.qty += qty
        current.revenue += lineTotal
        productMap.set(name, current)
      })
    })

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    setAnalytics({
      revenue,
      totalOrders: ordersData.length,
      completedOrders: completed.length,
      lowStockCount,
      topProducts,
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const [cRes, tRes, oRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('health_tags').select('*'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
        ])
        if (cRes.data) setCats(cRes.data as Category[])
        if (tRes.data) setTags(tRes.data as HealthTag[])
        if (oRes.data) {
          const mappedOrders = oRes.data.map((row) => toDashboardOrder(row as Record<string, unknown>))
          setOrders(mappedOrders)
          setSearchResults(mappedOrders.slice(0, 50))
        }
        await fetchProducts(true)
        const latestProducts = useProductStore.getState().products
        const mappedOrders = (oRes.data || []).map((row) => toDashboardOrder(row as Record<string, unknown>))
        computeAnalytics(mappedOrders, latestProducts)
      }
    } catch (err) {
      console.error('Data Load Error:', err)
    } finally {
      setLoading(false)
    }
  }, [computeAnalytics, fetchProducts])

  useEffect(() => {
    if (isAdmin) {
      void loadData()
    }
  }, [isAdmin, loadData])

  useEffect(() => {
    computeAnalytics(orders, products)
  }, [orders, products, computeAnalytics])

  const runOrderSearch = async (e?: FormEvent) => {
    e?.preventDefault()
    setSearchLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (orderSearch.invoiceNo.trim()) {
        query = query.ilike('invoice_no', `%${orderSearch.invoiceNo.trim()}%`)
      }
      if (orderSearch.dateFrom) {
        query = query.gte('created_at', `${orderSearch.dateFrom}T00:00:00`)
      }
      if (orderSearch.dateTo) {
        query = query.lte('created_at', `${orderSearch.dateTo}T23:59:59`)
      }

      if (orderSearch.customerCode.trim()) {
        const code = orderSearch.customerCode.trim()
        const isUuidCode = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)
        const profileQuery = supabase
          .from('profiles')
          .select('id')
          .or(isUuidCode ? `customer_code.eq.${code},id.eq.${code}` : `customer_code.eq.${code}`)
          .limit(1)
          .single()

        const profileRes = await profileQuery
        if (profileRes.data?.id) {
          query = query.eq('user_id', profileRes.data.id)
        } else {
          setSearchResults([])
          setSearchLoading(false)
          return
        }
      }

      const { data: baseOrders, error: baseError } = await query
      if (baseError) throw baseError
      let finalOrders = (baseOrders || []).map((row) => toDashboardOrder(row as Record<string, unknown>))

      if (orderSearch.product.trim()) {
        const productQuery = orderSearch.product.trim()
        try {
          const { data: itemMatches } = await supabase
            .from('order_items')
            .select('order_id')
            .ilike('product_name', `%${productQuery}%`)

          const matchedOrderIds = new Set<string>()
          for (const match of itemMatches || []) {
            if (!match || typeof match !== 'object') continue
            const orderId = (match as Record<string, unknown>).order_id
            if (typeof orderId === 'string') {
              matchedOrderIds.add(orderId)
            }
          }
          finalOrders = finalOrders.filter((o) => matchedOrderIds.has(o.id))
        } catch (err) {
          console.warn('Metadata search fallback active', err)
          finalOrders = finalOrders.filter((o) => {
            const itemsStr = typeof o.items === 'string' ? o.items : JSON.stringify(o.items || [])
            return itemsStr.toLowerCase().includes(productQuery.toLowerCase())
          })
        }
      }

      setSearchResults(finalOrders)
    } catch (err) {
      console.error('Order search failed', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSaveProd = async (e: FormEvent) => {
    e.preventDefault()
    setProductNotice('')
    setLoading(true)

    try {
      const unitType = normalizeUnitType(prodForm.unitType)
      const payload = {
        name: prodForm.name.trim(),
        name_ta: prodForm.nameTa.trim(),
        tamil_name: prodForm.nameTa.trim(),
        category: prodForm.category.trim(),
        category_id: prodForm.categoryId || null,
        remedy: prodForm.remedy,
        price: toNumber(prodForm.price, 0),
        offer_price: prodForm.offerPrice === '' ? null : toNumber(prodForm.offerPrice, 0),
        unit_type: unitType,
        unit_label: prodForm.unitLabel,
        base_quantity: toNumber(prodForm.baseQuantity, 1),
        stock_quantity: toNumber(prodForm.stockQuantity, 0),
        stock: Math.floor(toNumber(prodForm.stockQuantity, 0)),
        is_active: prodForm.isActive,
        sort_order: toNumber(prodForm.sortOrder, 0),
        description: prodForm.description,
        image_url: prodForm.image || '/assets/images/default-herb.jpg',
        image: prodForm.image || '/assets/images/default-herb.jpg',
      }

      let error;
      if (editingProd) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingProd.id)
        error = err
      } else {
        const { error: err } = await supabase.from('products').insert(payload)
        error = err
      }

      if (error) throw error
      
      setProductNotice(editingProd ? 'Product updated!' : 'Product added!')
      setEditingProd(null)
      setProdForm(emptyProductForm)
      await loadData()
    } catch (err) {
      setProductNotice(toErrorMessage(err, 'Error saving product'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (p: Product) => {
    setEditingProd(p)
    setProdForm({
      name: p.name,
      nameTa: p.nameTa || p.tamilName || '',
      category: p.category,
      categoryId: p.categoryId ?? null,
      remedy: p.remedy || [],
      price: p.price,
      offerPrice: p.offerPrice || '',
      unitType: p.unitType,
      unitLabel: p.unitLabel,
      baseQuantity: p.baseQuantity,
      stockQuantity: p.stockQuantity || p.stock,
      stockUnit: p.stockUnit,
      allowDecimalQuantity: p.allowDecimalQuantity,
      predefinedOptionsText: '',
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      stock: p.stock,
      description: p.description,
      descriptionTa: p.descriptionTa || '',
      benefits: p.benefits || '',
      benefitsTa: p.benefitsTa || '',
      image: p.image || p.imageUrl || '',
    })
    setTab('products')
  }

  const onAddCat = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCat.name_en) return
    const { error } = await supabase.from('categories').insert({ ...newCat, is_active: true })
    if (!error) { setNewCat({ name_en: '', name_ta: '' }); loadData(); }
  }

  const onAddTag = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTag.name_en) return
    const { error } = await supabase.from('health_tags').insert({ ...newTag, is_active: true })
    if (!error) { setNewTag({ name_en: '', name_ta: '' }); loadData(); }
  }

  const handleProductDelete = async (id: string | number) => {
    if (!window.confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      setProductNotice(error.message)
      return
    }
    setProductNotice('Product deleted')
    await loadData()
  }

  const handleToggleProductActive = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.isActive })
      .eq('id', product.id)
    if (error) {
      setProductNotice(error.message)
      return
    }
    setProductNotice(`Product ${product.isActive ? 'deactivated' : 'activated'}`)
    await loadData()
  }

  const handleUploadProductImage = async (file?: File) => {
    if (!file) return
    setImageUploading(true)
    setProductNotice('')
    try {
      const publicUrl = await uploadProductImage(file)
      setProdForm((prev) => ({ ...prev, image: publicUrl }))
      setProductNotice('Image uploaded successfully')
    } catch (err) {
      setProductNotice(toErrorMessage(err, 'Image upload failed'))
    } finally {
      setImageUploading(false)
    }
  }

  const editCategory = async (cat: Category) => {
    const name_en = window.prompt('Category name (English)', cat.name_en)?.trim()
    if (!name_en) return
    const name_ta = window.prompt('Category name (Tamil)', cat.name_ta || '')?.trim() ?? ''
    const { error } = await supabase.from('categories').update({ name_en, name_ta }).eq('id', cat.id)
    if (!error) await loadData()
  }

  const toggleCategoryActive = async (cat: Category) => {
    const nextActive = !cat.is_active
    const { error } = await supabase.from('categories').update({ is_active: nextActive }).eq('id', cat.id)
    if (error) return

    if (!nextActive) {
      await supabase
        .from('products')
        .update({ is_active: false })
        .eq('category_id', cat.id)
    }
    await loadData()
  }

  const moveCategory = async (cat: Category, direction: 'up' | 'down') => {
    const current = toNumber(cat.sort_order, 0)
    const next = direction === 'up' ? Math.max(0, current - 1) : current + 1
    const { error } = await supabase.from('categories').update({ sort_order: next }).eq('id', cat.id)
    if (!error) await loadData()
  }

  const deleteCategory = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name_en}"?`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (!error) await loadData()
  }

  const editTag = async (tag: HealthTag) => {
    const name_en = window.prompt('Tag name (English)', tag.name_en)?.trim()
    if (!name_en) return
    const name_ta = window.prompt('Tag name (Tamil)', tag.name_ta || '')?.trim() ?? ''
    const { error } = await supabase.from('health_tags').update({ name_en, name_ta }).eq('id', tag.id)
    if (!error) await loadData()
  }

  const toggleTagActive = async (tag: HealthTag) => {
    const { error } = await supabase.from('health_tags').update({ is_active: !tag.is_active }).eq('id', tag.id)
    if (!error) await loadData()
  }

  const moveTag = async (tag: HealthTag, direction: 'up' | 'down') => {
    const current = toNumber(tag.sort_order, 0)
    const next = direction === 'up' ? Math.max(0, current - 1) : current + 1
    const { error } = await supabase.from('health_tags').update({ sort_order: next }).eq('id', tag.id)
    if (!error) await loadData()
  }

  const deleteTag = async (tag: HealthTag) => {
    if (!window.confirm(`Delete tag "${tag.name_en}"?`)) return
    const { error } = await supabase.from('health_tags').delete().eq('id', tag.id)
    if (!error) await loadData()
  }

  const navItems: Array<{ id: TabKey; icon: React.ReactNode; label: string }> = [
    { id: 'overview', icon: <BarChart2 size={18}/>, label: 'Dashboard' },
    { id: 'billing', icon: <ShoppingCart size={18}/>, label: 'POS Terminal' },
    { id: 'products', icon: <Box size={18}/>, label: 'Inventory' },
    { id: 'categories', icon: <List size={18}/>, label: 'Categories' },
  ]

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bgMain flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-sand/30 text-center max-w-sm">
           <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
           <h2 className="text-2xl font-black text-textMain mb-2">Unauthorized</h2>
           <p className="text-textMuted mb-6">Admin access required.</p>
           <Link to="/" className="px-6 py-3 bg-sageDark text-white rounded-xl font-bold inline-block">Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row">
      <aside className="w-full lg:w-72 bg-white border-r border-sand/20 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-xl font-black text-textMain flex items-center gap-2">
            <LayoutDashboard className="text-sageDark" /> Admin
          </h1>
          <p className="text-[10px] text-textMuted font-bold tracking-widest mt-1">Sri Siddha Store</p>
        </div>
        <div className="space-y-1">
          {navItems.map(i => (
            <button key={i.id} onClick={() => setTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${tab === i.id ? 'bg-sageDark text-white shadow-lg' : 'text-textMuted hover:bg-bgMain'}`}>
              {i.icon} {i.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-grow p-4 lg:p-10">
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-sand/20 p-5 shadow-soft">
                <p className="text-[10px] uppercase font-black text-textMuted">Revenue (Completed/Paid)</p>
                <p className="text-2xl font-black text-textMain mt-2">{formatCurrency(analytics.revenue)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-sand/20 p-5 shadow-soft">
                <p className="text-[10px] uppercase font-black text-textMuted">Total Orders</p>
                <p className="text-2xl font-black text-textMain mt-2">{analytics.totalOrders}</p>
              </div>
              <div className="bg-white rounded-2xl border border-sand/20 p-5 shadow-soft">
                <p className="text-[10px] uppercase font-black text-textMuted">Completed/Paid Orders</p>
                <p className="text-2xl font-black text-textMain mt-2">{analytics.completedOrders}</p>
              </div>
              <div className="bg-white rounded-2xl border border-sand/20 p-5 shadow-soft">
                <p className="text-[10px] uppercase font-black text-textMuted">Low Stock (&lt; 10)</p>
                <p className="text-2xl font-black text-textMain mt-2">{analytics.lowStockCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sand/20 p-6 shadow-soft">
              <h3 className="text-lg font-black text-textMain mb-4">Invoice / Customer Search</h3>
              <form onSubmit={runOrderSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  className="px-3 py-2 bg-bgMain rounded-xl text-sm font-semibold"
                  placeholder="Invoice ID"
                  value={orderSearch.invoiceNo}
                  onChange={(e) => setOrderSearch({ ...orderSearch, invoiceNo: e.target.value })}
                />
                <input
                  className="px-3 py-2 bg-bgMain rounded-xl text-sm font-semibold"
                  placeholder="Customer Code / Profile ID"
                  value={orderSearch.customerCode}
                  onChange={(e) => setOrderSearch({ ...orderSearch, customerCode: e.target.value })}
                />
                <input
                  className="px-3 py-2 bg-bgMain rounded-xl text-sm font-semibold"
                  placeholder="Product"
                  value={orderSearch.product}
                  onChange={(e) => setOrderSearch({ ...orderSearch, product: e.target.value })}
                />
                <input
                  type="date"
                  className="px-3 py-2 bg-bgMain rounded-xl text-sm font-semibold"
                  value={orderSearch.dateFrom}
                  onChange={(e) => setOrderSearch({ ...orderSearch, dateFrom: e.target.value })}
                />
                <input
                  type="date"
                  className="px-3 py-2 bg-bgMain rounded-xl text-sm font-semibold"
                  value={orderSearch.dateTo}
                  onChange={(e) => setOrderSearch({ ...orderSearch, dateTo: e.target.value })}
                />
                <button type="submit" className="md:col-span-5 py-2.5 bg-sageDark text-white rounded-xl font-bold text-sm">
                  {searchLoading ? 'Searching...' : 'Search Orders'}
                </button>
              </form>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-textMuted border-b border-sand/20">
                    <tr>
                      <th className="py-2">Invoice</th>
                      <th className="py-2">Customer</th>
                      <th className="py-2">Phone</th>
                      <th className="py-2">Date</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((order) => (
                      <tr key={order.id} className="border-b border-sand/10">
                        <td className="py-3 font-bold">{order.invoice_no}</td>
                        <td className="py-3">{order.customer_name}</td>
                        <td className="py-3">{order.phone}</td>
                        <td className="py-3">{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 text-right font-bold">{formatCurrency(toNumber(order.total, 0))}</td>
                      </tr>
                    ))}
                    {searchResults.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-textMuted">No matching invoices</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sand/20 p-6 shadow-soft">
              <h3 className="text-lg font-black text-textMain mb-4">Top Products (Completed/Paid)</h3>
              <div className="space-y-2">
                {analytics.topProducts.map((row) => (
                  <div key={row.name} className="flex items-center justify-between bg-bgMain/60 rounded-xl px-4 py-3">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm font-bold text-sageDark">{row.qty} sold • {formatCurrency(row.revenue)}</p>
                  </div>
                ))}
                {analytics.topProducts.length === 0 && <p className="text-sm text-textMuted">No completed order items yet.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="bg-white rounded-2xl border border-sand/20 p-6 shadow-soft">
            <h3 className="text-xl font-black text-textMain">POS Terminal</h3>
            <p className="text-sm text-textMuted mt-2">Open the dedicated POS billing screen for live invoice generation.</p>
            <Link to="/pos" className="inline-block mt-4 px-5 py-3 rounded-xl bg-sageDark text-white font-bold">Open POS</Link>
          </div>
        )}
        
        {tab === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1">
              <form onSubmit={handleSaveProd} className="bg-white p-8 rounded-[2.5rem] border border-sand/20 shadow-xl space-y-4">
                <h3 className="text-xl font-black mb-4">{editingProd ? 'Edit Herb' : 'Add New Herb'}</h3>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Title</label>
                  <input required className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold" placeholder="Product Name" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Tamil Name</label>
                  <input className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold" placeholder="தமிழ் பெயர்" value={prodForm.nameTa} onChange={e => setProdForm({...prodForm, nameTa: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Price</label>
                    <input required type="number" className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Stock</label>
                    <input required type="number" className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold" value={prodForm.stockQuantity} onChange={e => setProdForm({...prodForm, stockQuantity: Number(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Category</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold"
                    value={prodForm.category}
                    onChange={(e) => {
                      const selected = cats.find((c) => c.name_en === e.target.value)
                      setProdForm({
                        ...prodForm,
                        category: e.target.value,
                        categoryId: selected?.id || null,
                      })
                    }}
                  >
                    <option value="">Select...</option>
                    {cats.map(c => <option key={c.id} value={c.name_en}>{c.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Image URL</label>
                  <input
                    className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold"
                    placeholder="https://..."
                    value={prodForm.image}
                    onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-textMuted mb-1 block">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-4 py-3 bg-bgMain rounded-xl border-none text-sm font-bold"
                    onChange={(e) => void handleUploadProductImage(e.target.files?.[0])}
                  />
                  {imageUploading && <p className="text-xs text-textMuted mt-1">Uploading image...</p>}
                </div>
                {productNotice && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold text-center">{productNotice}</div>}
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-grow py-4 bg-sageDark text-white font-black rounded-2xl shadow-lg hover:brightness-110">Save Product</button>
                  <button type="button" onClick={() => { setEditingProd(null); setProdForm(emptyProductForm); }} className="px-6 py-4 bg-bgMain text-textMuted font-bold rounded-2xl">Reset</button>
                </div>
              </form>
            </div>

            <div className="xl:col-span-2">
               <div className="bg-white rounded-[2rem] border border-sand/20 shadow-soft overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-bgMain text-[10px] uppercase font-black text-textMuted tracking-widest">
                        <tr>
                           <th className="px-6 py-4">Herb</th>
                           <th className="px-6 py-4">Stock</th>
                           <th className="px-6 py-4">Price</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="text-sm">
                        {products.map(p => (
                          <tr key={p.id} className="border-b border-sand/5 hover:bg-bgMain/30">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-lg overflow-hidden bg-bgMain border border-sand/10">
                                      <img src={p.image || p.imageUrl || '/assets/images/default-herb.jpg'} className="w-full h-full object-cover" />
                                   </div>
                                   <p className="font-bold">{p.name}</p>
                                </div>
                             </td>
                             <td className="px-6 py-4 font-bold">{p.stock}</td>
                             <td className="px-6 py-4 font-bold">₹{p.price}</td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => handleEdit(p)} className="p-2 text-sageDark hover:bg-sageDark/10 rounded-lg mr-2"><Edit2 size={16}/></button>
                                <button onClick={() => void handleToggleProductActive(p)} className={`p-2 rounded-lg mr-2 ${p.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}><Power size={16}/></button>
                                <button onClick={() => void handleProductDelete(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-8 rounded-[2rem] border border-sand/20 shadow-soft">
                <h3 className="text-xl font-black mb-6">General Categories</h3>
                <form onSubmit={onAddCat} className="flex gap-2 mb-6">
                   <input className="flex-grow px-4 py-3 bg-bgMain rounded-xl border-none font-bold text-sm" placeholder="e.g. Herbal Powder" value={newCat.name_en} onChange={e => setNewCat({...newCat, name_en: e.target.value})} />
                   <button className="px-6 bg-sageDark text-white font-black rounded-xl">Add</button>
                </form>
                <div className="space-y-2">
                   {cats.map(c => (
                     <div key={c.id} className="flex justify-between items-center p-4 bg-bgMain/50 rounded-xl font-bold text-sm">
                       <div>
                         <p>{c.name_en}</p>
                         <p className={`text-[10px] uppercase ${c.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</p>
                       </div>
                       <div className="flex items-center gap-1">
                         <button onClick={() => void moveCategory(c, 'up')} className="p-1.5 text-textMuted hover:bg-white rounded-lg"><ArrowUp size={13}/></button>
                         <button onClick={() => void moveCategory(c, 'down')} className="p-1.5 text-textMuted hover:bg-white rounded-lg"><ArrowDown size={13}/></button>
                         <button onClick={() => void editCategory(c)} className="p-1.5 text-sageDark hover:bg-white rounded-lg"><Edit2 size={13}/></button>
                         <button onClick={() => void toggleCategoryActive(c)} className="p-1.5 text-amber-500 hover:bg-white rounded-lg"><Power size={13}/></button>
                         <button onClick={() => void deleteCategory(c)} className="p-1.5 text-red-400 hover:bg-white rounded-lg"><Trash2 size={13}/></button>
                       </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="bg-white p-8 rounded-[2rem] border border-sand/20 shadow-soft">
                <h3 className="text-xl font-black mb-6">Health Tags</h3>
                <form onSubmit={onAddTag} className="flex gap-2 mb-6">
                   <input className="flex-grow px-4 py-3 bg-bgMain rounded-xl border-none font-bold text-sm" placeholder="e.g. Digestion" value={newTag.name_en} onChange={e => setNewTag({...newTag, name_en: e.target.value})} />
                   <button className="px-6 bg-purple-500 text-white font-black rounded-xl">Add</button>
                </form>
                <div className="space-y-2">
                   {tags.map(t => (
                     <div key={t.id} className="flex justify-between items-center p-4 bg-bgMain/50 rounded-xl font-bold text-sm">
                       <div>
                         <p>{t.name_en}</p>
                         <p className={`text-[10px] uppercase ${t.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{t.is_active ? 'Active' : 'Inactive'}</p>
                       </div>
                       <div className="flex items-center gap-1">
                         <button onClick={() => void moveTag(t, 'up')} className="p-1.5 text-textMuted hover:bg-white rounded-lg"><ArrowUp size={13}/></button>
                         <button onClick={() => void moveTag(t, 'down')} className="p-1.5 text-textMuted hover:bg-white rounded-lg"><ArrowDown size={13}/></button>
                         <button onClick={() => void editTag(t)} className="p-1.5 text-sageDark hover:bg-white rounded-lg"><Edit2 size={13}/></button>
                         <button onClick={() => void toggleTagActive(t)} className="p-1.5 text-amber-500 hover:bg-white rounded-lg"><Power size={13}/></button>
                         <button onClick={() => void deleteTag(t)} className="p-1.5 text-red-400 hover:bg-white rounded-lg"><Trash2 size={13}/></button>
                       </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  )
}
