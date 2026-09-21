import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getClientDetail } from '@/lib/validations/clients'
import { ClientDetailView } from '@/components/modules/clients/client-detail'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClientDetail(id)

  // getClientDetail also returns null when an Employee has no project under
  // this client, so a 404 is the right answer for both cases.
  if (!client) notFound()

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8A8778] transition hover:text-[#C1502E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <ClientDetailView
        client={{
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          notes: client.notes,
          createdAt: client.createdAt,
          canSeeMoney: client.canSeeMoney,
          projects: client.projects.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            status: p.status,
            deadline: p.deadline,
            projectValue: p.projectValue === null ? null : Number(p.projectValue),
          })),
        }}
      />
    </div>
  )
}
