import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BarChart2, Plus, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { useLangStore } from '../store/langStore'
import { type Product, useProductStore } from '../store/store'

interface Summary {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
}

const initialForm = {
  name: '',
  category: 'Herbal Powder',
  price: 0,
  description: '',
  benefits: '',
  imageUrl: '/assets/images/default-herb.jpg',
  stock: 10,
}

export default function Dashboard() {
  const { t } = useLangStore()
  const { products, fetchProducts, removeProduct } = useProductStore()
  const [summary, setSummary] = useState<Summary>({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 })
  const [orders, setOrders] = useState<Array<{ id: number; totalPrice: number; createdAt: string }>>([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cards = useMemo(
    () => [
      { label: t('admin.products'), value: summary.totalProducts },
      { label: t('admin.orders'), value: summary.totalOrders },
      { label: t('admin.revenue'), value: `₹${summary.totalRevenue.toFixed(2)}` },
    ],
    [summary, t],
  )

  useEffect(() => {
    fetchProducts()
    api.getSummary().then(setSummary).catch(() => setError('Failed to load summary'))
    api
      .getAllOrders()
      .then((rows) => setOrders(rows as Array<{ id: number; totalPrice: number; createdAt: string }>))
      .catch(() => setError('Failed to load orders'))
  }, [fetchProducts])

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.createProduct(form)
      setForm(initialForm)
      await fetchProducts()
      const refreshed = await api.getSummary()
      setSummary(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: number) => {
    try {
      await api.deleteProduct(id)
      removeProduct(id)
      const refreshed = await api.getSummary()
      setSummary(refreshed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="bg-bgMain min-h-screen">
      <div className="bg-gradient-to-r from-[#eaf2e5] to-bgMain border-b border-sand/50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold font-headline text-textMain flex items-center gap-3">
            <BarChart2 className="text-sageDark" /> {t('admin.title')}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft">
              <p className="text-sm text-textMuted">{card.label}</p>
              <p className="text-3xl font-bold text-textMain mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={onCreate} className="bg-white rounded-2xl p-6 border border-sand/50 shadow-soft space-y-3">
            <h2 className="font-bold text-textMain flex items-center gap-2">
              <Plus size={16} /> {t('admin.add_product')}
            </h2>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full h-10 px-3 rounded-xl border border-sand" required />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="w-full h-10 px-3 rounded-xl border border-sand" required />
            <input value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} type="number" min={1} placeholder="Price" className="w-full h-10 px-3 rounded-xl border border-sand" required />
            <input value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} type="number" min={0} placeholder="Stock" className="w-full h-10 px-3 rounded-xl border border-sand" required />
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL" className="w-full h-10 px-3 rounded-xl border border-sand" required />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 rounded-xl border border-sand" rows={2} required />
            <textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="Benefits" className="w-full px-3 py-2 rounded-xl border border-sand" rows={2} required />
            <button disabled={loading} className="w-full h-10 rounded-xl bg-sageDark hover:bg-sageDeep text-white font-bold disabled:opacity-60">
              {loading ? '...' : t('admin.add_product')}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>

          <div className="bg-white rounded-2xl p-6 border border-sand/50 shadow-soft">
            <h2 className="font-bold text-textMain mb-4">Orders</h2>
            <div className="space-y-2 max-h-96 overflow-auto">
              {orders.map((order) => (
                <div key={order.id} className="p-3 rounded-xl bg-bgMain flex items-center justify-between">
                  <span className="text-sm font-medium text-textMain">Order #{order.id}</span>
                  <span className="text-sm text-sageDark font-bold">₹{order.totalPrice}</span>
                </div>
              ))}
              {!orders.length && <p className="text-sm text-textMuted">No orders yet</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sand/50 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-sand/40">
            <h2 className="font-bold text-textMain">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bgMain text-textMuted">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: Product) => (
                  <tr key={product.id} className="border-t border-sand/20">
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3 text-right">₹{product.price}</td>
                    <td className="px-4 py-3 text-right">{product.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onDelete(product.id)} className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold">
                        <Trash2 size={14} /> {t('admin.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
