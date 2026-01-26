import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

type InvoiceQrProps = {
  invoiceId: string | number
  size?: number
  className?: string
  showUrl?: boolean
}

/**
 * Builds the invoice URL. Uses `window.location.origin` when available,
 * otherwise falls back to `http://localhost:3000`.
 */
export function makeInvoiceUrl(invoiceId: string | number) {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3000'
  return `${origin.replace(/\/$/, '')}/invoice/${invoiceId}`
}

/**
 * QR component using qrcode.react library.
 * Generates a QR code that links to the invoice page.
 * Example use: <InvoiceQr invoiceId={22} size={200} showUrl />
 */
export const InvoiceQr: React.FC<InvoiceQrProps> = ({ invoiceId, size = 120, className = '', showUrl = false }) => {
  const url = makeInvoiceUrl(invoiceId)

  return (
    <div className={className}>
      <QRCodeSVG
        value={url}
        size={size}
        level="L"
        marginSize={2}
      />
      {showUrl && (
        <div style={{ wordBreak: 'break-all' }} className="text-xs text-gray-500 mt-2">
          {url}
        </div>
      )}
    </div>
  )
}

export default InvoiceQr
