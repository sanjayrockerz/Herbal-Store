import React, { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Leaf, 
  Award, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useProductStore } from '../store/store'
import { useLangStore } from '../store/langStore'
import ProductCard from '../components/ProductCard'

/**
 * SRI SIDDHA HERBAL STORE - HOME PAGE
 * Premium, Dynamic, and Fully Localized
 */

const C = {
  textMain:   '#2C392A',
  textMuted:  '#5F6D59',
  sageDark:   '#7DAA8F',
  sageDeep:   '#5e8c72',
  sage:       '#B2C7A5',
  sand:       '#EAD7B7',
  bgMain:     '#F7F6F2',
  forestDark: '#2C392A'
}

const REMEDY_MAP: Record<string, {emoji: string, bg: string, border: string}> = {
  'Cold & Cough':  { emoji: '🤧', bg: '#EFF6FF', border: '#93C5FD' },
  'Digestion':     { emoji: '🌿', bg: '#F0FDF4', border: '#86EFAC' },
  'Hair Growth':   { emoji: '💆', bg: '#FFFBEB', border: '#FCD34D' },
  'Immunity':      { emoji: '🛡️', bg: '#FFF7ED', border: '#FDBA74' },
  'Skin Care':     { emoji: '✨', bg: '#FFF1F2', border: '#FDA4AF' },
  'Stress':        { emoji: '🧘', bg: '#FAF5FF', border: '#C4B5FD' },
  'Fever':         { emoji: '🤒', bg: '#FEF2F2', border: '#FECACA' },
  'Joint Pain':    { emoji: '🦵', bg: '#F5F3FF', border: '#DDD6FE' },
  'Diabetes':      { emoji: '🩸', bg: '#F1F5F9', border: '#94A3B8' },
}

const CAT_ICONS: Record<string, string> = {
  'Pooja Items':      '🪔',
  'Spices & Powders': '🌶️',
  'Grains':           '🌾',
  'Liquids':          '🍶',
  'Clothing':         '👕',
  'Misc':             '📦',
  'Flowers':          '🌸',
  'Sweets & Edibles': '🍯',
  'Herbal Powder':    '🌿',
  'Herbal Oil':       '🧪',
}

