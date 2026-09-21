import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Inter, Montserrat } from 'next/font/google'
import { getQuotationDetail } from '@/lib/actions/quotations'
import { STUDIO, STANDARD_QUOTATION_TERMS } from '@/lib/studio'
import { inrExact } from '@/lib/format'
import { PrintToolbar } from '@/components/modules/quotations/print-toolbar'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['600'] })

/**
 * Print-ready A4 quotation, laid out to match the studio's design (every
 * position is in mm on a 210 × 297 page). Lives outside /dashboard so it
 * renders without the app shell; proxy.ts still requires a login for it.
 *
 * Per the brief: the description column shows the service name, amounts are
 * the original line prices, and the total below is those less any discount.
 */

type Params = { params: Promise<{ id: string }> }

/** The browser uses the page title as the default PDF file name. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const quotation = await getQuotationDetail(id)
  if (!quotation) return { title: 'Quotation' }
  return { title: `${quotation.quotationNumber} - ${quotation.clientName}` }
}

/** DD-MM-YYYY in IST, as in the design. */
function formatPrintDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value
  return `${get('day')}-${get('month')}-${get('year')}`
}

/** The quotation's own terms, one per line, with any typed numbering removed. */
function customTerms(terms: string | null) {
  return (terms ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^\d+\s*[.)]\s*/, ''))
    .filter(Boolean)
}

const INK = '#141011'
const RULE = '#8C8C8C'

export default async function QuotationPrintPage({ params }: Params) {
  const { id } = await params
  const quotation = await getQuotationDetail(id)
  if (!quotation) notFound()

  const recipient = quotation.clientName.toUpperCase()
  const terms = [...STANDARD_QUOTATION_TERMS, ...customTerms(quotation.terms)]

  return (
    <div className="min-h-screen bg-[#E9E6DF] print:min-h-0 print:bg-transparent">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print { html, body { background: #FDF8F4 !important; } }
      `}</style>

      <PrintToolbar quotationId={quotation.id} />

      <div className="flex justify-center p-6 print:block print:p-0">
        <article
          className={`${inter.className} relative shrink-0 overflow-hidden shadow-lg print:shadow-none`}
          style={{
            width: '210mm',
            height: '297mm',
            background: '#FDF8F4',
            color: INK,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {/* Logo mark */}
          <svg
            aria-hidden="true"
            viewBox="0 0 56 10"
            style={{ position: 'absolute', left: '142.2mm', top: '27.2mm', width: '56mm', height: '10mm' }}
          >
            <polyline
              points="0.5,0.5 0.5,9.2 21.4,0.8 54.9,9.2 54.9,0.5"
              fill="none"
              stroke={INK}
              strokeWidth="0.9"
              strokeLinejoin="miter"
            />
          </svg>

          {/* Studio details */}
          <div style={{ position: 'absolute', right: '11.8mm', top: '46.2mm', textAlign: 'right' }}>
            <p style={{ fontSize: '11.8pt', fontWeight: 500 }}>{STUDIO.name}</p>
            <div style={{ marginTop: '0.2mm', fontSize: '9pt', lineHeight: '5.2mm' }}>
              <p>{STUDIO.phone}</p>
              <p>{STUDIO.email}</p>
              <p>{STUDIO.address}</p>
            </div>
          </div>

          {/* Title, recipient, date */}
          <div style={{ position: 'absolute', left: '11.8mm', top: '49.8mm' }}>
            <h1 style={{ fontSize: '18.5pt', fontWeight: 700, lineHeight: 1 }}>QUOTATION</h1>
            <p style={{ marginTop: '3.9mm', fontSize: '9.5pt', fontWeight: 600, lineHeight: '4mm' }}>
              FOR {recipient}
            </p>
            <p style={{ fontSize: '9.5pt', lineHeight: '4mm' }}>{formatPrintDate(quotation.quotationDate)}</p>
          </div>

          {/* Table header bar */}
          <div
            className={montserrat.className}
            style={{
              position: 'absolute',
              left: '8.4mm',
              top: '77.5mm',
              width: '193.2mm',
              height: '8.2mm',
              borderRadius: '1.8mm',
              background: INK,
              color: '#FFFFFF',
              fontSize: '9pt',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 7.3mm 0 4.1mm',
            }}
          >
            <span>DESCRIPTION</span>
            <span>AMOUNT</span>
          </div>

          {/* Column divider and the rule closing the table */}
          <div style={{ position: 'absolute', left: '172mm', top: '85.7mm', height: '139.3mm', borderLeft: `0.25mm solid ${RULE}` }} />
          <div style={{ position: 'absolute', left: '8.9mm', top: '225mm', width: '193.4mm', borderTop: `0.25mm solid ${RULE}` }} />

          {/* Line items — service name and original line price */}
          <ul style={{ position: 'absolute', left: 0, top: '89mm', width: '210mm', fontSize: '9.5pt' }}>
            {quotation.items.map((item) => (
              <li key={item.id} style={{ display: 'flex', alignItems: 'baseline', padding: '1.6mm 0' }}>
                <span style={{ flex: 'none', width: '172mm', paddingLeft: '12.5mm', paddingRight: '6mm' }}>
                  {item.serviceName ?? item.description}
                  {item.quantity > 1 && <span style={{ color: '#6B6858' }}> × {item.quantity}</span>}
                </span>
                <span style={{ flex: 'none', width: '22.3mm', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {inrExact(item.amount)}
                </span>
              </li>
            ))}
          </ul>

          {/* Total — line amounts less any discount */}
          <dl style={{ position: 'absolute', left: 0, top: '229mm', width: '210mm', fontSize: '9.5pt' }}>
            {quotation.discount > 0 && (
              <>
                <TotalRow label="SUBTOTAL" value={inrExact(quotation.subtotal)} />
                <TotalRow label="DISCOUNT" value={`−${inrExact(quotation.discount)}`} />
              </>
            )}
            <TotalRow label="TOTAL" value={inrExact(quotation.totalAmount)} strong />
          </dl>

          {/* Terms & conditions */}
          <div style={{ position: 'absolute', left: '8.2mm', top: '270.5mm', width: '193.3mm', borderTop: `0.25mm solid ${RULE}` }} />
          <div style={{ position: 'absolute', left: '12.7mm', right: '12mm', top: '273.4mm', fontSize: '7.5pt', lineHeight: '3.5mm' }}>
            <p>TERMS &amp; CONDITIONS</p>
            <ol style={{ listStyle: 'decimal', paddingLeft: '4mm', fontSize: '7pt' }}>
              {terms.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ol>
          </div>
        </article>
      </div>
    </div>
  )
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        padding: '1.2mm 0',
        fontWeight: strong ? 700 : 400,
        fontSize: strong ? '11pt' : undefined,
      }}
    >
      <dt style={{ flex: 'none', width: '168mm', textAlign: 'right' }}>{label}</dt>
      <dd style={{ flex: 'none', width: '26.3mm', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </dd>
    </div>
  )
}
