import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, MessageCircle, Printer, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCartStore, useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

const PHONE = '919876543210'

export default function Cart() {
  const { items, remove, updateQty, total, count, clear } = useCartStore()
  const user = useAuthStore((state) => state.user)
  const { t, lang } = useLangStore()
  const sub = total()
  const shipping = sub === 0 ? 0 : sub >= 500 ? 0 : 50
  const grand = sub + shipping

  const waText = encodeURIComponent(
    `🌿 *Sri Siddha Herbal Store* — My Order\n\n` +
    items.map(i => {
      const dbName = lang === 'ta' && i.nameTa ? i.nameTa : i.name;
      return `• ${dbName} (${i.unit}) ×${i.qty} = ₹${i.price * i.qty}`
    }).join('\n') +
    `\n\nSubtotal: ₹${sub}\nShipping: ${shipping === 0 && sub > 0 ? 'FREE 🎉' : `₹${shipping}`}\n*Grand Total: ₹${grand}*\n\nPlease confirm my order. Thank you! 🙏`
  )

  const placeOrder = async () => {
    if (!user || !items.length) return
    await api.createOrder(items.map((item) => ({ productId: item.id, quantity: item.qty })))
  }

  return (
    <div className="bg-bgMain min-h-screen">
      <div className="bg-gradient-to-r from-[#eaf2e5] to-bgMain border-b border-sand/50 py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <ShoppingBag className="text-sageDark" size={26} />
          <div>
            <h1 className="text-3xl font-bold font-headline text-textMain">{t('cart.title')}</h1>
            <p className="text-textMuted text-sm">{count()} {t('cart.items_in_cart')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Cart items */}
        <div className="w-full lg:w-[62%]">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-sand/50 shadow-soft">
              <p className="text-6xl mb-4">🛒</p>
              <h3 className="text-xl font-bold text-textMain mb-2 font-headline">{t('cart.empty')}</h3>
              <p className="text-textMuted text-sm mb-6">{t('cart.empty_sub')}</p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-sageDark hover:bg-sageDeep text-white font-bold px-6 py-3 rounded-xl transition-colors">
                {t('cart.browse')}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-sand/50 shadow-soft overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand/40">
                <h2 className="font-bold text-textMain font-headline">{t('cart.order_items')} ({items.length})</h2>
                <button onClick={clear} className="text-sm text-red-400 hover:text-red-600 font-medium">{t('cart.clear_all')}</button>
              </div>
              <div className="divide-y divide-sand/30">
                {items.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-sand/40">
                      <img src={item.image} alt={item.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80' }}
                        className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow flex flex-col items-start gap-1">
                      <h3 className="font-bold text-textMain">
                        {lang === 'ta' && item.nameTa ? item.nameTa : item.name}
                      </h3>
                      <p className="text-xs text-sageDark font-bold mt-0.5">{t('cat.' + item.category)}</p>
                      <p className="text-xs text-gray-400">{t('cart.unit')}: {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-0.5 border-2 border-sand rounded-xl overflow-hidden bg-white">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-9 h-9 flex items-center justify-center text-textMuted hover:bg-bgMain hover:text-textMain transition-colors"><Minus size={14} /></button>
                        <span className="w-9 text-center font-bold text-sm text-textMain">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-9 h-9 flex items-center justify-center text-textMuted hover:bg-bgMain hover:text-textMain transition-colors"><Plus size={14} /></button>
                      </div>
                      <span className="text-lg font-bold text-textMain font-headline w-20 text-right">₹{item.price * item.qty}</span>
                      <button onClick={() => remove(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          <Link to="/products" className="inline-flex items-center gap-2 text-sageDark font-bold text-sm mt-5 hover:gap-3 transition-all group">
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" /> {t('cart.continue')}
          </Link>
        </div>

        {/* Invoice + actions */}
        <div className="w-full lg:w-[38%]">
          <div className="bg-white rounded-2xl border border-sand/50 shadow-soft p-6 sticky top-[110px]">
            <h2 className="font-bold text-xl font-headline text-textMain mb-5 pb-4 border-b border-sand/40">{t('cart.bill_summary')}</h2>

            {/* Invoice printable area */}
            <div id="invoice-area" className="bg-bgMain rounded-xl p-4 mb-5 text-sm">
              <div className="text-center mb-3 pb-3 border-b border-dashed border-sand">
                <p className="font-extrabold text-base font-headline text-textMain">🌿 Sri Siddha Herbal Store</p>
                <p className="text-xs text-textMuted">123 Herbal Valley, Tamil Nadu 600001</p>
                <p className="text-xs text-textMuted">+91 98765 43210 | srisiddha.in</p>
              </div>
              {items.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-3">{t('cart.empty')}</p>
              ) : (
                <>
                  {items.map(i => {
                    const dbName = lang === 'ta' && i.nameTa ? i.nameTa : i.name;
                    return (
                      <div key={i.id} className="flex justify-between mb-1.5 gap-2">
                        <span className="text-textMain truncate text-xs">{dbName} ×{i.qty}</span>
                        <span className="font-bold text-textMain text-xs shrink-0">₹{i.price * i.qty}</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-dashed border-sand pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-textMuted"><span>{t('cart.subtotal')}</span><span>₹{sub}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-textMuted">{t('cart.shipping')}</span>
                      <span className={shipping === 0 && sub > 0 ? 'text-sageDark font-bold' : 'text-textMuted'}>
                        {sub === 0 ? '–' : shipping === 0 ? t('cart.free') : `₹${shipping}`}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-textMain text-base border-t pt-2">
                      <span>{t('cart.grand_total')}</span><span>₹{grand}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <a href={items.length ? `https://wa.me/${PHONE}?text=${waText}` : '#'}
                target={items.length ? '_blank' : '_self'} rel="noreferrer"
                onClick={() => {
                  if (user) {
                    placeOrder().catch(() => undefined)
                  }
                }}
                className={`flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-colors text-sm ${
                  items.length ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                }`}>
                <MessageCircle size={16} /> {t('cart.send_wa')}
              </a>
              <button onClick={() => window.print()} disabled={!items.length}
                className="flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl border-2 border-sand hover:border-sageDark text-textMain transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <Printer size={16} /> {t('cart.print')}
              </button>
            </div>

            {sub > 0 && sub < 500 && (
              <p className="text-xs text-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-3 font-medium">
                {t('cart.add_more').replace('{amt}', String(500 - sub))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
