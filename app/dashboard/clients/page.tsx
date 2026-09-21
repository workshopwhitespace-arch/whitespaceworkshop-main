import { auth } from '@/lib/auth'
import { listClients } from '@/lib/validations/clients'
import { ClientList } from '@/components/modules/clients/client-list'

export default async function ClientsPage() {
  const [session, clients] = await Promise.all([auth(), listClients()])

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Clients</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Every quotation, project and payment is filed under a client.
        </p>
      </div>

      <ClientList
        canDelete={session?.user?.role !== 'EMPLOYEE'}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          email: c.email,
          phone: c.phone,
          address: c.address,
          notes: c.notes,
          projectCount: c._count.projects,
          createdAt: c.createdAt,
        }))}
      />
    </div>
  )
}
