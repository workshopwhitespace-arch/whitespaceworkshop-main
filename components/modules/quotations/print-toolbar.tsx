'use client'

import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'

/** On-screen only — hidden when printing, so it never lands in the PDF. */
export function PrintToolbar({ quotationId }: { quotationId: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E8E5DC] bg-white px-4 py-3 print:hidden">
      <Link
        href={`/dashboard/quotations/${quotationId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to quotation
      </Link>

      <div className="flex items-center gap-3">
        <p className="hidden text-xs text-[#8A8778] sm:block">
          In the print window, choose <strong>Save as PDF</strong>.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-[#C1502E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#A8431F]"
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </button>
      </div>
    </div>
  )
}
