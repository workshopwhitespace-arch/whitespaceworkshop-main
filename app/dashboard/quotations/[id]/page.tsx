import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getQuotationDetail } from '@/lib/actions/quotations'
import { listClients } from '@/lib/validations/clients'
import { QuotationDetailView } from '@/components/modules/quotations/quotation-detail'

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quotation = await getQuotationDetail(id)

  if (!quotation) notFound()

  // Only needed for the accept form, which picks the project's client.
  const clients = quotation.status === 'SENT' ? await listClients() : []

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/quotations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quotations
      </Link>

      <QuotationDetailView
        quotation={quotation}
        clients={clients.map((c) => ({ id: c.id, name: c.name, companyName: c.companyName }))}
      />
    </div>
  )
}
