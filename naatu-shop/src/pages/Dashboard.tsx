import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { 
  Plus, Trash2, Edit2, Tag, List,
  ShoppingCart, Package, TrendingUp, 
  Search, Bell, Settings, ChevronRight,
  MoreVertical, Layout, Download, Filter,
  Receipt, LineChart, Leaf, ShoppingBag, X, BarChart2, Printer
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuthStore, useProductStore } from '../store/store'
import { getLocalOrders } from '../lib/ordersFallback'
import { BRAND_EN } from '../lib/brand'
import { useLangStore } from '../store/langStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Invoice } from '../components/Invoice'

type DashboardProduct = {
  id: number
  name: string
  nameTa: string
  category: string
  remedy: string[]
  price: number
  offerPrice: number | ''
  stock: number
  description: string
  descriptionTa: string
  benefits: string
  benefitsTa: string
  image: string
}

type DashboardOrderItem = {
  qty: number
  price: number
  offerPrice: number | null
  name: string
  nameTa?: string | null
}

type DashboardOrder = {
  id: string
  invoiceNo: string
  user_id: string | null
  name: string
  phone: string
  address: string
  subtotal: number
  shipping: number
  total: number
  status: string
  created_at: string
  items: DashboardOrderItem[]
}

type NameOption = {
  id: number
  name_en: string
  name_ta: string
}

const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const emptyProductForm = {
  name: '',
  nameTa: '',
  category: '',
  remedy: [] as string[],
  price: 0,
  offerPrice: '',
  stock: 10,
  description: '',
  descriptionTa: '',
  benefits: '',
  benefitsTa: '',
  image: '/assets/images/default-herb.jpg',
}

