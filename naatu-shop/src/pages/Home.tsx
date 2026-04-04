import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Leaf, ShieldCheck, Truck, Award, Star, Sparkles } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { useLangStore } from '../store/langStore'
import { useProductStore } from '../store/store'

const REMEDIES = [
  { label: 'Cold & Cough', emoji: '🤧', bg: '#EFF6FF', border: '#93C5FD' },
  { label: 'Digestion',    emoji: '🌿', bg: '#F0FDF4', border: '#86EFAC' },
  { label: 'Hair Growth',  emoji: '💆', bg: '#FFFBEB', border: '#FCD34D' },
  { label: 'Immunity',     emoji: '🛡️', bg: '#FFF7ED', border: '#FDBA74' },
  { label: 'Skin Care',    emoji: '✨', bg: '#FFF1F2', border: '#FDA4AF' },
  { label: 'Stress',       emoji: '🧘', bg: '#FAF5FF', border: '#C4B5FD' },
]

const CATS = [
  { name: 'Herbal Powder', icon: '🌿' },
  { name: 'Herbal Oil',    icon: '🫙' },
  { name: 'Herbal Root',   icon: '🌱' },
  { name: 'Herbal Spice',  icon: '🌶️' },
  { name: 'Herbal Gel',    icon: '💧' },
  { name: 'Mineral Herb',  icon: '⛰️' },
]

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

// Inline style constants
const C = {
  textMain:   '#2C392A', textMuted:  '#5F6D59', sageDark:   '#7DAA8F',
  sageDeep:   '#5e8c72', sage:       '#B2C7A5', sand:       '#EAD7B7',
  cardBg:     '#FFF8E7', bgMain:     '#F7F6F2', forestDark: '#2C392A', forestMid:  '#3d5238',
}

