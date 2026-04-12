import React from 'react'
import { BRAND_EN, BRAND_TA, BRAND_SUBTITLE, BRAND_WHATSAPP } from '../lib/brand'

export interface InvoiceItem {
  id?: number | string
  name: string
  nameTa?: string | null
  qty: number
  price: number
  offerPrice?: number | null
}

export interface InvoiceProps {
  invoiceNo: string
  date: string
  customerName: string
  phone: string
  address: string
  items: InvoiceItem[]
  subtotal: number
  shipping: number
  total: number
  status?: string
  userId?: string
}

export const Invoice: React.FC<InvoiceProps> = ({
  invoiceNo,
  date,
  customerName,
  phone,
  address,
  items,
  subtotal,
  shipping,
  total,
  status = 'Pending',
  userId,
}) => {
  const dateStr = (() => {
    try { return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  })()

  const statusColor = status === 'completed' ? '#16a34a' : status === 'cancelled' ? '#dc2626' : '#d97706'

  return (
    <div
      id="invoice-print-root"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#fff',
        color: '#1a1a2e',
        maxWidth: 680,
        margin: '0 auto',
        padding: '40px 48px',
        boxSizing: 'border-box',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '3px solid #2d5a27', paddingBottom: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#2d5a27', letterSpacing: -0.5, textTransform: 'uppercase' }}>
              {BRAND_EN}
            </div>
            <div style={{ fontSize: 14, color: '#4a7c59', fontWeight: 700, marginTop: 2 }}>{BRAND_TA}</div>
            <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
              {BRAND_SUBTITLE}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', letterSpacing: -1 }}>INVOICE</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2d5a27', marginTop: 4 }}>#{invoiceNo}</div>
            <div
              style={{
                display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 99,
                background: statusColor + '18', color: statusColor,
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {status}
            </div>
          </div>
        </div>
      </div>

      {/* ── META ROW ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Invoice Date</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{dateStr}</div>
          {userId && (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 }}>User ID</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#555', wordBreak: 'break-all', maxWidth: 200 }}>{userId}</div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{customerName}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{phone}</div>
          <div style={{ fontSize: 11, color: '#777', marginTop: 4, maxWidth: 220, textAlign: 'right', lineHeight: 1.5 }}>{address}</div>
        </div>
      </div>

      {/* ── DIVIDER ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px dashed #d0d0d0', marginBottom: 24 }} />

      {/* ── ITEMS TABLE ───────────────────────────────────────────────── */}
      <div style={{ flexGrow: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f8f3', borderRadius: 8 }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.8, width: 32 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.8 }}>Product</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.8, width: 50 }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.8, width: 80 }}>Rate</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.8, width: 90 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const unitPrice = item.offerPrice || item.price
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px', fontSize: 12, color: '#999', verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{item.name}</div>
                    {item.nameTa && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.nameTa}</div>}
                    {item.offerPrice && item.price !== item.offerPrice && (
                      <div style={{ fontSize: 10, color: '#aaa', textDecoration: 'line-through', marginTop: 2 }}>MRP ₹{item.price}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, textAlign: 'center', verticalAlign: 'top' }}>{item.qty}</td>
                  <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, textAlign: 'right', verticalAlign: 'top', color: '#555' }}>₹{unitPrice}</td>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 800, textAlign: 'right', verticalAlign: 'top', color: '#1a1a2e' }}>₹{unitPrice * item.qty}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, borderTop: '2px solid #2d5a27', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 240 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Subtotal</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>₹{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Shipping</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: shipping === 0 ? '#16a34a' : '#1a1a2e' }}>
                {shipping === 0 ? 'FREE' : `₹${shipping}`}
              </span>
            </div>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '2px solid #2d5a27', paddingTop: 12,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900, color: '#2d5a27', textTransform: 'uppercase', letterSpacing: 0.5 }}>Grand Total</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#2d5a27' }}>₹{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 40, paddingTop: 20, borderTop: '1px dashed #d0d0d0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2d5a27' }}>Thank you for shopping!</div>
          <div style={{ fontSize: 12, color: '#4a7c59', marginTop: 2 }}>இங்கு வாங்கியதற்கு மிக்க நன்றி!</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>Contact: {BRAND_WHATSAPP}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#ccc', marginBottom: 6 }}>Authorised Signature</div>
          <div style={{ width: 120, borderTop: '1px solid #333' }} />
          <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontWeight: 700 }}>{BRAND_EN}</div>
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp text formatter ────────────────────────────────────────────
export const generateWhatsAppText = (data: InvoiceProps) => {
  const line = '━━━━━━━━━━━━━━━━━━━━━━'
  let itemsText = ''
  data.items.forEach((item, i) => {
    const price = item.offerPrice || item.price
    itemsText += `${i + 1}. *${item.name}*\n`
    itemsText += `   ${item.qty} × ₹${price} = *₹${item.qty * price}*\n`
  })

  return `🌿 *${BRAND_EN.toUpperCase()}*
${BRAND_SUBTITLE}

📌 *BILL DETAILS*
Invoice: #${data.invoiceNo}
Date: ${new Date(data.date).toLocaleDateString('en-GB')}
Status: ${data.status || 'Pending'}

👤 *CUSTOMER*
Name: ${data.customerName}
Phone: ${data.phone}
Addr: ${data.address}

${line}
*ITEMS ORDERED:*
${itemsText}
${line}

💰 *SUMMARY*
Subtotal: ₹${data.subtotal}
Shipping: ${data.shipping === 0 ? 'FREE' : `₹${data.shipping}`}
*GRAND TOTAL: ₹${data.total}*

${line}
🙏 _Thank you for choosing us!_
_இங்கு வாங்கியதற்கு நன்றி!_
WhatsApp: ${BRAND_WHATSAPP}`
}
