import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore, useFavStore, type Product } from '../store/store'
import { useLangStore } from '../store/langStore'

const C = {
  textMain:  '#2C392A',
  textMuted: '#5F6D59',
  sageDark:  '#7DAA8F',
  sageDeep:  '#5e8c72',
  sand:      '#EAD7B7',
  cardBg:    '#FFF8E7',
}

export default function ProductCard({ product }: { product: Product }) {
  const add = useCartStore(s => s.add)
  const { toggle, isFav } = useFavStore()
  const { t, lang } = useLangStore()
  const fav = isFav(product.id)

  const displayName = lang === 'ta' && product.nameTa ? product.nameTa : product.name
  const displayBenefits = lang === 'ta' && product.benefitsTa ? product.benefitsTa : product.benefits

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col relative group overflow-hidden"
      style={{
        background: C.cardBg, border: `1px solid rgba(234,215,183,0.7)`,
        borderRadius: 18, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', transition: 'box-shadow 0.25s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.05)')}
    >
      {product.stock <= 15 && (
        <div className="absolute top-3 left-3 z-10" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {product.stock === 0 ? t('card.out_of_stock') : t('card.low_stock')}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.82 }} onClick={() => toggle(product)}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
        <Heart size={15} style={{ fill: fav ? '#F43F5E' : 'none', stroke: fav ? '#F43F5E' : '#9CA3AF' }} />
      </motion.button>

      <Link to={`/product/${product.id}`} className="w-full overflow-hidden block" style={{ aspectRatio: '1', background: '#fff' }}>
        <img src={product.image} alt={product.name} loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80' }}
          className="w-full h-full object-cover transition-transform duration-500" style={{ transform: 'scale(1)' }}
          onMouseEnter={e => ((e.target as HTMLImageElement).style.transform = 'scale(1.08)')}
          onMouseLeave={e => ((e.target as HTMLImageElement).style.transform = 'scale(1)')} />
      </Link>

      <div className="flex flex-col flex-grow gap-1.5" style={{ padding: '14px 16px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.sageDark }}>
          {t('cat.' + product.category)}
        </span>
        <h3 className="overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: C.textMain, lineHeight: 1.4, minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {displayName}
        </h3>
        <p className="overflow-hidden" style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {displayBenefits}
        </p>
        <div className="flex items-center gap-1">
          <Star size={11} style={{ fill: '#FBBF24', stroke: '#FBBF24' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563' }}>{product.rating}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {product.unit}</span>
        </div>

        <div className="flex items-center justify-between mt-auto" style={{ paddingTop: 12, borderTop: `1px solid rgba(234,215,183,0.7)` }}>
          <div className="flex flex-col">
            {product.offerPrice ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#9CA3AF', textDecoration: 'line-through', fontSize: 12 }}>₹{product.price}</span>
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    {Math.round(((product.price - product.offerPrice) / product.price) * 100)}% OFF
                  </span>
                </div>
                <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 18, color: '#16A34A' }}>₹{product.offerPrice}</span>
              </>
            ) : (
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 18, color: C.textMain }}>₹{product.price}</span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }} onClick={() => product.stock > 0 && add(product)} disabled={product.stock === 0}
            className="flex items-center gap-1.5 font-bold rounded-xl transition-colors"
            style={{
              background: product.stock === 0 ? '#E5E7EB' : C.sageDark, color: product.stock === 0 ? '#9CA3AF' : '#fff',
              fontSize: 12, padding: '8px 14px', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'Inter, sans-serif',
            }}>
            <ShoppingCart size={13} /> {product.stock === 0 ? t('card.sold_out') : t('card.add')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
