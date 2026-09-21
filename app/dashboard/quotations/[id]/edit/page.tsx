import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getQuotationDetail } from '@/lib/actions/quotations'
import { listServices } from '@/lib/actions/services'
import { QuotationBuilder } from '@/components/modules/quotations/quotation-builder'

/** YYYY-MM-DD in IST, for the date input. */
function toDateInput(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quotation = await getQuotationDetail(id)
  if (!quotation) notFound()

  // Accepted quotations are locked; updateQuotation refuses them too.
  if (quotation.status === 'ACCEPTED') redirect(`/dashboard/quotations/${id}`)

  const allServices = await listServices()

  // Active services, plus any retired one this quotation still uses — so
  // editing doesn't silently unlink a line from its service.
  const usedServiceIds = new Set(quotation.items.map((i) => i.serviceId).filter(Boolean))
  const services = allServices.filter((s) => s.isActive || usedServiceIds.has(s.id))

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/dashboard/quotations/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        {quotation.quotationNumber}
      </Link>

      <h1 className="text-xl font-semibold text-[#26251F]">Edit {quotation.quotationNumber}</h1>
      <p className="mt-0.5 mb-5 text-sm text-[#8A8778]">
        Change anything here, including the discount and the date printed on the PDF.
      </p>

      <QuotationBuilder
        services={services.map((s) => ({ id: s.id, name: s.name, description: s.description }))}
        initial={{
          id: quotation.id,
          clientName: quotation.clientName,
          reference: quotation.reference,
          terms: quotation.terms,
          discount: quotation.discount,
          quotationDate: toDateInput(quotation.quotationDate),
          items: quotation.items.map((i) => ({
            serviceId: i.serviceId,
            description: i.description,
            quantity: i.quantity,
            rate: i.rate,
          })),
        }}
      />
    </div>
  )
}
