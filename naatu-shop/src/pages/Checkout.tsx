import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { ArrowLeft, MessageCircle, Printer, CheckCircle, ShoppingBag } from 'lucide-react'
import { createOrderWithStock } from '../services/orderService'
import { BRAND_EN, BRAND_TA, BRAND_SUBTITLE, BRAND_WHATSAPP } from '../lib/brand'
import {
  buildStructuredOrderItem,
  formatCurrency,
  formatPricePerUnit,
  formatQuantityDisplay,
} from '../lib/retail'

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

const WHATSAPP_RECIPIENT = '918610632662'
const toNumericProductId = (value: string | number): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

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

    const structuredItems = items.map((item) => buildStructuredOrderItem({
      productId: toNumericProductId(item.id),
      name: item.name,
      tamilName: item.tamilName || item.nameTa || null,
      quantity: item.qty,
      unit: item.selectedUnit,
      unitType: item.unitType,
      baseQuantity: item.baseQuantity,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl || item.image || null,
    }))

    try {
      const created = await createOrderWithStock({
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        items: structuredItems,
        shipping,
        status: 'pending',
      })

      const itemsSnapshot = [...items]
      const bookedSnapshot: BookedOrderSnapshot = {
        invoiceNo: created.invoiceNo,
        orderId: created.orderId,
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

  const sendToWhatsApp = () => {
    if (!booked) return
    const text = encodeURIComponent(
      `🌿 *${BRAND_EN}* — New Booking\n\n` +
      `*Invoice:* ${booked.invoiceNo}\n` +
      `*Name:* ${booked.name}\n` +
      `*Phone:* ${booked.phone}\n` +
      `*Address:* ${booked.address}\n\n` +
      booked.items.map(i => {
        const pName = lang === 'ta' && i.nameTa ? i.nameTa : i.name
        return `• ${pName} (${formatQuantityDisplay(i.qty, i.selectedUnit, i.unitType)}) = ${formatCurrency(i.lineTotal)}`
      }).join('\n') +
      `\n\n*Subtotal:* ${formatCurrency(booked.subtotal)}\n*Shipping:* ${booked.shipping === 0 ? 'FREE' : formatCurrency(booked.shipping)}\n*Grand Total: ${formatCurrency(booked.total)}*\n\nThank you! | இங்கு வாங்கியதற்கு நன்றி!`
    )
    window.open(`https://wa.me/${WHATSAPP_RECIPIENT}?text=${text}`, '_blank')
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
          <div className="print-receipt mx-auto max-w-[430px] bg-white p-6 rounded-2xl shadow-soft border border-sand/50 mb-6 print:shadow-none print:border-none print:m-0 print:p-0">
            <div className="text-center mb-6 pb-6 border-b border-sand">
              <h2 className="text-2xl font-bold font-headline text-sageDeep">{BRAND_EN}</h2>
              <p className="text-sm text-textMuted">{BRAND_TA}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-sageDark font-bold mt-1">{BRAND_SUBTITLE}</p>
              <div className="mt-4 flex justify-between text-xs text-left">
                <div>
                  <p><span className="font-bold">Invoice No:</span> {booked.invoiceNo}</p>
                  <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                  <p><span className="font-bold">Status:</span> <span className="text-amber-600 font-bold">Pending</span></p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Bill To:</span> {booked.name}</p>
                  <p>{booked.phone}</p>
                  <p className="max-w-[180px] text-right">{booked.address}</p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm mb-6 pb-6 border-b border-sand">
              <thead className="text-left text-textMuted border-b border-sand">
                <tr>
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-center font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/30">
                {booked.items.map((item, i) => {
                  const pName = lang === 'ta' && item.nameTa ? item.nameTa : item.name
                  return (
                    <tr key={item.id}>
                      <td className="py-2 text-textMuted">{i + 1}</td>
                      <td className="py-2 font-medium">
                        {pName}
                        <p className="text-[11px] text-textMuted">{formatPricePerUnit(item.basePrice, item.baseQuantity, item.unitLabel, item.unitType)}</p>
                      </td>
                      <td className="py-2 text-center">{formatQuantityDisplay(item.qty, item.selectedUnit, item.unitType)}</td>
                      <td className="py-2 text-right text-textMuted">{formatCurrency(item.basePrice)}</td>
                      <td className="py-2 text-right font-bold">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="space-y-1.5 text-sm text-right">
              <p className="text-textMuted">Subtotal: <span className="font-medium text-textMain">{formatCurrency(booked.subtotal)}</span></p>
              <p className="text-textMuted">Shipping: <span className="font-medium text-textMain">{booked.shipping === 0 ? 'FREE 🎉' : formatCurrency(booked.shipping)}</span></p>
              <p className="text-lg font-bold font-headline mt-3 border-t border-sand pt-3">Grand Total: {formatCurrency(booked.total)}</p>
            </div>

            <div className="mt-8 pt-5 border-t border-sand text-center text-xs text-textMuted">
              <p className="font-bold">Thank you for shopping with us! | இங்கு வாங்கியதற்கு நன்றி!</p>
              <p className="mt-1">Contact: WhatsApp {BRAND_WHATSAPP}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <button onClick={sendToWhatsApp}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors">
              <MessageCircle size={18} /> WhatsApp
            </button>
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
                  <><ShoppingBag size={18} /> Confirm Booking — {formatCurrency(grand)}</>
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
                return (
                  <div key={item.id} className="flex items-center gap-3 pt-4 first:pt-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-sand/20 shrink-0">
                      <img src={item.image} alt={item.name} loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80' }}
                        className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-textMain">{pName}</p>
                      <p className="text-xs text-textMuted">{formatQuantityDisplay(item.qty, item.selectedUnit, item.unitType)}</p>
                    </div>
                    <p className="font-bold text-sm text-textMain">{formatCurrency(item.lineTotal)}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-sand space-y-2 text-sm">
              <div className="flex justify-between text-textMuted">
                <span>Subtotal</span><span>{formatCurrency(sub)}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>Shipping</span>
                <span className={shipping === 0 && sub > 0 ? 'text-green-600 font-bold' : ''}>
                  {sub === 0 ? '–' : shipping === 0 ? 'FREE 🎉' : formatCurrency(shipping)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-textMain text-base border-t border-sand pt-3 mt-3">
                <span>Grand Total</span><span>{formatCurrency(grand)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
