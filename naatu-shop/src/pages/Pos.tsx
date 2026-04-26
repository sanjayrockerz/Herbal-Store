import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Receipt, Search, Trash2 } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useProductStore, type Product } from '../store/store'
import { BRAND_EN, BRAND_TA, BRAND_SUBTITLE, BRAND_WHATSAPP } from '../lib/brand'
import { createOrderWithStock } from '../services/orderService'
import {
  buildStructuredOrderItem,
  calculateLineTotal,
  formatCurrency,
  formatPricePerUnit,
  formatQuantityDisplay,
  getDefaultQuantityForProduct,
  normalizeSelectedQuantity,
} from '../lib/retail'

type PosItem = Product & {
  qty: number
  selectedUnit: string
  basePrice: number
  lineTotal: number
}

type InvoiceSnapshot = {
  id: string
  invoiceNo: string
  date: string
  items: PosItem[]
  subtotal: number
  shipping: number
  total: number
}

const toNumericProductId = (value: string | number): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const fallbackQty = (product: Product) => {
  const defaultQty = getDefaultQuantityForProduct({
    unitType: product.unitType,
    baseQuantity: product.baseQuantity,
    predefinedOptions: product.predefinedOptions,
  })

  return normalizeSelectedQuantity(
    defaultQty,
    product.unitType,
    product.allowDecimalQuantity,
    product.unitType === 'unit' || product.unitType === 'bundle' ? 1 : Math.max(product.baseQuantity, 0.001),
  )
}

const clampQtyToStock = (product: Product, qty: number) => {
  if (product.unitType === 'unit' || product.unitType === 'bundle') {
    return Math.max(1, Math.round(qty))
  }

  return Number(Math.max(0.001, qty).toFixed(3))
}

const makePosItem = (product: Product, requestedQty?: number): PosItem | null => {
  const basePrice = product.offerPrice || product.price
  const normalized = normalizeSelectedQuantity(
    requestedQty ?? fallbackQty(product),
    product.unitType,
    product.allowDecimalQuantity,
    fallbackQty(product),
  )
  const qty = clampQtyToStock(product, normalized)

  if (qty <= 0) return null

  return {
    ...product,
    qty,
    selectedUnit: product.unitLabel,
    basePrice,
    lineTotal: calculateLineTotal(qty, product.unitType, product.baseQuantity, basePrice),
  }
}

const recalcPosItem = (item: PosItem, nextQty: number): PosItem | null => {
  const normalized = normalizeSelectedQuantity(
    nextQty,
    item.unitType,
    item.allowDecimalQuantity,
    fallbackQty(item),
  )
  const qty = clampQtyToStock(item, normalized)

  if (qty <= 0) return null

  return {
    ...item,
    qty,
    lineTotal: calculateLineTotal(qty, item.unitType, item.baseQuantity, item.basePrice),
  }
}

