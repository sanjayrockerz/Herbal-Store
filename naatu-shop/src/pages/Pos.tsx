import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Printer, Receipt, Search, Trash2, Plus, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createLocalOrder } from '../lib/ordersFallback'
import { useProductStore, type Product } from '../store/store'
import { BRAND_EN, BRAND_TA, BRAND_SUBTITLE } from '../lib/brand'
import { Invoice } from '../components/Invoice'

type PosItem = Product & { qty: number }

const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export default function Pos() {
  const { products, fetchProducts, error: productError } = useProductStore()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<PosItem[]>([])
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualForm, setManualForm] = useState({ name: '', price: '' })
  const [invoice, setInvoice] = useState<{
    id: string
    invoiceNo: string
    date: string
    items: PosItem[]
    subtotal: number
    shipping: number
    total: number
  } | null>(null)

  useEffect(() => {
    void fetchProducts()

    if (!isSupabaseConfigured) {
      return
    }

    const channel = supabase
      .channel('pos-products-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        void fetchProducts()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products.slice(0, 60)
    return products
      .filter((product) =>
        product.name.toLowerCase().includes(q)
        || product.category.toLowerCase().includes(q)
        || (product.remedy || []).some((tag) => tag.toLowerCase().includes(q)),
      )
      .slice(0, 60)
  }, [products, search])

  const subtotal = items.reduce((sum, item) => {
    const unit = item.offerPrice || item.price
    return sum + unit * item.qty
  }, 0)
  const shipping = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 50
  const total = subtotal + shipping

  const addItem = (product: Product) => {
    setError('')
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.qty >= (product.stock || 999)) {
          setError(`Only ${product.stock} stock available for ${product.name}.`)
          return current
        }
        return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
      }
      if ((product.stock || 0) <= 0 && product.id > 0) {
        setError(`${product.name} is out of stock.`)
        return current
      }
      return [...current, { ...product, qty: 1 }]
    })
  }

  const addManualItem = () => {
    if (!manualForm.name || !manualForm.price) return
    const price = parseFloat(manualForm.price)
    if (isNaN(price)) return

    const newItem: Product = {
      id: -Date.now(), // negative ID for manual items
      name: manualForm.name,
      category: 'Manual',
      price: price,
      stock: 999,
      unit: 'pc',
      rating: 5,
      description: 'Manual entry',
      image: 'https://images.unsplash.com/photo-1586769852044-692d6e3713b0?w=100&q=80',
      benefits: '',
      remedy: []
    }
    addItem(newItem)
    setManualForm({ name: '', price: '' })
    setManualMode(false)
  }

  const updateQty = (productId: number, nextQty: number) => {
    if (nextQty < 1) {
      setItems((current) => current.filter((item) => item.id !== productId))
      return
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id !== productId) return item
        return { ...item, qty: Math.min(nextQty, Math.max(item.stock, 1)) }
      }),
    )
  }

  const removeItem = (productId: number) => {
    setItems((current) => current.filter((item) => item.id !== productId))
  }

  const createInvoice = async () => {
    if (!items.length) {
      setError('Add products to generate invoice.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (!isSupabaseConfigured) {
        const local = createLocalOrder({
          userId: null,
          customerName: customer.name.trim() || 'Walk-in Customer',
          phone: customer.phone.trim() || '0000000000',
          address: customer.address.trim() || 'POS Counter',
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            nameTa: item.nameTa || null,
            price: item.price,
            offerPrice: item.offerPrice || null,
            qty: item.qty,
            image: item.image,
          })),
          subtotal,
          shipping,
          total,
        })

        setInvoice({
          id: local.id,
          invoiceNo: local.invoice_no,
          date: local.created_at,
          items,
          subtotal,
          shipping,
          total,
        })
        setItems([])
        setCustomer({ name: '', phone: '', address: '' })
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const userIdRaw = authData.user?.id
      const userId = isUuid(userIdRaw) ? userIdRaw : null
      const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

      const itemsPayload = items.map((item) => ({
        id: item.id,
        name: item.name,
        nameTa: item.nameTa || null,
        price: item.price,
        offerPrice: item.offerPrice || null,
        qty: item.qty,
        image: item.image,
      }))

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          invoice_no: invoiceNo,
          user_id: userId,
          customer_name: customer.name.trim() || 'Walk-in Customer',
          phone: customer.phone.trim() || '0000000000',
          address: customer.address.trim() || 'POS Counter',
          items: itemsPayload,
          subtotal,
          shipping,
          total,
          status: 'pending',
        })
        .select('id, invoice_no, created_at')
        .single()

      if (insertError || !insertedOrder) {
        throw new Error(insertError?.message || 'Failed to save invoice')
      }

      const stockUpdates = await Promise.all(
        items.map((item) =>
          supabase
            .from('products')
            .update({ stock: Math.max(0, item.stock - item.qty) })
            .eq('id', item.id),
        ),
      )

      const hasStockError = stockUpdates.some((result: any) => result.error)
      if (hasStockError) {
        setError('Invoice saved, but stock update failed for some items.')
      }

      setInvoice({
        id: insertedOrder.id,
        invoiceNo: insertedOrder.invoice_no,
        date: insertedOrder.created_at || new Date().toISOString(),
        items,
        subtotal,
        shipping,
        total,
      })
      setItems([])
      setCustomer({ name: '', phone: '', address: '' })
      void fetchProducts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const printBill = () => {
    window.print()
  }


  return (
    <div className="bg-bgMain min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline text-textMain">{BRAND_EN}</h1>
            <p className="text-sm text-textMuted">{BRAND_TA} · {BRAND_SUBTITLE} · POS Billing</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {isSupabaseConfigured ? 'Supabase Connected' : 'Fallback Mode (Local)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setItems([])
                setCustomer({ name: '', phone: '', address: '' })
                setInvoice(null)
                setError('')
              }}
              className="px-4 py-2 rounded-xl border-2 border-red-100 text-red-500 font-bold text-sm bg-red-50 hover:bg-red-100 transition-colors"
            >
              New Order / Clear
            </button>
            <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white border border-sand text-textMain font-bold text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {(error || (productError && products.length === 0)) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
            {error || productError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-grow">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Amazon/Swiggy style..."
                  className="w-full pl-10 pr-3 py-3 border-2 border-sand/30 rounded-2xl text-sm focus:border-sageDark transition-all outline-none bg-bgMain/50"
                />
              </div>
              <button 
                onClick={() => setManualMode(!manualMode)}
                className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 transition-all ${manualMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-sage/20 border-sage/40 text-sageDark hover:bg-sage/40'}`}
              >
                {manualMode ? <X size={16}/> : <Plus size={16}/>} {manualMode ? 'Cancel' : 'Manual Item'}
              </button>
            </div>

            <AnimatePresence>
              {manualMode && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="bg-bgMain p-4 rounded-2xl border-2 border-sand/50 mb-6 flex flex-col sm:flex-row gap-3 items-end overflow-hidden"
                >
                  <div className="flex-grow w-full">
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Item Name</label>
                    <input autoFocus value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="e.g. Loose Ginger" className="w-full px-3 py-2 border border-sand rounded-xl text-sm outline-none focus:border-sageDark" />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Price (₹)</label>
                    <input type="number" value={manualForm.price} onChange={e => setManualForm({...manualForm, price: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 border border-sand rounded-xl text-sm outline-none focus:border-sageDark" />
                  </div>
                  <button onClick={addManualItem} className="bg-sageDark text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-sageDeep">Add</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[60vh] overflow-auto pr-1 custom-scrollbar">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product)}
                  className="group relative bg-bgMain rounded-2xl border-2 border-transparent hover:border-sageDark/30 p-2 text-left transition-all hover:shadow-lg active:scale-95"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-white">
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                  </div>
                  <p className="text-[11px] font-black text-textMain line-clamp-1 h-4">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-black text-sageDark">₹{product.offerPrice || product.price}</p>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sageDark shadow-sm group-hover:bg-sageDark group-hover:text-white transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                  {product.stock < 5 && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                      Low
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft">
            <h2 className="font-bold text-textMain mb-3">Current Bill</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer name" className="px-3 py-2 border border-sand rounded-xl text-sm" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })} placeholder="Phone" className="px-3 py-2 border border-sand rounded-xl text-sm" />
              <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Address" className="sm:col-span-2 px-3 py-2 border border-sand rounded-xl text-sm" />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
              {items.length === 0 && <p className="text-sm text-textMuted">No items added.</p>}
              {items.map((item) => {
                const unit = item.offerPrice || item.price
                return (
                  <div key={item.id} className="p-2 rounded-xl border border-sand/50 flex items-center justify-between gap-3 bg-white hover:border-sand transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-sand/30">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-textMain line-clamp-1">{item.name}</p>
                        <p className="text-[10px] font-bold text-sageDark">₹{unit} per unit</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-bgMain rounded-lg border border-sand/40 p-1">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white transition-colors">-</button>
                        <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white transition-colors">+</button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-sand/50 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-textMuted">Subtotal</span><span>₹{subtotal}</span></div>
              <div className="flex justify-between"><span className="text-textMuted">Shipping</span><span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total}</span></div>
            </div>

            <button
              onClick={createInvoice}
              disabled={saving}
              className="mt-4 w-full py-3 rounded-xl bg-sageDark text-white font-bold hover:bg-sageDeep disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Receipt size={18} /> {saving ? 'Saving...' : 'Generate Bill'}
            </button>
          </div>
        </div>

        {invoice && (
          <div className="space-y-6">
            <Invoice
              invoiceNo={invoice.invoiceNo}
              date={invoice.date}
              customerName={customer.name || 'Walk-in Customer'}
              phone={customer.phone || '0000000000'}
              address={customer.address || 'POS Counter'}
              items={invoice.items}
              subtotal={invoice.subtotal}
              shipping={invoice.shipping}
              total={invoice.total}
            />
            
            <div className="flex justify-center gap-4 print:hidden">
              <button onClick={printBill} className="px-6 py-3 rounded-xl border-2 border-sand text-textMain font-bold flex items-center gap-2 hover:border-sageDark transition-colors">
                <Printer size={18} /> Print Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}