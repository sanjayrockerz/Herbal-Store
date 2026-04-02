import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { useLangStore } from '../store/langStore'
import { useProductStore } from '../store/store'

const REMEDIES = ['Cold & Cough', 'Digestion', 'Hair Growth', 'Immunity', 'Skin Care', 'Stress', 'Fever']

export default function Products() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [activeCats, setActiveCats] = useState<string[]>(params.get('cat') ? [params.get('cat')!] : [])
  const [activeRem, setActiveRem] = useState<string[]>(params.get('remedy') ? [params.get('remedy')!] : [])
  const [sort, setSort] = useState(params.get('sort') || 'default')
  const [showFilters, setShowFilters] = useState(false)
  const { t } = useLangStore()
  const { products, fetchProducts } = useProductStore()
  const CATEGORIES = [...new Set(products.map(p => p.category))]

  useEffect(() => {
    if (!products.length) {
      fetchProducts()
    }
  }, [products.length, fetchProducts])

  useEffect(() => {
    setSearch(params.get('search') || '')
    setActiveCats(params.get('cat') ? [params.get('cat')!] : [])
    setActiveRem(params.get('remedy') ? [params.get('remedy')!] : [])
  }, [params.toString()])

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const clear = () => { setSearch(''); setActiveCats([]); setActiveRem([]); setSort('default') }

  const filtered = useMemo(() => {
    let out = [...products]
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.benefits.toLowerCase().includes(q) ||
        (p.nameTa && p.nameTa.includes(q)) ||
        (p.benefitsTa && p.benefitsTa.includes(q))
      )
    }
    if (activeCats.length) out = out.filter(p => activeCats.includes(p.category))
    if (activeRem.length) out = out.filter(p => p.remedy.some(r => activeRem.includes(r)))
    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') out.sort((a, b) => b.price - a.price)
    else if (sort === 'rating') out.sort((a, b) => b.rating - a.rating)
    return out
  }, [search, activeCats, activeRem, sort])

  const hasFilters = search || activeCats.length || activeRem.length

  const FilterBlock = () => (
    <>
      <div className="mb-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3">Category</h4>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map(c => (
            <label key={c} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={activeCats.includes(c)} onChange={() => toggle(activeCats, setActiveCats, c)}
                className="rounded border-sand accent-sageDark" />
              <span className={`text-sm ${activeCats.includes(c) ? 'text-sageDark font-bold' : 'text-textMuted group-hover:text-textMain'}`}>{t('cat.' + c)}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3">Health Concern</h4>
        <div className="flex flex-col gap-2">
          {REMEDIES.map(r => (
            <label key={r} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={activeRem.includes(r)} onChange={() => toggle(activeRem, setActiveRem, r)}
                className="rounded border-sand accent-sageDark" />
              <span className={`text-sm ${activeRem.includes(r) ? 'text-sageDark font-bold' : 'text-textMuted group-hover:text-textMain'}`}>{t('remedy.' + r)}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="bg-bgMain min-h-screen">
      <div className="bg-gradient-to-r from-[#eaf2e5] to-bgMain border-b border-sand/50 py-9">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-textMain">{t('products.title')}</h1>
          <p className="text-textMuted mt-1 text-sm">{t('products.sub')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft sticky top-[110px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-sand/50">
              <h3 className="font-bold text-textMain font-headline">{t('products.filters')}</h3>
              {hasFilters && <button onClick={clear} className="text-xs text-sageDark font-bold hover:underline">{t('products.clear')}</button>}
            </div>
            <FilterBlock />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-grow">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder={t('nav.search_placeholder')}
                className="w-full h-11 pl-9 pr-4 rounded-xl border-2 border-sand focus:border-sage outline-none text-sm bg-white transition-colors" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="h-11 px-3 rounded-xl border-2 border-sand focus:border-sage outline-none text-sm bg-white font-medium text-textMain">
              <option value="default">{t('products.sort.default')}</option>
              <option value="price-asc">{t('products.sort.price_low')}</option>
              <option value="price-desc">{t('products.sort.price_high')}</option>
              <option value="rating">{t('products.sort.rating')}</option>
            </select>
            <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden h-11 px-4 bg-white border-2 border-sand rounded-xl text-sm font-bold flex items-center gap-2 text-textMain">
              <SlidersHorizontal size={15} /> {t('products.filters')}
            </button>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {search && <span className="flex items-center gap-1 bg-sage/30 text-textMain px-3 py-1 rounded-full text-xs font-bold">"{search}" <button onClick={() => setSearch('')}><X size={12} /></button></span>}
              {activeCats.map(c => <span key={c} className="flex items-center gap-1 bg-sage/30 text-textMain px-3 py-1 rounded-full text-xs font-bold">{t('cat.' + c)} <button onClick={() => toggle(activeCats, setActiveCats, c)}><X size={12} /></button></span>)}
              {activeRem.map(r => <span key={r} className="flex items-center gap-1 bg-sand/60 text-textMain px-3 py-1 rounded-full text-xs font-bold">{t('remedy.' + r)} <button onClick={() => toggle(activeRem, setActiveRem, r)}><X size={12} /></button></span>)}
              <button onClick={clear} className="text-xs text-red-400 font-bold hover:underline px-1">{t('products.clear')}</button>
            </div>
          )}

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden mb-5">
                <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft grid grid-cols-2 gap-6">
                  <FilterBlock />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm text-textMuted mb-4 font-medium">{filtered.length} {t('products.found')}</p>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🌿</p>
              <p className="font-bold text-textMain text-lg">{t('products.none')}</p>
              <button onClick={clear} className="mt-3 text-sageDark font-bold hover:underline text-sm">{t('products.clear_filters')}</button>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map(p => <ProductCard key={p.id} product={p} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
