import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useProductStore } from '../store/store'
import { BarChart2, Plus, Trash2, Edit2, Tag, List } from 'lucide-react'

export default function Dashboard() {
  const { products, fetchProducts } = useProductStore()
  const [tab, setTab] = useState<'overview' | 'products' | 'categories'>('overview')
  
  // Overview
  const [summary, setSummary] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 })
  const [orders, setOrders] = useState<any[]>([])
  
  // Custom states
  const [cats, setCats] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [newCat, setNewCat] = useState({ name_en: '', name_ta: '' })
  const [newTag, setNewTag] = useState({ name_en: '', name_ta: '' })
  
  // Product form
  const [editingProd, setEditingProd] = useState<any>(null)
  const [prodForm, setProdForm] = useState<any>({
    name: '', nameTa: '', category: '', remedy: [],
    price: 0, offerPrice: '', stock: 10,
    description: '', descriptionTa: '', benefits: '', benefitsTa: '',
    image: '/assets/images/default-herb.jpg'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
    loadData()
  }, [])

  const loadData = async () => {
    setSummary(await api.getSummary())
    setOrders(await api.getAllOrders() as any)
    setCats(await api.getCategories())
    setTags(await api.getHealthTags())
  }

  // --- Category & Tag Management ---
  const handleAddCat = async (e: any) => {
    e.preventDefault()
    if (!newCat.name_en || !newCat.name_ta) return
    await api.addCategory(newCat)
    setNewCat({ name_en: '', name_ta: '' })
    loadData()
  }
  const handleDeleteCat = async (id: number) => {
    if (confirm('Delete category?')) {
      await api.deleteCategory(id)
      loadData()
    }
  }

  const handleAddTag = async (e: any) => {
    e.preventDefault()
    if (!newTag.name_en || !newTag.name_ta) return
    await api.addHealthTag(newTag)
    setNewTag({ name_en: '', name_ta: '' })
    loadData()
  }
  const handleDeleteTag = async (id: number) => {
    if (confirm('Delete tag?')) {
      await api.deleteHealthTag(id)
      loadData()
    }
  }

  // --- Product Management ---
  const handleEditProd = (p: any) => {
    setEditingProd(p)
    setProdForm({
      name: p.name, nameTa: p.nameTa || '', 
      category: p.category, remedy: p.remedy || [],
      price: p.price, offerPrice: p.offerPrice || '', stock: p.stock,
      description: p.description, descriptionTa: p.descriptionTa || '',
      benefits: p.benefits, benefitsTa: p.benefitsTa || '',
      image: p.image || ''
    })
    setTab('products')
  }

  const toggleRemedy = (tName: string) => {
    setProdForm((f: any) => ({
      ...f, 
      remedy: f.remedy.includes(tName) 
        ? f.remedy.filter((r: string) => r !== tName)
        : [...f.remedy, tName]
    }))
  }

  const handleSaveProd = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...prodForm,
      offerPrice: prodForm.offerPrice ? Number(prodForm.offerPrice) : undefined
    }
    if (editingProd) {
      await api.updateProduct(editingProd.id, payload)
    } else {
      await api.createProduct(payload)
    }
    setEditingProd(null)
    setProdForm({ name: '', nameTa: '', category: '', remedy: [], price: 0, offerPrice: '', stock: 10, description: '', descriptionTa: '', benefits: '', benefitsTa: '', image: '/assets/images/default-herb.jpg' })
    await fetchProducts()
    loadData()
    setLoading(false)
  }

  const handleDeleteProd = async (id: number) => {
    if (confirm('Delete product?')) {
      await api.deleteProduct(id)
      fetchProducts()
      loadData()
    }
  }

  return (
    <div className="bg-bgMain min-h-screen">
      <div className="bg-gradient-to-r from-[#eaf2e5] to-bgMain border-b border-sand/50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold font-headline text-textMain flex items-center gap-3">
            <BarChart2 className="text-sageDark" /> Admin Dashboard
          </h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'overview' ? 'bg-sageDark text-white' : 'bg-white text-textMuted'}`}>Overview</button>
            <button onClick={() => setTab('categories')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'categories' ? 'bg-sageDark text-white' : 'bg-white text-textMuted'}`}>Categories & Tags</button>
            <button onClick={() => setTab('products')} className={`px-4 py-2 rounded-lg font-bold ${tab === 'products' ? 'bg-sageDark text-white' : 'bg-white text-textMuted'}`}>Products (CRUD)</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{ label: 'Total Products', value: summary.totalProducts }, { label: 'Total Orders', value: summary.totalOrders }, { label: 'Total Revenue', value: `₹${summary.totalRevenue}` }].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl p-5 border border-sand/50">
                  <p className="text-sm text-textMuted">{c.label}</p>
                  <p className="text-3xl font-bold text-textMain mt-1">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-6 border border-sand/50">
              <h2 className="font-bold text-textMain mb-4">Recent Orders</h2>
              <div className="space-y-2 max-h-96 overflow-auto">
                {orders.map((o) => (
                  <div key={o.id} className="p-3 rounded-xl bg-bgMain flex items-center justify-between border border-sand/50">
                    <div>
                      <span className="text-sm font-bold text-textMain">{o.invoiceNo} - {o.name}</span>
                      <p className="text-xs text-textMuted">{o.items?.length || 0} items</p>
                    </div>
                    <span className="text-sm text-sageDark font-bold">₹{o.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-sand/50">
              <h2 className="font-bold text-lg mb-4 flex gap-2 items-center"><List size={18}/> Categories</h2>
              <form onSubmit={handleAddCat} className="flex gap-2 mb-6">
                <input required placeholder="Name EN" className="flex-1 px-3 py-2 border border-sand rounded-xl text-sm" value={newCat.name_en} onChange={e=>setNewCat({...newCat, name_en: e.target.value})} />
                <input required placeholder="Name TA" className="flex-1 px-3 py-2 border border-sand rounded-xl text-sm" value={newCat.name_ta} onChange={e=>setNewCat({...newCat, name_ta: e.target.value})} />
                <button className="bg-sageDark text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
              </form>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {cats.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border border-sand rounded-xl text-sm">
                    <span><b>{c.name_en}</b> ({c.name_ta})</span>
                    <button onClick={() => handleDeleteCat(c.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-sand/50">
              <h2 className="font-bold text-lg mb-4 flex gap-2 items-center"><Tag size={18}/> Health Tags</h2>
              <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
                <input required placeholder="Name EN" className="flex-1 px-3 py-2 border border-sand rounded-xl text-sm" value={newTag.name_en} onChange={e=>setNewTag({...newTag, name_en: e.target.value})} />
                <input required placeholder="Name TA" className="flex-1 px-3 py-2 border border-sand rounded-xl text-sm" value={newTag.name_ta} onChange={e=>setNewTag({...newTag, name_ta: e.target.value})} />
                <button className="bg-sageDark text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
              </form>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {tags.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border border-sand rounded-xl text-sm">
                    <span><b>{c.name_en}</b> ({c.name_ta})</span>
                    <button onClick={() => handleDeleteTag(c.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleSaveProd} className="bg-white p-6 rounded-2xl border border-sand/50 space-y-4 shadow-soft sticky top-[110px]">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">{editingProd ? 'Edit Product' : 'Add New Product'}</h2>
                {editingProd && <button type="button" onClick={() => {setEditingProd(null); setProdForm({name:'', nameTa:'', category:'', remedy:[], price:0, offerPrice:'', stock:10, description:'', descriptionTa:'', benefits:'', benefitsTa:'', image:'/assets/images/default-herb.jpg'})}} className="text-sm text-blue-500 flex items-center gap-1"><Plus size={14}/> New</button>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Name (EN)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.name} onChange={e=>setProdForm({...prodForm, name: e.target.value})} />
                <input required placeholder="Name (TA)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.nameTa} onChange={e=>setProdForm({...prodForm, nameTa: e.target.value})} />
              </div>

              <select required className="w-full px-3 py-2 border border-sand rounded-xl text-sm bg-white" value={prodForm.category} onChange={e=>setProdForm({...prodForm, category: e.target.value})}>
                <option value="" disabled>Select Category</option>
                {cats.map(c => <option key={c.id} value={c.name_en}>{c.name_en} ({c.name_ta})</option>)}
              </select>

              <div>
                <p className="text-xs font-bold text-textMuted mb-2">Health Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <label key={t.id} className="flex items-center gap-1 text-xs bg-bgMain px-2 py-1 rounded cursor-pointer border border-sand">
                      <input type="checkbox" checked={prodForm.remedy.includes(t.name_en)} onChange={() => toggleRemedy(t.name_en)} className="accent-sageDark" />
                      {t.name_en}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input required placeholder="MRP (₹)" type="number" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.price || ''} onChange={e=>setProdForm({...prodForm, price: Number(e.target.value)})} />
                <input placeholder="Offer (₹) opt" type="number" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.offerPrice} onChange={e=>setProdForm({...prodForm, offerPrice: e.target.value})} />
                <input required placeholder="Stock" type="number" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.stock || 0} onChange={e=>setProdForm({...prodForm, stock: Number(e.target.value)})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <textarea placeholder="Desc (EN)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" rows={2} value={prodForm.description} onChange={e=>setProdForm({...prodForm, description: e.target.value})} />
                <textarea placeholder="Desc (TA)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" rows={2} value={prodForm.descriptionTa} onChange={e=>setProdForm({...prodForm, descriptionTa: e.target.value})} />
                <textarea placeholder="Benefits (EN)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" rows={2} value={prodForm.benefits} onChange={e=>setProdForm({...prodForm, benefits: e.target.value})} />
                <textarea placeholder="Benefits (TA)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" rows={2} value={prodForm.benefitsTa} onChange={e=>setProdForm({...prodForm, benefitsTa: e.target.value})} />
              </div>

              <input placeholder="Image URL (Base64 or Link)" className="w-full px-3 py-2 border border-sand rounded-xl text-sm" value={prodForm.image} onChange={e=>setProdForm({...prodForm, image: e.target.value})} />

              <button disabled={loading} className="w-full py-3 bg-sageDark hover:bg-sageDeep text-white font-bold rounded-xl">{loading ? 'Saving...' : editingProd ? 'Update Product' : 'Create Product'}</button>
            </form>

            <div className="bg-white p-6 rounded-2xl border border-sand/50 shadow-soft">
              <h2 className="font-bold text-lg mb-4">All Products ({products.length})</h2>
              <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
                {products.map(p => (
                  <div key={p.id} className="flex gap-4 p-3 border border-sand/50 rounded-xl bg-bgMain items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <img src={p.image} className="w-12 h-12 rounded object-cover" />
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-textMuted">{p.category} | ₹{p.offerPrice || p.price}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditProd(p)} className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteProd(p.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
