import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore, useFavStore, type Product } from '../store/store'
import { useLangStore } from '../store/langStore'

export default function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add)
  const { toggle, isFav } = useFavStore()
  const { t, lang } = useLangStore()
  const fav = isFav(product.id)

  const displayName = lang === 'ta' && product.nameTa ? product.nameTa : product.name
  const displayBenefits = lang === 'ta' && product.benefitsTa ? product.benefitsTa : product.benefits
  const salePrice = product.offerPrice && product.offerPrice < product.price ? product.offerPrice : null
  const discount = salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-sand/60 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {product.stock <= 15 ? (
        <div className="absolute left-2 top-2 z-10 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          {product.stock === 0 ? t('card.out_of_stock') : t('card.low_stock')}
        </div>
      ) : null}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => void toggle(product)}
        className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border ${fav ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white/90'}`}
        type="button"
        aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
      >
        <Heart size={14} className={fav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
      </motion.button>

      <Link to={`/product/${product.id}`} className="block aspect-square w-full overflow-hidden bg-slate-50">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514996937319-344454492b37?w=600&q=80'
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-sageDark">
          {t('cat.' + product.category)}
        </span>
        <h3 className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-4 text-textMain">
          {displayName}
        </h3>
        <p className="line-clamp-2 min-h-8 text-[11px] leading-4 text-textMuted">
          {displayBenefits}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
          <span>· {product.unit}</span>
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-sand/60 pt-2">
          <div>
            {salePrice ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 line-through">Rs {product.price}</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{discount}% OFF</span>
                </div>
                <span className="text-base font-bold text-emerald-700">Rs {salePrice}</span>
              </div>
            ) : (
              <span className="text-base font-bold text-textMain">Rs {product.price}</span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => product.stock > 0 && add(product)}
            disabled={product.stock === 0}
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold ${product.stock === 0 ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-sageDark text-white hover:bg-[#5f8b73]'}`}
            type="button"
          >
            <span className="inline-flex items-center gap-1"><ShoppingCart size={12} /> {product.stock === 0 ? t('card.sold_out') : t('card.add')}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