export default function Dashboard() {
  const isAdmin = useAuthStore((state) => state.isAdmin())
  const { t, lang } = useLangStore()
  const [tab, setTab] = useState<'overview' | 'billing' | 'products' | 'categories'>('overview')
  const [globalSearch, setGlobalSearch] = useState('')
  const [summary, setSummary] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 })
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [products, setProducts] = useState<DashboardProduct[]>([])
  const [cats, setCats] = useState<NameOption[]>([])
  const [tags, setTags] = useState<NameOption[]>([])
  const [editingProd, setEditingProd] = useState<DashboardProduct | null>(null)
  const [prodForm, setProdForm] = useState(emptyProductForm)
  const [loading, setLoading] = useState(false)
  const [productNotice, setProductNotice] = useState('')
  const [billingQuery, setBillingQuery] = useState('')
  const [billingItems, setBillingItems] = useState<Array<DashboardProduct & { qty: number }>>([])
  const [billingCustomer, setBillingCustomer] = useState({ name: '', phone: '', address: '' })
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingNotice, setBillingNotice] = useState('')
  const [manualBillingMode, setManualBillingMode] = useState(false)
  const [manualBillingForm, setManualBillingForm] = useState({ name: '', price: '' })
  // Billed invoice snapshot for print
  const [billedInvoice, setBilledInvoice] = useState<null | {
    invoiceNo: string; customerName: string; phone: string; address: string
    items: any[]; subtotal: number; shipping: number; total: number
  }>(null)
  // Category / Tag forms
  const [catForm, setCatForm] = useState({ name_en: '', name_ta: '' })
  const [tagForm, setTagForm] = useState({ name_en: '', name_ta: '' })
  const [catTagSaving, setCatTagSaving] = useState(false)
  const [catTagNotice, setCatTagNotice] = useState('')

  const dailySales = useMemo(() => {
    const now = new Date()
    const days: Array<{ label: string; value: number }> = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const value = orders
        .filter((order) => order.created_at.slice(0, 10) === key)
        .reduce((sum, order) => sum + order.total, 0)
      days.push({ label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value })
    }
    return days
  }, [orders])

  const monthlySales = useMemo(() => {
    const now = new Date()
    const months: Array<{ key: string; label: string; value: number }> = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const value = orders
        .filter((order) => order.created_at.startsWith(key))
        .reduce((sum, order) => sum + order.total, 0)
      months.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), value })
    }
    return months
  }, [orders])

  const maxDaily = Math.max(1, ...dailySales.map((item) => item.value))
  const maxMonthly = Math.max(1, ...monthlySales.map((item) => item.value))

  const parseOrderItems = (value: unknown): DashboardOrderItem[] => {
    if (!Array.isArray(value)) return []
    return value.map((item: any) => ({
      qty: Number(item.qty || item.quantity || 0),
      price: Number(item.price || 0),
      offerPrice: item.offerPrice == null ? null : Number(item.offerPrice),
      name: String(item.name || 'Product'),
      nameTa: item.nameTa || null,
    }))
  }

  const loadData = async () => {
    // Always load categories and tags from DB
    if (isSupabaseConfigured) {
      const [{ data: catsData }, { data: tagsData }] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase.from('health_tags').select('*').order('id'),
      ])
      if (catsData) setCats(catsData as NameOption[])
      if (tagsData) setTags(tagsData as NameOption[])
    }

    if (!isSupabaseConfigured) {
      const localOrders = getLocalOrders().map((order) => ({
        id: String(order.id),
        invoiceNo: order.invoice_no,
        user_id: null as string | null,
        name: order.customer_name,
        phone: order.phone,
        address: order.address,
        subtotal: Number(order.subtotal) || 0,
        shipping: Number(order.shipping) || 0,
        total: Number(order.total) || 0,
        status: order.status,
        created_at: order.created_at,
        items: parseOrderItems(order.items),
      }))

      setProducts([])
      setOrders(localOrders)
      setSummary({
        totalProducts: useProductStore.getState().products.length,
        totalOrders: localOrders.length,
        totalRevenue: localOrders.reduce((sum, order) => sum + order.total, 0),
      })
      setProductNotice('Using Local Storage (Supabase Off)')
      return
    }

    try {
      // Fetch Products correctly
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })

      if (productsError) throw productsError

      // Fetch Orders correctly
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Orders fetch error:', ordersError)
      }

      const mappedProducts: DashboardProduct[] = (productsData || []).map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        nameTa: p.name_ta || '',
        category: p.category,
        remedy: Array.isArray(p.remedy) ? p.remedy : [],
        price: Number(p.price) || 0,
        offerPrice: p.offer_price == null ? '' : Number(p.offer_price),
        stock: Number(p.stock) || 0,
        description: p.description || '',
        descriptionTa: p.description_ta || '',
        benefits: p.benefits || '',
        benefitsTa: p.benefits_ta || '',
        image: p.image || p.image_url || '/assets/images/default-herb.jpg',
      }))

      const mappedOrders: DashboardOrder[] = (ordersData || []).map((order: any) => ({
        id: String(order.id),
        invoiceNo: order.invoice_no || '',
        user_id: order.user_id || null,
        name: order.customer_name || '',
        phone: order.phone || '',
        address: order.address || '',
        subtotal: Number(order.subtotal) || 0,
        shipping: Number(order.shipping) || 0,
        total: Number(order.total) || 0,
        status: order.status || '',
        created_at: order.created_at || '',
        items: parseOrderItems(order.items),
      }))

      setProducts(mappedProducts)
      setOrders(mappedOrders)
      setSummary({
        totalProducts: mappedProducts.length,
        totalOrders: mappedOrders.length,
        totalRevenue: mappedOrders.reduce((sum, order) => sum + order.total, 0),
      })

      // Set options for categories and tags based on DB
      setCats(Array.from(new Set(mappedProducts.map(p => p.category))).map((c, i) => ({ id: i, name_en: c, name_ta: c })))
      setTags(Array.from(new Set(mappedProducts.flatMap(p => p.remedy))).map((t, i) => ({ id: i, name_en: t, name_ta: t })))

    } catch (err: any) {
      console.error('Load Data error:', err)
      setProductNotice(err.message)
    }
  }

  useEffect(() => {
    void loadData()
    if (isSupabaseConfigured) {
      const pSync = supabase.channel('products-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { void loadData() }).subscribe()
      const oSync = supabase.channel('orders-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadData() }).subscribe()
      return () => { supabase.removeChannel(pSync); supabase.removeChannel(oSync) }
    }
  }, [])

  // CRUD Handlers
  const handleSaveProd = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: prodForm.name,
        name_ta: prodForm.nameTa,
        category: prodForm.category,
        remedy: prodForm.remedy,
        price: Number(prodForm.price),
        offer_price: prodForm.offerPrice ? Number(prodForm.offerPrice) : null,
        stock: Number(prodForm.stock),
        description: prodForm.description,
        description_ta: prodForm.descriptionTa,
        benefits: prodForm.benefits,
        benefits_ta: prodForm.benefitsTa,
        image: prodForm.image
      }

      if (editingProd) {
        if (Number.isNaN(Number(editingProd.id))) throw new Error("Invalid Product ID")
        const { error } = await supabase.from('products').update(payload).eq('id', editingProd.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }
      setProdForm(emptyProductForm)
      setEditingProd(null)
      await loadData()
      setProductNotice(t('admin.save_success'))
    } catch (err: any) {
      setProductNotice(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProd = async (id: number) => {
    if (Number.isNaN(id)) return
    if (!confirm(t('admin.confirm_delete'))) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) setProductNotice(error.message)
    else await loadData()
  }

  // POS Handlers
  const addToBilling = (p: DashboardProduct) => {
    setBillingItems(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...p, qty: 1 }]
    })
  }
  const addManualToBilling = () => {
    if (!manualBillingForm.name || !manualBillingForm.price) return
    const price = parseFloat(manualBillingForm.price)
    if (isNaN(price)) return
    
    addToBilling({
      id: -Date.now(),
      name: manualBillingForm.name,
      category: 'Manual',
      price: price,
      stock: 999,
      unit: 'pc',
      rating: 5,
      description: 'Manual entry',
      image: 'https://images.unsplash.com/photo-1586769852044-692d6e3713b0?w=100&q=80',
      benefits: '',
      remedy: []
    } as any)
    setManualBillingForm({ name: '', price: '' })
    setManualBillingMode(false)
  }

  const createBill = async () => {
    if (!billingItems.length) return
    setBillingSaving(true)
    setBillingNotice('')
    try {
      // Get atomic invoice number from DB function, fallback to random
      let invoiceNo = `POS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2,7).toUpperCase()}`
      if (isSupabaseConfigured) {
        const { data: invData } = await supabase.rpc('get_next_invoice_no')
        if (invData) invoiceNo = invData as string
      }

      const { data: auth } = await supabase.auth.getUser()
      const userId = isUuid(auth.user?.id) ? auth.user?.id : null
      const subtotal = billingItems.reduce((s, i) => s + (Number(i.offerPrice || i.price) * i.qty), 0)

      const { error: orderError } = await supabase.from('orders').insert({
        invoice_no: invoiceNo,
        user_id: userId,
        customer_name: billingCustomer.name || 'Walk-in Customer',
        phone: billingCustomer.phone || '0000000000',
        address: billingCustomer.address || 'In-Store (POS)',
        items: billingItems.map(i => ({
          id: i.id, name: i.name, nameTa: i.nameTa || null,
          qty: i.qty, price: i.price,
          offerPrice: i.offerPrice !== '' ? Number(i.offerPrice) : null
        })),
        subtotal,
        shipping: 0,
        total: subtotal,
        status: 'completed'
      })
      if (orderError) throw orderError

      // Decrement stock for each real product (id > 0)
      const stockErrors: string[] = []
      await Promise.all(
        billingItems
          .filter(i => i.id > 0)
          .map(async (i) => {
            const { error: stockErr } = await supabase.rpc('decrement_stock', {
              product_id: i.id,
              qty_sold: i.qty
            })
            if (stockErr) stockErrors.push(i.name)
          })
      )

      // Set bill for printing
      setBilledInvoice({
        invoiceNo,
        customerName: billingCustomer.name || 'Walk-in Customer',
        phone: billingCustomer.phone || '',
        address: billingCustomer.address || 'In-Store',
        items: billingItems,
        subtotal,
        shipping: 0,
        total: subtotal,
      })

      setBillingItems([])
      setBillingCustomer({ name: '', phone: '', address: '' })
      await loadData()
      const notice = stockErrors.length
        ? `Bill ${invoiceNo} saved. Stock not updated for: ${stockErrors.join(', ')}`
        : `✅ Bill ${invoiceNo} created & stock updated.`
      setBillingNotice(notice)
    } catch (err: any) {
      setBillingNotice('Error: ' + err.message)
    } finally {
      setBillingSaving(false)
    }
  }

  const handleBillingSearchEnter = (e: any) => {
    if (e.key === 'Enter' && billingQuery.trim()) {
      const q = billingQuery.trim().toLowerCase()
      const p = products.find(prod => 
        prod.name.toLowerCase().includes(q) || 
        (prod.nameTa && prod.nameTa.toLowerCase().includes(q))
      )
      if (p) {
        addToBilling(p as any)
        setBillingQuery('')
      }
    }
  }

  const billingSubtotal = billingItems.reduce((sum, item) => sum + (Number(item.offerPrice || item.price) * item.qty), 0)

  // ── Category handlers ─────────────────────────────────────────────
  const handleAddCat = async (e: FormEvent) => {
    e.preventDefault()
    if (!catForm.name_en.trim()) return
    setCatTagSaving(true)
    const { error } = await supabase.from('categories').insert({ name_en: catForm.name_en.trim(), name_ta: catForm.name_ta.trim() || catForm.name_en.trim() })
    if (error) { setCatTagNotice('Error: ' + error.message) } else { setCatForm({ name_en: '', name_ta: '' }); await loadData(); setCatTagNotice('Category added!') }
    setCatTagSaving(false)
  }
  const handleDeleteCat = async (id: number) => {
    if (!confirm('Delete this category?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { setCatTagNotice('Error: ' + error.message) } else { await loadData() }
  }

  // ── Health tag handlers ───────────────────────────────────────────
  const handleAddTag = async (e: FormEvent) => {
    e.preventDefault()
    if (!tagForm.name_en.trim()) return
    setCatTagSaving(true)
    const { error } = await supabase.from('health_tags').insert({ name_en: tagForm.name_en.trim(), name_ta: tagForm.name_ta.trim() || tagForm.name_en.trim() })
    if (error) { setCatTagNotice('Error: ' + error.message) } else { setTagForm({ name_en: '', name_ta: '' }); await loadData(); setCatTagNotice('Tag added!') }
    setCatTagSaving(false)
  }
  const handleDeleteTag = async (id: number) => {
    if (!confirm('Delete this health tag?')) return
    const { error } = await supabase.from('health_tags').delete().eq('id', id)
    if (error) { setCatTagNotice('Error: ' + error.message) } else { await loadData() }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <Settings className="w-16 h-16 text-sageDark mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500">Only authorized administrators can access this panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-[#212529]">
      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════ */}
      <aside className="w-64 bg-[#232f3e] text-white shrink-0 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-700 flex items-center gap-2">
          <BarChart2 className="text-sage" />
          <span className="font-bold text-lg tracking-tight">Admin Central</span>
        </div>
        
        <nav className="flex-grow py-6 px-3 space-y-1">
          {[
            { id: 'overview', label: t('admin.overview'), icon: <Layout size={20}/> },
            { id: 'billing', label: t('admin.billing'), icon: <ShoppingCart size={20}/> },
            { id: 'products', label: t('admin.products'), icon: <Package size={20}/> },
            { id: 'categories', label: t('admin.categories'), icon: <Tag size={20}/> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${tab === item.id ? 'bg-[#37475a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#37475a]'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">
          {BRAND_EN} · 2026
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════════════ */}
      <main className="flex-grow">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 flex-grow max-w-2xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search BALA-ID, User ID, or Name..." 
                className="w-full bg-[#f3f3f3] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-sage focus:bg-white transition-all outline-none font-bold"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-none">Admin User</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Super Admin</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-sageDark flex items-center justify-center text-white font-bold shadow-soft">A</div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-headline">{t(`admin.${tab}`)}</h1>
              <p className="text-sm text-gray-500 mt-1">{BRAND_EN} Management System</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50"><Download size={14}/> Export</button>
              {tab === 'products' && (
                <button onClick={() => setTab('products')} className="px-4 py-2 bg-[#febd69] text-[#111] border border-[#f3a847] rounded-lg text-sm font-bold shadow-sm hover:bg-[#f3a847]">Add New Product</button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                {/* Hero Action Cards for User-Friendly Admin */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button 
                    onClick={() => setTab('billing')}
                    className="group relative bg-[#131921] hover:bg-[#232f3e] text-white p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 text-left flex flex-col items-start overflow-hidden border-2 border-white/5"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Receipt size={100} />
                    </div>
                    <div className="w-12 h-12 bg-[#febd69] text-[#131921] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                      <Receipt size={24} />
                    </div>
                    <h3 className="text-xl font-black mb-1">{t('admin.quick_pos')}</h3>
                    <p className="text-xs font-bold text-[#febd69] uppercase tracking-wider">{t('admin.pos_subtitle')}</p>
                  </button>

                  <button 
                    onClick={() => setTab('products')}
                    className="group relative bg-[#007185] hover:bg-[#008296] text-white p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 text-left flex flex-col items-start overflow-hidden border-2 border-white/5"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Leaf size={100} />
                    </div>
                    <div className="w-12 h-12 bg-white text-[#007185] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                      <Leaf size={24} />
                    </div>
                    <h3 className="text-xl font-black mb-1">{t('admin.manage_herb')}</h3>
                    <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">{summary.totalProducts} Items</p>
                  </button>

                  <button 
                    onClick={() => {}}
                    className="group relative bg-[#232f3e] hover:bg-[#37475a] text-white p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 text-left flex flex-col items-start overflow-hidden border-2 border-white/5"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <ShoppingBag size={100} />
                    </div>
                    <div className="w-12 h-12 bg-amber-400 text-[#131921] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                      <ShoppingBag size={24} />
                    </div>
                    <h3 className="text-xl font-black mb-1">{t('admin.view_all_orders')}</h3>
                    <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">{summary.totalOrders} Sales</p>
                  </button>
                </div>

                {/* Simplified Stats Strip */}
                <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl flex flex-wrap md:flex-nowrap items-stretch gap-2">
                  {[
                    { label: t('admin.total_revenue'), value: `₹${summary.totalRevenue}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: t('admin.total_orders'), value: summary.totalOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: t('admin.total_products'), value: summary.totalProducts, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: "Growth Status", value: "+18%", icon: LineChart, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((stat, i) => (
                    <div key={i} className="flex-grow flex items-center gap-5 p-6 hover:bg-gray-50 rounded-2xl transition-colors shrink-0">
                      <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                        <stat.icon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-[#131921]">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Placeholder/Simplified */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">{t('admin.daily_sales')}</h3>
                      <select className="text-xs font-bold border-gray-200 rounded-lg py-1 px-2 outline-none">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                      </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2">
                      {dailySales.map(item => (
                        <div key={item.label} className="flex-grow flex flex-col items-center group">
                          <div className="relative w-full flex justify-center">
                             <div className="bg-[#febd69] w-full max-w-[40px] rounded-t-lg transition-all group-hover:bg-[#f3a847] cursor-pointer" style={{ height: `${(item.value / maxDaily) * 100}%` }}></div>
                             <div className="absolute -top-8 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">₹{item.value}</div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 mt-3">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">{t('admin.monthly_sales')}</h3>
                    <div className="space-y-4">
                      {monthlySales.map(m => (
                        <div key={m.key} className="space-y-2">
                           <div className="flex justify-between text-xs font-bold">
                              <span>{m.label}</span>
                              <span>₹{m.value}</span>
                           </div>
                           <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-sageDark" style={{ width: `${(m.value / maxMonthly) * 100}%` }}></div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-lg">{t('admin.recent_orders')}</h3>
                      <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#fbfbfb] text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Invoice / ID</th>
                            <th className="px-6 py-4">Customer / User</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-center">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {orders
                          .filter(o => 
                            globalSearch === '' || 
                            o.invoiceNo.toLowerCase().includes(globalSearch.toLowerCase()) ||
                            o.id.toLowerCase().includes(globalSearch.toLowerCase()) ||
                            (o.user_id && o.user_id.toLowerCase().includes(globalSearch.toLowerCase())) ||
                            o.name.toLowerCase().includes(globalSearch.toLowerCase())
                          )
                          .slice(0, 10).map(o => (
                          <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-black text-[#131921] uppercase tracking-tight">#{o.invoiceNo}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[80px]">ID: {o.id}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{o.name}</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase">User: {o.user_id || 'Walk-in'}</div>
                            </td>
                            <td className="px-6 py-4 font-black text-[#131921]">₹{o.total}</td>
                            <td className="px-6 py-4 text-gray-500 font-bold uppercase text-[10px]">
                              {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button className="p-2 text-gray-300 hover:text-[#131921] hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-200"><MoreVertical size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'billing' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12">
                   {billingNotice && (
                      <div className="mb-4 bg-sageDeep text-white px-4 py-3 rounded-xl font-bold flex items-center justify-between">
                        <span>{billingNotice}</span>
                        <button onClick={() => setBillingNotice('')}><X size={16}/></button>
                      </div>
                   )}
                </div>

                {/* POS Products Select */}
                <div className="lg:col-span-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
                  <div className="p-8 border-b border-gray-100 bg-[#fafafa]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-black text-2xl text-[#232f3e] tracking-tight">{t('admin.pos_title')}</h3>
                        <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">
                           Digital Billing System Enabled
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              value={billingQuery}
                              onChange={e => setBillingQuery(e.target.value)}
                              onKeyDown={handleBillingSearchEnter}
                              placeholder="Find products fast..." 
                              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-[#232f3e] outline-none transition-all shadow-sm" 
                            />
                         </div>
                         <button 
                           onClick={() => setManualBillingMode(!manualBillingMode)}
                           className={`h-12 px-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${manualBillingMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#232f3e] border-[#232f3e] text-white hover:bg-[#37475a]'}`}
                         >
                            {manualBillingMode ? <X size={18}/> : <Plus size={18}/>}
                            {manualBillingMode ? 'Cancel' : t('admin.manual_item')}
                         </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {manualBillingMode && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 pt-8 border-t border-gray-100 overflow-hidden">
                           <div className="flex flex-col sm:flex-row items-end gap-4 max-w-2xl">
                              <div className="flex-grow w-full">
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Quick Item Name</label>
                                <input autoFocus value={manualBillingForm.name} onChange={e => setManualBillingForm({...manualBillingForm, name: e.target.value})} placeholder="e.g. Unlisted Herb" className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-[#232f3e]" />
                              </div>
                              <div className="w-full sm:w-40">
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Price (₹)</label>
                                <input type="number" value={manualBillingForm.price} onChange={e => setManualBillingForm({...manualBillingForm, price: e.target.value})} placeholder="0.00" className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-[#232f3e]" />
                              </div>
                              <button onClick={addManualToBilling} className="h-[48px] bg-green-500 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 hover:bg-green-600 hover:-translate-y-0.5 active:translate-y-0 transition-all">Add to Bill</button>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-grow p-8 bg-[#fbfbfb]">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                       {products.filter(p => !billingQuery || p.name.toLowerCase().includes(billingQuery.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => addToBilling(p)} className="group bg-white p-3 rounded-2xl border-2 border-transparent hover:border-[#232f3e] cursor-pointer transition-all hover:shadow-xl active:scale-95 flex flex-col">
                             <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-50 relative">
                                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-[#232f3e]/0 group-hover:bg-[#232f3e]/10 transition-colors" />
                                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                   <Plus size={20} className="text-[#232f3e]" />
                                </div>
                             </div>
                             <div className="px-1">
                                <p className="font-black text-xs text-[#232f3e] line-clamp-1 h-3.5 mb-1">{lang === 'ta' ? p.nameTa : p.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic mb-2">{p.category}</p>
                                <div className="flex items-center justify-between mt-auto">
                                   <p className="text-sm font-black text-green-600">₹{p.offerPrice || p.price}</p>
                                   <p className="text-[9px] font-black text-gray-300">Stock: {p.stock}</p>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                  </div>
                </div>

                {/* Checkout Panel */}
                <div className="lg:col-span-12 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col mb-10 pb-8">
                   <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-black text-xl text-[#232f3e] tracking-tight">{t('admin.current_bill')}</h3>
                      <button onClick={() => setBillingItems([])} className="text-xs font-black text-red-500 uppercase tracking-widest hover:underline">Clear Entire Bill</button>
                   </div>
                   
                   <div className="p-6 space-y-4 border-b border-gray-100 bg-[#fbfbfb]">
                      <input value={billingCustomer.name} onChange={e => setBillingCustomer({...billingCustomer, name: e.target.value})} placeholder={t('admin.customer_name')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-sageDark" />
                      <input value={billingCustomer.phone} onChange={e => setBillingCustomer({...billingCustomer, phone: e.target.value})} placeholder={t('admin.phone')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-sageDark" />
                   </div>

                   <div className="flex-grow overflow-y-auto p-6">
                      {!billingItems.length ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                           <ShoppingCart size={48} className="mb-4" />
                           <p className="font-bold">Bill is empty</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {billingItems.map(item => (
                             <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                   <p className="font-bold text-sm">{lang === 'ta' ? item.nameTa : item.name}</p>
                                   <p className="text-xs text-gray-400">₹{item.offerPrice || item.price} × {item.qty}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                   <button onClick={() => setBillingItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                   <div className="font-bold">₹{Number(item.offerPrice || item.price) * item.qty}</div>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>

                   <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
                      <div className="flex justify-between font-bold text-gray-500 text-sm italic">
                         <span>Subtotal</span>
                         <span>₹{billingSubtotal}</span>
                      </div>
                      <div className="flex justify-between font-black text-xl border-t border-gray-200 pt-3">
                         <span>Total</span>
                         <span>₹{billingSubtotal}</span>
                      </div>
                      <button 
                        onClick={createBill} 
                        disabled={billingSaving || !billingItems.length}
                        className="w-full py-4 bg-[#febd69] hover:bg-[#f3a847] disabled:bg-gray-200 disabled:text-gray-400 text-[#111] font-black rounded-xl text-lg shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                         {billingSaving ? 'Generating...' : t('admin.create_bill')}
                         <ChevronRight size={20} />
                      </button>
                   </div>
                </div>
              </motion.div>
            )}

            {tab === 'products' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Product Form */}
                <div className="lg:col-span-5">
                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-24">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-lg">{editingProd ? t('admin.edit_product') : t('admin.add_product')}</h3>
                        {editingProd && <button onClick={() => {setEditingProd(null); setProdForm(emptyProductForm)}} className="text-blue-600 text-xs font-bold hover:underline">Cancel Edit</button>}
                      </div>

                      <form onSubmit={handleSaveProd} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('admin.name_en')}</label>
                            <input required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('admin.name_ta')}</label>
                            <input required value={prodForm.nameTa} onChange={e => setProdForm({...prodForm, nameTa: e.target.value})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('admin.price')}</label>
                            <input type="number" required value={prodForm.price || ''} onChange={e => setProdForm({...prodForm, price: Number(e.target.value)})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('admin.stock')}</label>
                            <input type="number" required value={prodForm.stock || ''} onChange={e => setProdForm({...prodForm, stock: Number(e.target.value)})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                          </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('admin.category')}</label>
                           <input required value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Image URL</label>
                           <input value={prodForm.image} onChange={e => setProdForm({...prodForm, image: e.target.value})} className="w-full px-3 py-2 bg-[#fbfbfb] border border-gray-200 rounded-lg text-sm focus:bg-white outline-none focus:ring-1 focus:ring-sageDark" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-2">
                           <button type="submit" disabled={loading} className="w-full py-3 bg-[#232f3e] hover:bg-[#37475a] text-white font-black rounded-lg transition-all shadow-md active:scale-95">
                              {loading ? 'Processing...' : editingProd ? t('admin.save') : t('admin.add_product')}
                           </button>
                        </div>
                        {productNotice && <p className="text-[10px] text-center font-bold text-sageDark uppercase tracking-widest">{productNotice}</p>}
                      </form>
                   </div>
                </div>

                {/* Products List */}
                <div className="lg:col-span-7 space-y-4">
                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-hidden">
                      <div className="flex items-center justify-between mb-6">
                         <h3 className="font-black text-lg">Product Catalog <span className="text-xs text-gray-400 font-bold ml-2">({products.length} Items)</span></h3>
                         <Filter size={18} className="text-gray-400" />
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                         {products.map(p => (
                            <div key={p.id} className="py-4 flex items-center justify-between gap-4 group">
                               <div className="flex items-center gap-4">
                                  <img src={p.image} className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100" />
                                  <div>
                                     <h4 className="font-bold text-gray-900">{lang === 'ta' ? p.nameTa : p.name}</h4>
                                     <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">{p.category}</p>
                                     <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-sm font-black text-sageDark">₹{p.offerPrice || p.price}</span>
                                        <div className="h-3 w-px bg-gray-200"></div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${p.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>Stock: {p.stock}</span>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {setEditingProd(p); setProdForm({ ...p, offerPrice: String(p.offerPrice) } as any)}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteProd(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
            
            {tab === 'categories' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">

                 {/* ── Categories ───────────────────────────────────── */}
                 <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                   <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><List size={18} className="text-green-600"/></div>
                     Manage Categories
                   </h3>

                   {/* Add form */}
                   <form onSubmit={handleAddCat} className="flex gap-2 mb-6">
                     <input required value={catForm.name_en} onChange={e => setCatForm({...catForm, name_en: e.target.value})} placeholder="English name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-sageDark" />
                     <input value={catForm.name_ta} onChange={e => setCatForm({...catForm, name_ta: e.target.value})} placeholder="Tamil name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-sageDark" />
                     <button type="submit" disabled={catTagSaving} className="px-4 py-2 bg-[#232f3e] text-white rounded-lg text-sm font-bold hover:bg-[#37475a] flex items-center gap-1"><Plus size={14}/> Add</button>
                   </form>

                   <div className="space-y-3 max-h-96 overflow-y-auto">
                     {cats.map(c => (
                       <div key={c.id} className="flex items-center justify-between p-3 bg-[#fbfbfb] border border-gray-100 rounded-xl group hover:border-gray-300 transition-all">
                         <span className="font-bold text-sm">{c.name_en} <span className="text-xs text-gray-400 ml-1">· {c.name_ta}</span></span>
                         <button onClick={() => handleDeleteCat(c.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all"><Trash2 size={14}/></button>
                       </div>
                     ))}
                     {cats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>}
                   </div>
                 </div>

                 {/* ── Health Tags ───────────────────────────────────── */}
                 <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                   <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Tag size={18} className="text-blue-600"/></div>
                     Health Tags
                   </h3>

                   {/* Add form */}
                   <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
                     <input required value={tagForm.name_en} onChange={e => setTagForm({...tagForm, name_en: e.target.value})} placeholder="English name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-sageDark" />
                     <input value={tagForm.name_ta} onChange={e => setTagForm({...tagForm, name_ta: e.target.value})} placeholder="Tamil name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-sageDark" />
                     <button type="submit" disabled={catTagSaving} className="px-4 py-2 bg-[#007185] text-white rounded-lg text-sm font-bold hover:bg-[#008296] flex items-center gap-1"><Plus size={14}/> Add</button>
                   </form>

                   <div className="space-y-3 max-h-96 overflow-y-auto">
                     {tags.map(tg => (
                       <div key={tg.id} className="flex items-center justify-between p-3 bg-[#fbfbfb] border border-gray-100 rounded-xl group hover:border-gray-300 transition-all">
                         <span className="font-bold text-sm">{tg.name_en} <span className="text-xs text-gray-400 ml-1">· {tg.name_ta}</span></span>
                         <button onClick={() => handleDeleteTag(tg.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all"><Trash2 size={14}/></button>
                       </div>
                     ))}
                     {tags.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No health tags yet</p>}
                   </div>

                   {catTagNotice && (
                     <p className="mt-4 text-xs font-bold text-center text-green-600">{catTagNotice}</p>
                   )}
                 </div>
               </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
