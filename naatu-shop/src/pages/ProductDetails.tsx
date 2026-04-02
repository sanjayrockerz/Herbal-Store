import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useCartStore, type Product } from '../store/store'

export default function ProductDetails() {
  const { id } = useParams()
  const add = useCartStore((state) => state.add)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      try {
        const data = await api.getProductById(Number(id))
        setProduct({
          id: data.id,
          name: data.name,
          category: data.category,
          remedy: [],
          price: data.price,
          unit: '100g',
          rating: 4.7,
          stock: data.stock,
          description: data.description,
          benefits: data.benefits,
          image: data.imageUrl || data.image_url || '/assets/images/default-herb.jpg',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="p-10">Loading...</div>
  if (error || !product) return <div className="p-10 text-red-500">{error || 'Product not found'}</div>

  return (
    <div className="bg-bgMain min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-2xl overflow-hidden border border-sand/50 bg-white">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-textMain">{product.name}</h1>
          <p className="text-sageDark font-bold mt-2">₹{product.price}</p>
          <p className="text-textMuted mt-4">{product.description}</p>
          <p className="text-textMain mt-4 font-medium">{product.benefits}</p>
          <button
            onClick={() => add(product)}
            className="mt-6 bg-sageDark hover:bg-sageDeep text-white font-bold px-5 py-3 rounded-xl"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
