import { auth } from '@/lib/auth'
import { listServices } from '@/lib/actions/services'
import { ServiceList } from '@/components/modules/services/service-list'

export default async function ServicesPage() {
  const session = await auth()
  const canManage = session?.user?.role !== 'EMPLOYEE'
  const services = await listServices()

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#26251F]">Services</h1>
        <p className="mt-0.5 text-sm text-[#8A8778]">
          Work you offer repeatedly — name it once here and reuse it on tasks and
          quotations instead of starting a new project each time.
        </p>
      </div>

      <ServiceList
        canManage={canManage}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          isActive: s.isActive,
          createdAt: s.createdAt,
          taskCount: s._count.tasks,
          quotationCount: s._count.quotationItems,
        }))}
      />
    </div>
  )
}
