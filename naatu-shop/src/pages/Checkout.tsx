import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { ArrowLeft, Printer, CheckCircle, ShoppingBag } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createLocalOrder } from '../lib/ordersFallback'
import { Invoice } from '../components/Invoice'

interface BookedOrderSnapshot {
  invoiceNo: string
  orderId: string
  items: ReturnType<typeof useCartStore.getState>['items']
  subtotal: number
  shipping: number
  total: number
  name: string
  phone: string
  address: string
}

// WHATSAPP_NUM imported from brand.ts
const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export default function Checkout() {
  const { items, clear, total } = useCartStore()
  const { user } = useAuthStore()
  const { lang } = useLangStore()
  const navigate = useNavigate()

  const sub = total()
  const shipping = sub === 0 ? 0 : sub >= 500 ? 0 : 50
  const grand = sub + shipping

  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [booked, setBooked] = useState<BookedOrderSnapshot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (items.length === 0 && !booked) navigate('/cart')
    if (user) {
      setForm(f => ({
        ...f,
        name: f.name || user.name,
        phone: f.phone || user.mobile || ''
      }))
    }
  }, [items.length, user, navigate, booked])

  const handleCheckout = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Please fill in all required fields')
      return
    }
    if (form.phone.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit WhatsApp number')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!isSupabaseConfigured) {
        const local = createLocalOrder({
          userId: user?.id || null,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            nameTa: item.nameTa || null,
            price: item.price,
            offerPrice: item.offerPrice || null,
            qty: item.qty,
            image: item.image,
          })),
          subtotal: sub,
          shipping,
          total: grand,
        })

        const bookedSnapshot: BookedOrderSnapshot = {
          invoiceNo: local.invoice_no,
          orderId: local.id,
          items: [...items],
          subtotal: sub,
          shipping,
          total: grand,
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }

        clear()
        setBooked(bookedSnapshot)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      const userIdRaw = userData.user?.id
      const userId = isUuid(userIdRaw) ? userIdRaw : null
      const fallbackInvoice = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      const invoiceNo = fallbackInvoice

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          invoice_no: invoiceNo,
          user_id: userId,
          customer_name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            nameTa: item.nameTa || null,
            price: item.price,
            offerPrice: item.offerPrice || null,
            qty: item.qty,
            image: item.image,
          })),
          subtotal: sub,
          shipping,
          total: grand,
          status: 'pending',
        })
        .select('id, invoice_no, items')
        .single()

      if (orderError || !insertedOrder) {
        throw new Error(orderError?.message || 'Failed to create order')
      }

      const itemsSnapshot = [...items]
      const bookedSnapshot: BookedOrderSnapshot = {
        invoiceNo: insertedOrder.invoice_no,
        orderId: insertedOrder.id,
        items: itemsSnapshot,
        subtotal: sub,
        shipping,
        total: grand,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      }

      clear()
      setBooked(bookedSnapshot)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  // ── Order Confirmed screen ─────────────────────────────────
  if (booked) {
    return (
      <div className="bg-bgMain min-h-screen py-16 print:bg-white print:py-0">
        <div className="max-w-2xl mx-auto px-4">
          {/* Success banner */}
          <div className="bg-white p-10 rounded-3xl shadow-soft border border-sand/50 text-center mb-8 print:shadow-none print:border-none">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={44} className="text-green-500" />
            </div>
            <h1 className="text-3xl font-bold font-headline text-textMain mb-2">Booking Confirmed!</h1>
            <p className="text-textMuted mb-1">Your order has been placed successfully.</p>
            <p className="font-bold text-sageDark text-lg">{booked.invoiceNo}</p>
          </div>

          {/* Invoice */}
          <div className="mb-10">
            <Invoice
              invoiceNo={booked.invoiceNo}
              date={new Date().toISOString()}
              customerName={booked.name}
              phone={booked.phone}
              address={booked.address}
              items={booked.items}
              subtotal={booked.subtotal}
              shipping={booked.shipping}
              total={booked.total}
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <button onClick={() => window.print()}
              className="flex items-center justify-center gap-2 border-2 border-sand hover:border-sageDark text-textMain font-bold py-3.5 rounded-xl transition-colors">
              <Printer size={18} /> Print Bill
            </button>
            {user ? (
              <Link to="/profile"
                className="flex items-center justify-center gap-2 bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors">
                <ShoppingBag size={18} /> View Orders
              </Link>
            ) : (
              <Link to="/"
                className="flex items-center justify-center gap-2 bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors">
                Continue Shopping
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout Form ──────────────────────────────────────────
  return (
    <div className="bg-bgMain min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={() => navigate('/cart')} className="flex items-center gap-2 mb-6 text-sageDark font-bold">
          <ArrowLeft size={16} /> Back to Cart
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-sand/50 h-fit">
            <h2 className="text-xl font-bold text-textMain mb-5">Delivery Details</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-textMain mb-1.5">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-sand focus:border-sageDark rounded-xl outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-textMain mb-1.5">WhatsApp Number *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  maxLength={10} placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 border-2 border-sand focus:border-sageDark rounded-xl outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-textMain mb-1.5">Delivery Address *</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  rows={4} placeholder="House no., street, city, pincode"
                  className="w-full px-4 py-3 border-2 border-sand focus:border-sageDark rounded-xl outline-none transition-colors resize-none" required />
              </div>

              {!user && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
                  💡 <Link to="/login" className="font-bold underline">Sign in</Link> to track your orders in your profile.
                </div>
              )}

              <button onClick={handleCheckout} disabled={loading}
                className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order...</>
                ) : (
                  <><ShoppingBag size={18} /> Confirm Booking — ₹{grand}</>
                )}
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-sand/50">
            <h2 className="text-xl font-bold text-textMain mb-5">Order Summary</h2>
            <div className="space-y-4 divide-y divide-sand/30">
              {items.map(item => {
                const pName = lang === 'ta' && item.nameTa ? item.nameTa : item.name
                const effPrice = item.offerPrice || item.price
                return (
                  <div key={item.id} className="flex items-center gap-3 pt-4 first:pt-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-sand/20 shrink-0">
                      <img src={item.image} alt={item.name} loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80' }}
                        className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-textMain">{pName}</p>
                      <p className="text-xs text-textMuted">×{item.qty}</p>
                    </div>
                    <p className="font-bold text-sm text-textMain">₹{effPrice * item.qty}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-sand space-y-2 text-sm">
              <div className="flex justify-between text-textMuted">
                <span>Subtotal</span><span>₹{sub}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>Shipping</span>
                <span className={shipping === 0 && sub > 0 ? 'text-green-600 font-bold' : ''}>
                  {sub === 0 ? '–' : shipping === 0 ? 'FREE 🎉' : `₹${shipping}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-textMain text-base border-t border-sand pt-3 mt-3">
                <span>Grand Total</span><span>₹{grand}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
