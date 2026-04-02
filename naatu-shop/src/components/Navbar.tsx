import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, Search, Menu, X, Leaf } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore, useFavStore, useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { CartDrawer, FavoritesDrawer } from './Drawers'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const count = useCartStore(s => s.count())
  const favCount = useFavStore(s => s.items.length)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { t, lang, setLang } = useLangStore()
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) { navigate(`/products?search=${encodeURIComponent(query.trim())}`); setMobileOpen(false) }
  }

  return (
    <>
      <div className="bg-forestDark text-sage text-xs py-2 text-center font-medium tracking-wide flex items-center justify-center gap-4">
        <span>🌿 {t('nav.free_shipping')} &nbsp;·&nbsp; WhatsApp: 98765 43210</span>
        <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} className="bg-sageDark/20 hover:bg-sageDark/40 px-2 flex items-center gap-1 py-0.5 rounded text-white font-bold transition-colors">
          <span className={lang === 'en' ? 'opacity-100' : 'opacity-40'}>EN</span>
          <span>|</span>
          <span className={lang === 'ta' ? 'opacity-100' : 'opacity-40'}>தமிழ்</span>
        </button>
      </div>

      <header className="sticky top-0 z-40 glass border-b border-sand/50 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-9 h-9 bg-sage rounded-xl flex items-center justify-center group-hover:bg-sageDark transition-colors">
              <Leaf size={18} className="text-white" />
            </div>
            <div className="leading-none flex flex-col items-center">
              <p className="text-[15px] font-bold text-textMain tracking-tight font-headline">Sri Siddha</p>
              <p className="text-[9px] text-sageDark uppercase font-bold tracking-[0.15em]">Herbal Store</p>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-grow max-w-xl">
            <div className="relative w-full flex">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
              <input value={query} onChange={e => setQuery(e.target.value)} type="text"
                placeholder={t('nav.search_placeholder')}
                className="w-full h-11 pl-10 pr-4 rounded-l-xl border-2 border-sand focus:border-sage outline-none text-sm bg-white text-textMain placeholder-gray-400 transition-colors" />
              <button type="submit" className="h-11 px-5 bg-sageDark hover:bg-sageDeep text-white text-sm font-bold rounded-r-xl transition-colors">{t('nav.search')}</button>
            </div>
          </form>

          <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-textMuted">
            <Link to="/" className="hover:text-textMain transition-colors">{t('nav.home')}</Link>
            <Link to="/products" className="hover:text-textMain transition-colors">{t('nav.products')}</Link>
            <Link to="/cart" className="hover:text-textMain transition-colors">{t('nav.cart')}</Link>
            <Link to="/favorites" className="hover:text-textMain transition-colors">{t('nav.favorites')}</Link>
            {user?.role === 'admin' && <Link to="/admin" className="hover:text-textMain transition-colors">{t('nav.dashboard')}</Link>}
            {user ? (
              <button
                onClick={logout}
                className="hover:text-textMain transition-colors"
              >
                {t('nav.logout')}
              </button>
            ) : (
              <Link to="/login" className="hover:text-textMain transition-colors">{t('nav.login')}</Link>
            )}
          </div>

          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => useFavStore.getState().setOpen(true)} className="relative p-2 rounded-full hover:bg-sage/20 transition-colors">
              <Heart size={20} className="text-textMuted" />
              {favCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{favCount}</span>}
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => useCartStore.getState().setOpen(true)} className="relative p-2 rounded-full hover:bg-sage/20 transition-colors">
              <ShoppingCart size={20} className="text-textMuted" />
              {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-sageDark text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{count}</span>}
            </motion.button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-full hover:bg-sage/20 transition-colors ml-1">
              {mobileOpen ? <X size={20} className="text-textMain" /> : <Menu size={20} className="text-textMuted" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-sand/50 bg-white px-4 py-4 flex flex-col gap-3">
              <form onSubmit={handleSearch} className="flex">
                <input value={query} onChange={e => setQuery(e.target.value)} type="text" placeholder={t('nav.search_placeholder')}
                  className="flex-grow h-10 px-3 rounded-l-lg border-2 border-sand focus:border-sage outline-none text-sm" />
                <button type="submit" className="h-10 px-4 bg-sageDark text-white text-sm font-bold rounded-r-lg">{t('nav.search')}</button>
              </form>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [t('nav.home'), '/'], [t('nav.products'), '/products'],
                  [t('nav.cart'), '/cart'], [t('nav.favorites'), '/favorites'],
                  [user?.role === 'admin' ? t('nav.dashboard') : t('nav.login'), user?.role === 'admin' ? '/admin' : '/login']
                ].map(([label, href]) => (
                  <Link key={href} to={href} onClick={() => setMobileOpen(false)}
                    className="py-2.5 px-3 bg-bgMain rounded-lg text-sm font-semibold text-textMuted hover:text-textMain text-center transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer open={useCartStore(s => s.isOpen)} onClose={() => useCartStore.getState().setOpen(false)} />
      <FavoritesDrawer open={useFavStore(s => s.isOpen)} onClose={() => useFavStore.getState().setOpen(false)} />
    </>
  )
}