export default function Pos() {
  const { products, fetchProducts, error: productError } = useProductStore()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<PosItem[]>([])
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [invoice, setInvoice] = useState<InvoiceSnapshot | null>(null)

  useEffect(() => {
    void fetchProducts()

    if (!isSupabaseConfigured) {
      return
    }

    const channel = supabase
      .channel('pos-products-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        void fetchProducts()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const source = products.filter((product) => product.isActive)
    if (!q) return source.slice(0, 80)

    return source
      .filter((product) =>
        product.name.toLowerCase().includes(q)
        || (product.nameTa || '').toLowerCase().includes(q)
        || product.category.toLowerCase().includes(q)
        || (product.remedy || []).some((tag) => tag.toLowerCase().includes(q)),
      )
      .slice(0, 80)
  }, [products, search])

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const shipping = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 50
  const total = subtotal + shipping

  const addItem = (product: Product) => {
    setError('')

    setItems((current) => {
      const existing = current.find((item) => item.id === product.id)

      if (!existing) {
        const next = makePosItem(product)
        if (!next) return current
        return [...current, next]
      }

      const increment = existing.unitType === 'unit' || existing.unitType === 'bundle'
        ? 1
        : existing.baseQuantity

      const next = recalcPosItem(existing, existing.qty + increment)
      if (!next) return current

      return current.map((item) => (item.id === product.id ? next : item))
    })
  }

  const updateQty = (productId: string | number, nextQty: number) => {
    setError('')
    setItems((current) => {
      const existing = current.find((item) => item.id === productId)
      if (!existing) return current

      const next = recalcPosItem(existing, nextQty)
      if (!next) {
        return current.filter((item) => item.id !== productId)
      }

      return current.map((item) => (item.id === productId ? next : item))
    })
  }

  const setQuickOption = (productId: string | number, optionQty: number) => {
    updateQty(productId, optionQty)
  }

  const removeItem = (productId: string | number) => {
    setItems((current) => current.filter((item) => item.id !== productId))
  }

  const createInvoice = async () => {
    if (!items.length) {
      setError('Add products to generate invoice.')
      return
    }

    setSaving(true)
    setError('')

    const orderItems = items.map((item) => buildStructuredOrderItem({
      productId: toNumericProductId(item.id),
      name: item.name,
      tamilName: item.tamilName || item.nameTa || null,
      quantity: item.qty,
      unit: item.selectedUnit,
      unitType: item.unitType,
      baseQuantity: item.baseQuantity,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl || item.image || null,
    }))

    try {
      const created = await createOrderWithStock({
        customerName: customer.name.trim() || 'Walk-in Customer',
        phone: customer.phone.trim() || '0000000000',
        address: customer.address.trim() || 'POS Counter',
        items: orderItems,
        shipping,
        status: 'pending',
      })

      setInvoice({
        id: created.orderId,
        invoiceNo: created.invoiceNo,
        date: created.createdAt,
        items,
        subtotal,
        shipping,
        total,
      })
      setItems([])
      setCustomer({ name: '', phone: '', address: '' })
      void fetchProducts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const printBill = () => {
    window.print()
  }

  return (
    <div className="bg-bgMain min-h-screen py-6 print:bg-white print:py-0 print:min-h-0">
      <div className="max-w-7xl mx-auto px-4 space-y-5 print:p-0 print:m-0 print:space-y-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline text-textMain">{BRAND_EN}</h1>
            <p className="text-sm text-textMuted">{BRAND_TA} · {BRAND_SUBTITLE} · POS Billing</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {isSupabaseConfigured ? 'Supabase Connected' : 'Fallback Mode (Local)'}
              </span>
            </div>
          </div>
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white border border-sand text-textMain font-bold text-sm">
            Back to Dashboard
          </Link>
        </div>

        {(error || (productError && products.length === 0)) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm print:hidden">
            {error || productError}
          </div>
        )}

        {products.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
            No products available. Please add products from admin dashboard.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 print:hidden">
          <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                className="w-full pl-10 pr-3 py-2.5 border border-sand rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2 max-h-[64vh] overflow-auto pr-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product)}
                  className="p-3 rounded-xl border border-sand/50 bg-bgMain flex items-center justify-between gap-3 text-left w-full hover:border-sageDark/40"
                >
                  <div>
                    <p className="text-sm font-bold text-textMain">{product.name}</p>
                    {(product.tamilName || product.nameTa) && (
                      <p className="text-xs text-textMuted">{product.tamilName || product.nameTa}</p>
                    )}
                    <p className="text-xs text-textMuted">
                      {product.category}
                    </p>
                    <p className="text-xs font-bold text-sageDark">
                      {formatPricePerUnit(product.offerPrice || product.price, product.baseQuantity, product.unitLabel, product.unitType)}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-sageDark text-white text-xs font-bold">
                    Add
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-sand/50 shadow-soft">
            <h2 className="font-bold text-textMain mb-3">Current Bill</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer name" className="px-3 py-2 border border-sand rounded-xl text-sm" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })} placeholder="Phone" className="px-3 py-2 border border-sand rounded-xl text-sm" />
              <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Address" className="sm:col-span-2 px-3 py-2 border border-sand rounded-xl text-sm" />
            </div>

            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {items.length === 0 && <p className="text-sm text-textMuted">No items added.</p>}
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-sand/50 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-textMain">{item.name}</p>
                      {(item.tamilName || item.nameTa) && (
                        <p className="text-xs text-textMuted">{item.tamilName || item.nameTa}</p>
                      )}
                      <p className="text-xs text-textMuted">
                        {formatPricePerUnit(item.basePrice, item.baseQuantity, item.unitLabel, item.unitType)}
                      </p>
                      <p className="text-xs font-bold text-sageDark">
                        {formatQuantityDisplay(item.qty, item.selectedUnit, item.unitType)} · {formatCurrency(item.lineTotal)}
                      </p>
                    </div>

                    <button onClick={() => removeItem(item.id)} className="text-red-500 mt-1"><Trash2 size={15} /></button>
                  </div>

                  {(item.unitType === 'unit' || item.unitType === 'bundle') ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-full border border-sand">-</button>
                      <span className="w-12 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-full border border-sand">+</button>
                    </div>
                  ) : (
                    <>
                      {item.predefinedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.predefinedOptions.map((option) => (
                            <button
                              key={`${item.id}-${option.quantity}`}
                              type="button"
                              onClick={() => setQuickOption(item.id, option.quantity)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${Math.abs(item.qty - option.quantity) < 0.0001 ? 'bg-sageDark text-white border-sageDark' : 'bg-white text-textMain border-sand'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={item.allowDecimalQuantity ? '0.001' : '1'}
                          step={item.allowDecimalQuantity ? '0.001' : '1'}
                          value={item.qty}
                          onChange={(e) => updateQty(item.id, Number(e.target.value || 0))}
                          className="w-28 px-2 py-1.5 border border-sand rounded-lg text-sm"
                        />
                        <span className="text-xs text-textMuted font-bold uppercase">{item.selectedUnit}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-sand/50 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-textMuted">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-textMuted">Shipping</span><span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <button
              onClick={createInvoice}
              disabled={saving}
              className="mt-4 w-full py-3 rounded-xl bg-sageDark text-white font-bold hover:bg-sageDeep disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Receipt size={18} /> {saving ? 'Saving...' : 'Generate Bill'}
            </button>
          </div>
        </div>

        {invoice && (
          <div className="print-receipt mx-auto max-w-[430px] bg-white rounded-2xl border border-sand/50 shadow-soft p-6">
            <div className="text-center border-b border-dashed border-sand pb-4 mb-4">
              <h2 className="text-xl font-bold font-headline text-textMain leading-tight">{BRAND_EN}</h2>
              <p className="text-sm font-semibold text-textMuted leading-tight">{BRAND_TA}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-sageDark font-bold mt-1">{BRAND_SUBTITLE}</p>
              <div className="mt-4 text-xs text-textMuted space-y-0.5">
                <p><span className="font-bold text-textMain">Date:</span> {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p><span className="font-bold text-textMain">Invoice No:</span> {invoice.invoiceNo}</p>
                <p><span className="font-bold text-textMain">Order ID:</span> {invoice.id}</p>
              </div>
            </div>

            <table className="w-full text-sm mb-4">
              <thead className="border-b border-sand text-left text-textMuted">
                <tr>
                  <th className="pb-2 pr-2">Product</th>
                  <th className="pb-2 text-center pr-2">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-dashed border-sand/60 last:border-b-0">
                    <td className="py-2 pr-2 font-medium text-textMain align-top">
                      {item.name}
                      <div className="text-[11px] text-textMuted">{formatPricePerUnit(item.basePrice, item.baseQuantity, item.unitLabel, item.unitType)}</div>
                    </td>
                    <td className="py-2 pr-2 text-center align-top">{formatQuantityDisplay(item.qty, item.selectedUnit, item.unitType)}</td>
                    <td className="py-2 text-right font-bold align-top">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-sand pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{invoice.shipping === 0 ? 'FREE' : formatCurrency(invoice.shipping)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total Amount</span><span>{formatCurrency(invoice.total)}</span></div>
            </div>

            <div className="mt-5 border-t border-dashed border-sand pt-4 text-center text-xs text-textMuted space-y-1">
              <p>Thank you for visiting</p>
              <p className="font-bold text-textMain">{BRAND_EN}</p>
              <p>Contact: WhatsApp {BRAND_WHATSAPP}</p>
            </div>

            <div className="mt-4 flex justify-end print:hidden">
              <button onClick={printBill} className="px-4 py-2 rounded-xl border border-sand font-bold text-sm flex items-center gap-2">
                <Printer size={16} /> Print Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