export default function Home() {
  const { t } = useLangStore()
  const { products, fetchProducts } = useProductStore()

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  // Derive display data
  const topSelling = useMemo(() => 
    products.filter(p => p.isActive).sort((a,b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4), 
  [products])

  const featured = useMemo(() => 
    products.filter(p => p.isActive).slice(4, 12), 
  [products])

  const derivedCats = useMemo(() => {
    const names = Array.from(new Set(products.filter(p => p.isActive).map(p => p.category))).filter(Boolean)
    return names.map(name => ({ name, icon: CAT_ICONS[name] || '🌿' }))
  }, [products])

  const derivedRemedies = useMemo(() => {
    const raw = Array.from(new Set(products.filter(p => p.isActive).flatMap(p => p.remedy || []))).filter(Boolean)
    return raw.map(label => ({
      label,
      ...(REMEDY_MAP[label] || { emoji: '✨', bg: '#F3F4F6', border: '#E5E7EB' })
    }))
  }, [products])

  return (
    <div style={{ backgroundColor: C.bgMain, color: C.textMain, fontFamily: 'Inter, sans-serif' }}>
      
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative overflow-hidden flex items-center min-h-[85vh] py-12"
        style={{ background: 'linear-gradient(135deg, #e8f5e2 0%, #f7f6f2 50%, #fdf7ed 100%)' }}>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: C.sageDark }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: C.sand }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-white/70 border border-sage/30 shadow-sm backdrop-blur-md">
              <Sparkles size={14} className="text-sageDark" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight">
              {t('hero.title1')} <br />
              <span style={{ color: C.sageDark }}>{t('hero.title2')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-textMuted mb-10 max-w-lg leading-relaxed font-medium">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="px-8 py-4 bg-[#2C392A] text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                {t('common.shopNow') || 'Shop Now'} <ArrowRight size={18} />
              </Link>
              <a href="#concerns" className="px-8 py-4 bg-white/50 text-textMain font-black rounded-2xl border border-sand/50 hover:bg-white transition-colors">
                 {t('remedy.title')}
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative flex justify-center">
            <div className="relative w-full max-w-[500px] aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white/50 bg-[#2C392A]">
              <video 
                src="/Add_shoot_video_202604072031.mp4" 
                className="w-full h-full object-cover" 
                autoPlay 
                muted 
                loop 
                playsInline
                poster="/Gemini_Generated_Image_zb6vuxzb6vuxzb6v.png"
              />
              <div className="absolute inset-0 bg-forestDark/10 pointer-events-none" />
            </div>
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="absolute -right-4 top-1/4 bg-white p-4 rounded-2xl shadow-xl border border-sand/30 hidden md:block"
            >
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                     <Activity size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] uppercase font-black text-textMuted tracking-tighter">Wellness</p>
                     <p className="text-sm font-black text-textMain">Pure Extract</p>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST BADGES ═══ */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <ShieldCheck />, title: t('trust.organic'), sub: t('trust.organic_sub') },
            { icon: <Truck />, title: t('trust.shipping'), sub: t('trust.shipping_sub') },
            { icon: <Leaf />, title: t('trust.pure'), sub: t('trust.pure_sub') },
            { icon: <Award />, title: t('trust.gmp'), sub: t('trust.gmp_sub') },
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-sand/20 shadow-soft flex items-center gap-4 transition-transform hover:-translate-y-1">
              <div style={{ color: C.sageDark }}>{item.icon}</div>
              <div>
                <h4 className="font-black text-[13px] text-textMain">{item.title}</h4>
                <p className="text-[10px] text-textMuted font-medium">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ GENERAL CATEGORIES ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black tracking-tight">{t('cat.explore_title')}</h2>
            <p className="text-sm text-textMuted mt-2 font-medium">{t('cat.explore_sub')}</p>
          </div>
          <Link to="/products" className="text-sageDark font-black flex items-center gap-1 group text-sm">
            {t('cat.view_all')} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-6">
          {derivedCats.map((c, idx) => (
            <Link key={idx} to={`/products?cat=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-3 group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white shadow-soft flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-transform border border-sand/10">
                {c.icon}
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-textMain text-center leading-tight group-hover:text-sageDark transition-colors">
                 {t('cat.' + c.name) || c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ HEALTH CONCERNS ═══ */}
      <section id="concerns" className="bg-white/60 py-24 border-y border-sand/10 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-14">
            <span className="text-sageDark font-black text-[11px] tracking-[0.2em] uppercase">{t('remedy.badge') || 'Targeted Healing'}</span>
            <h2 className="text-4xl font-black mt-3 mb-4 tracking-tight">{t('remedy.title')}</h2>
            <p className="text-lg text-textMuted max-w-2xl mx-auto font-medium">{t('remedy.sub')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {derivedRemedies.map((r, idx) => (
              <Link key={idx} to={`/products?remedy=${encodeURIComponent(r.label)}`} 
                style={{ background: r.bg, borderColor: r.border }}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border-2 hover:scale-105 transition-transform shadow-sm group">
                <span className="text-2xl transition-transform group-hover:scale-125">{r.emoji}</span>
                <h3 className="font-bold text-[14px] text-textMain m-0">{t('remedy.' + r.label) || r.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TOP SELLING ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="flex justify-between items-end mb-12">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <TrendingUp size={22} />
               </div>
               <h2 className="text-3xl font-black tracking-tight">{t('top.title')}</h2>
            </div>
            <Link to="/products" className="text-sm font-black text-sageDark hover:underline">{t('cat.view_all')}</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {topSelling.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ═══ FEATURED BANNER ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative rounded-[3rem] overflow-hidden bg-forestDark text-white p-12 lg:p-24 shadow-2xl">
           <div className="absolute inset-0 opacity-15 pointer-events-none">
              <img src="https://images.unsplash.com/photo-1512103522279-9e54d799db91?auto=format&fit=crop&q=80&w=1200" alt="bg" className="w-full h-full object-cover" />
           </div>
           <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                 <div className="inline-block px-4 py-1 bg-white/10 rounded-full text-[10px] uppercase font-black tracking-widest mb-6 border border-white/20">
                    {t('banner.badge')}
                 </div>
                 <h2 className="text-4xl lg:text-7xl font-black mb-8 leading-tight">{t('banner.title')}</h2>
                 <p className="text-xl opacity-70 mb-12 max-w-md font-medium leading-relaxed">{t('banner.sub')}</p>
                 <Link to="/products" className="px-12 py-5 bg-white text-forestDark font-black rounded-2xl hover:scale-105 transition-transform inline-flex items-center gap-2 shadow-xl">
                    {t('banner.cta')} <ArrowRight size={20} />
                 </Link>
              </div>
           </div>
        </div>
      </section>

      {/* ═══ BOTTOM NAVIGATION ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-24 text-center">
         <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black mb-6">{t('more.title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
               {featured.slice(0, 4).map(p => (
                 <div key={p.id} className="opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                    <ProductCard product={p} />
                 </div>
               ))}
            </div>
            <Link to="/products" className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-sageDark text-white font-black shadow-xl hover:scale-105 transition-all">
               {t('more.cta')} <ArrowRight size={20} />
            </Link>
         </div>
      </section>

    </div>
  )
}
