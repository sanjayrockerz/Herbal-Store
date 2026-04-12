import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, ArrowRight, LogIn } from 'lucide-react'
import { useCartStore, useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function FloatingCart() {
  const { total, count } = useCartStore()
  const { user } = useAuthStore()
  const { t } = useLangStore()
  const location = useLocation()
  
  const isCartOrCheckout = location.pathname === '/cart' || location.pathname === '/checkout'
  const subtotal = total()
  const itemCount = count()

  return (
    <AnimatePresence>
      {itemCount > 0 && !isCartOrCheckout && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center"
        >
          <div className="pointer-events-auto bg-[#232f3e] text-white px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(35,47,62,0.4)] flex items-center gap-10 border border-white/10 backdrop-blur-xl bg-opacity-95 transform transition-all hover:scale-105 active:scale-95 ring-4 ring-white/5">
            <Link 
              to="/cart"
              className="flex items-center gap-4 border-r border-white/10 pr-8 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center animate-pulse-slow">
                  <ShoppingCart size={22} className="text-white" />
                </div>
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform scale-110">
                  {itemCount}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5 leading-none">{t('cart.total')}</p>
                <p className="text-xl font-black tracking-tight leading-none">₹{subtotal}</p>
              </div>
            </Link>
            
            <Link 
              to={user ? "/checkout" : "/login"}
              className="group flex items-center gap-3 font-black text-xs tracking-[0.15em] uppercase hover:text-green-400 transition-all"
            >
              {!user && <LogIn size={16} className="opacity-70 group-hover:rotate-12 transition-transform" />}
              <span className="whitespace-nowrap">{user ? t('cart.checkout_small') : t('nav.login')}</span>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
