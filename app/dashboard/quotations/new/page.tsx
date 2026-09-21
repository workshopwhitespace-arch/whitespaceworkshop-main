import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listClients } from '@/lib/validations/clients'
import { listServices } from '@/lib/actions/services'
import { QuotationBuilder } from '@/components/modules/quotations/quotation-builder'

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const { clientId } = await searchParams
  const [clients, services] = await Promise.all([
    clientId ? listClients() : Promise.resolve([]),
    listServices({ activeOnly: true }),
  ])
  // Started from a client's page: prefill the name the way it would print.
  // Only honoured if that client is actually visible to this user.
  const fromClient = clients.find((c) => c.id === clientId)
  const defaultName = fromClient ? fromClient.companyName || fromClient.name : undefined

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/quotations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quotations
      </Link>

      <h1 className="text-xl font-semibold text-[#26251F]">New quotation</h1>
      <p className="mt-0.5 mb-5 text-sm text-[#8A8778]">
        Add line items — the subtotal and total are calculated as you type.
      </p>

      <QuotationBuilder
        defaultName={defaultName}
        services={services.map((s) => ({ id: s.id, name: s.name, description: s.description }))}
      />
    </div>
  )
}
