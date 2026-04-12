import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { Package, User, LogOut, ChevronDown, ChevronUp, ShoppingBag, Settings } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getLocalOrdersForUser } from '../lib/ordersFallback'

interface ProfileOrderItem {
  id?: number | string
  qty: number
  price: number
  offerPrice: number | null
  name: string
  nameTa?: string | null
  image?: string | null
}

interface ProfileOrder {
  id: string
  invoice_no: string
  customer_name: string
  phone: string
  address: string
  subtotal: number
  shipping: number
  total: number
  status: string
  created_at: string
  items: ProfileOrderItem[]
}



export default function Profile() {
  const { user, logout } = useAuthStore()
  const { lang, t } = useLangStore()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ProfileOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'info'>('orders')

  const parseOrderItems = (value: unknown): ProfileOrderItem[] => {
    if (!Array.isArray(value)) return []

    return value.map((item: any) => ({
      id: item.id,
      qty: Number(item.qty || item.quantity || 0),
      price: Number(item.price || 0),
      offerPrice: item.offerPrice == null ? null : Number(item.offerPrice),
      name: String(item.name || 'Product'),
      nameTa: item.nameTa || null,
      image: item.image || null,
    }))
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role === 'admin') { setLoading(false); return }

    if (!isSupabaseConfigured) {
      const localOrders = getLocalOrdersForUser({ userId: user.id, phone: user.mobile })
      setOrders(localOrders.map((order) => ({
        ...order,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        total: Number(order.total),
        items: parseOrderItems(order.items),
      })))
      setLoading(false)
      return
    }

    const loadOrders = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) {
          navigate('/login')
          return
        }

        const phoneDigits = (user.mobile || '').replace(/\D/g, '')

        const baseQuery = supabase
          .from('orders')
          .select('id, invoice_no, customer_name, phone, address, items, subtotal, shipping, total, status, created_at')
          .order('created_at', { ascending: false })

        let ordersData: any[] | null = null
        let ordersError: any = null

        const linkedOrdersResult = await baseQuery.eq('user_id', authData.user.id)
        ordersData = linkedOrdersResult.data
        ordersError = linkedOrdersResult.error

        if ((!ordersData || ordersData.length === 0) && phoneDigits) {
          const phoneOrdersResult = await baseQuery.eq('phone', phoneDigits)
          ordersData = phoneOrdersResult.data
          ordersError = phoneOrdersResult.error
        }

        if (ordersError) {
          throw ordersError
        }

        if (!ordersData || ordersData.length === 0) {
          setOrders([])
          return
        }

        const mappedOrders: ProfileOrder[] = ordersData.map((order) => ({
          ...order,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping),
          total: Number(order.total),
          items: parseOrderItems(order.items),
        }))

        setOrders(mappedOrders)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    void loadOrders()

    const channel = supabase
      .channel(`profile-orders-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrders()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, navigate])

  if (!user) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    await logout()
    navigate('/')
  }

  return (
    <div className="bg-bgMain min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold font-headline text-textMain mb-8">{t('profile.title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-sand/50">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-6 pb-6 border-b border-sand">
                <div className="w-20 h-20 bg-gradient-to-br from-sage to-sageDark rounded-full flex items-center justify-center mb-3">
                  <span className="text-white text-3xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <h2 className="text-lg font-bold text-textMain">{user.name}</h2>
                <p className="text-sm text-textMuted">{user.email}</p>
                {user.mobile && <p className="text-sm text-textMuted">{user.mobile}</p>}
                <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-sageDark/20 text-sageDark' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role === 'admin' ? `⚡ ${t('admin.admin_role')}` : `🛒 ${t('admin.cust_role')}`}
                </span>
              </div>

              {/* Nav */}
              <div className="space-y-2">
                <button onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'orders' ? 'bg-sageDark/10 text-sageDark' : 'text-textMuted hover:bg-bgMain'}`}>
                  <Package size={16} /> {t('profile.orders')}
                </button>
                <button onClick={() => setActiveTab('info')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'info' ? 'bg-sageDark/10 text-sageDark' : 'text-textMuted hover:bg-bgMain'}`}>
                  <User size={16} /> {t('profile.info')}
                </button>
                <button onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-textMuted hover:bg-bgMain transition-colors">
                  <Settings size={16} /> {t('admin.title')}
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={16} /> {t('nav.logout')}
                </button>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="md:col-span-2">
            {/* Account Info */}
            {activeTab === 'info' && (
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-sand/50">
                <h2 className="text-xl font-bold text-textMain mb-6 flex items-center gap-2">
                  <User size={20} className="text-sageDark" /> {t('profile.account_info')}
                </h2>
                <div className="space-y-4">
                  {[
                    { label: t('profile.labels.name'), value: user.name },
                    { label: t('profile.labels.email'), value: user.email || '—' },
                    { label: t('profile.labels.mobile'), value: user.mobile || '—' },
                    { label: t('profile.labels.role'), value: user.role === 'admin' ? t('admin.admin_role') : t('admin.cust_role') },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-4 p-4 bg-bgMain rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-textMuted uppercase tracking-wide">{item.label}</p>
                        <p className="font-bold text-textMain mt-1">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {isSupabaseConfigured && (
                  <p className="text-xs text-textMuted mt-6 bg-blue-50 px-4 py-3 rounded-xl">
                    ✉️ Your account is linked to your email. To update your profile, contact support.
                  </p>
                )}
              </div>
            )}

            {/* Orders */}
            {activeTab === 'orders' && (
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-sand/50">
                <h2 className="text-xl font-bold text-textMain mb-6 flex items-center gap-2">
                  <Package size={20} className="text-sageDark" /> {t('profile.orders')}
                  <span className="ml-auto text-sm font-normal text-textMuted font-bold">{orders.length} {t('profile.orders_count_label')}</span>
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="w-8 h-8 border-4 border-sand border-t-sageDark rounded-full animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag size={48} className="mx-auto text-textMuted opacity-30 mb-4" />
                    <p className="font-bold text-textMain mb-2">{t('profile.no_orders')}</p>
                    <p className="text-sm text-textMuted mb-6">{t('profile.start_shopping')}</p>
                    <Link to="/products"
                      className="inline-block bg-sageDark hover:bg-sageDeep text-white font-bold px-6 py-3 rounded-xl transition-colors">
                      {t('profile.browse_products')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((o) => {
                      const isExpanded = expanded === o.id
                      return (
                        <div key={o.id} className="border border-sand rounded-xl overflow-hidden">
                          <div
                            onClick={() => setExpanded(isExpanded ? null : o.id)}
                            className="flex flex-wrap gap-4 items-center justify-between p-4 cursor-pointer hover:bg-bgMain transition-colors"
                          >
                            <div>
                              <p className="font-bold text-sm text-textMain">{o.invoice_no}</p>
                              <p className="text-xs text-textMuted mt-0.5">
                                {new Date(o.created_at).toLocaleDateString('en-GB')} · {o.items?.length || 0} {t('profile.items_label')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-textMain uppercase tracking-tight">₹{o.total}</span>
                              {isExpanded ? <ChevronUp size={16} className="text-textMuted" /> : <ChevronDown size={16} className="text-textMuted" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-sand bg-white p-4">
                              <div className="mb-4 pb-4 border-b border-sand/50 text-sm grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-textMuted font-bold uppercase mb-1">{t('profile.labels.customer')}</p>
                                  <p className="font-medium text-textMain">{o.customer_name}</p>
                                  <p className="text-textMuted">{o.phone}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-textMuted font-bold uppercase mb-1">{t('profile.labels.address')}</p>
                                  <p className="text-textMuted">{o.address}</p>
                                </div>
                              </div>

                              <table className="w-full text-sm">
                                <thead className="text-left text-textMuted border-b border-sand">
                                  <tr>
                                    <th className="pb-2 font-medium">Item</th>
                                    <th className="pb-2 font-medium text-center">Qty</th>
                                    <th className="pb-2 font-medium text-right">Price</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-sand/30">
                                  {(o.items || []).map((item: any, i: number) => {
                                    const pName = lang === 'ta' && item.nameTa ? item.nameTa : item.name
                                    const effPrice = item.offerPrice || item.price
                                    return (
                                      <tr key={i}>
                                        <td className="py-2 font-medium text-textMain">{pName}</td>
                                        <td className="py-2 text-center text-textMuted">{item.qty}</td>
                                        <td className="py-2 text-right font-bold text-textMain">₹{effPrice * item.qty}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>

                              <div className="mt-4 pt-4 border-t border-sand text-sm space-y-1 text-right">
                                <p className="text-textMuted">Subtotal: ₹{o.subtotal}</p>
                                <p className="text-textMuted">Shipping: {o.shipping === 0 ? 'FREE' : `₹${o.shipping}`}</p>
                                <p className="font-bold text-textMain text-base">Total: ₹{o.total}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