export default function Home() {
  const { t, lang } = useLangStore()
  const { products, fetchProducts } = useProductStore()
  const topSelling = products.filter(p => p.rating >= 4.7).slice(0, 4)
  const featured = products.slice(8, 16)

  useEffect(() => {
    if (!products.length) {
      fetchProducts()
    }
  }, [products.length, fetchProducts])

  return (
    <div style={{ backgroundColor: C.bgMain, color: C.textMain, fontFamily: 'Inter, sans-serif' }}>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden flex items-center"
        style={{ minHeight: '90vh', background: 'linear-gradient(135deg, #e8f5e2 0%, #f7f6f2 50%, #fdf7ed 100%)' }}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(178,199,165,0.25)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(234,215,183,0.3)' }} />
          <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(199,211,164,0.2)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2C392A" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="flex flex-col gap-6 order-2 lg:order-1">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full w-fit"
              style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(178,199,165,0.5)', padding: '8px 16px', backdropFilter: 'blur(8px)' }}>
              <Sparkles size={13} style={{ color: C.sageDark }} />
              <span style={{ color: C.textMain, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {t('hero.badge')}
              </span>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} style={{ color: C.textMuted, fontSize: 17, lineHeight: 1.7, maxWidth: 480, margin: 0 }}>
              {t('hero.subtitle')}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex items-center gap-2 font-bold rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: C.sageDark, color: '#fff', padding: '14px 28px', boxShadow: '0 8px 20px rgba(125,170,143,0.35)' }}>
                {t('hero.cta_shop')} <ArrowRight size={16} />
              </Link>
              <a href="#concerns" className="inline-flex items-center gap-2 font-bold rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', border: `2px solid ${C.sage}`, color: C.textMain, padding: '14px 24px' }}>
                {t('hero.cta_browse')}
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap gap-8 pt-2">
              {[ ['40+', t('hero.stats.products')], ['1200+', t('hero.stats.customers')], ['100%', t('hero.stats.organic')] ].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 26, color: C.textMain }}>{val}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{lbl}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Image */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative order-1 lg:order-2 flex items-center justify-center">
            <div className="relative" style={{ width: 360, height: 360 }}>
              <div className="absolute inset-0 rounded-full animate-[spin_30s_linear_infinite]" style={{ border: '2px dashed rgba(178,199,165,0.5)' }} />
              <div className="absolute rounded-full" style={{ inset: 12, border: '1px solid rgba(178,199,165,0.25)' }} />

              <div className="absolute rounded-full overflow-hidden" style={{ inset: 20, border: '8px solid #fff', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
                <img src="/Gemini_Generated_Image_zb6vuxzb6vuxzb6v.png" alt="Fresh herbs and spices" className="w-full h-full object-cover" style={{ objectPosition: '90% center', transform: 'scale(1.2)' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(178,199,165,0.1), transparent)' }} />
              </div>

              {/* Badges */}
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} className="absolute flex items-center gap-2.5 rounded-2xl"
                style={{ left: -28, top: 50, background: '#fff', border: `1px solid ${C.sand}`, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                <img src="https://images.unsplash.com/photo-1615485365926-6b5b9c21be8c?w=80&q=85" className="w-11 h-11 rounded-xl object-cover" alt="Sukku" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&q=80' }} />
                <div><p style={{ fontSize: 11, fontWeight: 700, color: C.textMain, margin: 0 }}>Sukku Powder</p><p style={{ fontSize: 10, color: C.sageDark, fontWeight: 700, margin: 0 }}>₹80 · 100g</p></div>
              </motion.div>

              <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }} className="absolute flex items-center gap-2.5 rounded-2xl"
                style={{ right: -18, bottom: 60, background: '#fff', border: `1px solid ${C.sand}`, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                <img src="https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=80&q=85" className="w-11 h-11 rounded-xl object-cover" alt="Ashwagandha" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&q=80' }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.textMain, margin: 0 }}>Ashwagandha</p>
                  <div className="flex items-center gap-0.5"><Star size={9} className="fill-amber-400 stroke-amber-400" /><p style={{ fontSize: 10, color: C.sageDark, fontWeight: 700, margin: 0 }}>4.9 · ₹150</p></div>
                </div>
              </motion.div>

              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.5 }} className="absolute rounded-2xl"
                style={{ right: 24, top: -16, background: C.sageDark, color: '#fff', padding: '10px 16px', boxShadow: '0 8px 20px rgba(125,170,143,0.4)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{t('hero.free_shipping')}</p><p style={{ fontSize: 10, opacity: 0.85, margin: 0 }}>{t('hero.on_orders')}</p>
              </motion.div>

              <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', delay: 1.5 }} className="absolute flex items-center gap-2 rounded-2xl"
                style={{ left: 10, bottom: -10, background: '#fff', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', border: `1px solid ${C.sand}` }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div><p style={{ fontSize: 12, fontWeight: 700, color: C.textMain, margin: 0 }}>4.8 Rating</p><p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>1200+ Reviews</p></div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 70" fill="#F7F6F2" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,20 1440,40 L1440,70 L0,70 Z" />
        </svg>
      </section>

      {/* ═══ TRUST BADGES ═══════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <ShieldCheck size={20} color={C.sageDark} />, t: t('trust.organic'), s: t('trust.organic_sub') },
            { icon: <Truck size={20} color={C.sageDark} />, t: t('trust.shipping'), s: t('trust.shipping_sub') },
            { icon: <Leaf size={20} color={C.sageDark} />, t: t('trust.pure'), s: t('trust.pure_sub') },
            { icon: <Award size={20} color={C.sageDark} />, t: t('trust.gmp'), s: t('trust.gmp_sub') },
          ].map(({ icon, t: title, s }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl p-4" style={{ background: '#fff', border: `1px solid rgba(234,215,183,0.5)`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(178,199,165,0.2)' }}>{icon}</div>
              <div><p style={{ fontWeight: 700, fontSize: 13, color: C.textMain, margin: 0 }}>{title}</p><p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{s}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CATEGORIES ═════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex items-end justify-between mb-7">
          <div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: C.textMain, margin: 0 }}>{t('cat.title')}</h2>
            <p style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>{t('cat.sub')}</p>
          </div>
          <Link to="/products" className="flex items-center gap-1 hover:gap-2 transition-all font-bold text-sm" style={{ color: C.sageDark }}>
            {t('cat.view_all')} <ArrowRight size={15} />
          </Link>
        </motion.div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {CATS.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <Link to={`/products?cat=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-2.5 group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'linear-gradient(135deg, #eaf2e5, #d4e8d0)', border: '4px solid #fff', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>{c.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textMain, textAlign: 'center', lineHeight: 1.3 }}>
                  {t('cat.' + c.name)}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ TOP SELLING ════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex items-end justify-between mb-7">
          <div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: C.textMain, margin: 0 }}>{t('top.title')}</h2>
            <p style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>{t('top.sub')}</p>
          </div>
          <Link to="/products?sort=rating" className="flex items-center gap-1 hover:gap-2 transition-all font-bold text-sm" style={{ color: C.sageDark }}>
            {t('cat.view_all')} <ArrowRight size={15} />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {topSelling.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.09 }}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ REMEDY CONCERNS ════════════════════════════════════════════════ */}
      <section id="concerns" style={{ background: C.cardBg, paddingTop: 56, paddingBottom: 56, marginTop: 16 }}>
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10">
            <span style={{ color: C.sageDark, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t('remedy.badge')}</span>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: C.textMain, marginTop: 8, marginBottom: 8 }}>{t('remedy.title')}</h2>
            <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 480, margin: '0 auto' }}>{t('remedy.sub')}</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {REMEDIES.map((r, i) => (
              <motion.div key={r.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <Link to={`/products?remedy=${encodeURIComponent(r.label)}`}
                  className="flex flex-col items-center p-5 rounded-2xl text-center border-2 transition-all hover:-translate-y-1 group" style={{ background: r.bg, borderColor: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = r.border)} onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <span style={{ fontSize: 30, marginBottom: 8 }}>{r.emoji}</span>
                  <h3 style={{ fontWeight: 700, fontSize: 13, color: C.textMain, margin: 0 }}>{t('remedy.' + r.label)}</h3>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                    {products.filter(p => p.remedy.includes(r.label)).length} herbs
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED BANNER ════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-10 my-4">
        <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #2C392A, #3d5238)' }}>
          <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.12 }}><img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80" alt="" className="w-full h-full object-cover" /></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-14">
            <div className="flex-grow text-white">
              <span style={{ color: C.sage, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t('banner.badge')}</span>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#fff', margin: '8px 0 12px' }}>{t('banner.title')}</h2>
              <p style={{ color: '#D1D5DB', fontSize: 15, maxWidth: 420, marginBottom: 24 }}>{t('banner.sub')}</p>
              <Link to="/products" className="inline-flex items-center gap-2 font-bold rounded-xl transition-colors" style={{ background: C.sageDark, color: '#fff', padding: '12px 24px' }}>
                {t('banner.cta')} <ArrowRight size={15} />
              </Link>
            </div>
            <div className="shrink-0 grid grid-cols-3 gap-3">
              {products.filter(p => [9, 5, 11].includes(p.id)).map(p => (
                <div key={p.id} className="flex flex-col items-center gap-2">
                  <div className="rounded-xl overflow-hidden" style={{ width: 80, height: 80, border: '2px solid rgba(255,255,255,0.2)' }}>
                    <img src={p.image} alt={p.name} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80' }} className="w-full h-full object-cover" />
                  </div>
                  <p style={{ color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                    {lang === 'ta' && p.nameTa ? p.nameTa : p.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MORE PRODUCTS ═══════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex items-end justify-between mb-7">
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: C.textMain, margin: 0 }}>{t('more.title')}</h2>
          <Link to="/products" className="flex items-center gap-1 hover:gap-2 transition-all font-bold text-sm" style={{ color: C.sageDark }}>
            {t('cat.view_all')} <ArrowRight size={15} />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}><ProductCard product={p} /></motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/products" className="inline-flex items-center gap-2 font-bold rounded-xl transition-colors" style={{ background: '#2C392A', color: '#fff', padding: '14px 32px' }}>
            {t('more.cta')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
