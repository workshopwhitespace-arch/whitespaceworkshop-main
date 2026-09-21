'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { seedTasksForProject } from '@/lib/actions/tasks'
import { logActivity } from '@/lib/actions/activity'
import {
  createQuotationSchema,
  updateQuotationSchema,
  addQuotationItemSchema,
  updateQuotationItemSchema,
  acceptQuotationSchema,
  type CreateQuotationInput,
  type UpdateQuotationInput,
  type AddQuotationItemInput,
  type UpdateQuotationItemInput,
  type AcceptQuotationInput,
} from '@/lib/validations/quotation'

async function generateQuotationNumber() {
  const year = new Date().getFullYear()
  const count = await db.quotation.count({
    where: { quotationNumber: { startsWith: `QT-${year}-` } },
  })
  const sequence = String(count + 1).padStart(3, '0')
  return `QT-${year}-${sequence}`
}

/**
 * The one place totals are worked out: the line amounts, less the flat ₹
 * discount. No tax is added — quotations carry no GST.
 */
function calculateTotals(items: { quantity: number; rate: number }[], discount = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.rate, 0)
  const totalAmount = Math.max(0, subtotal - discount)
  return { subtotal, totalAmount }
}

export async function createQuotation(input: CreateQuotationInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = createQuotationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { clientName, reference, terms, items } = parsed.data
  const { totalAmount } = calculateTotals(items)
  const quotationNumber = await generateQuotationNumber()

  const quotation = await db.quotation.create({
    data: {
      quotationNumber,
      clientName,
      reference,
      terms,
      totalAmount,
      createdById: session.user.id,
      items: {
        create: items.map((item) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
      },
    },
    include: { items: true },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

/**
 * Every item mutation recalculates the whole quotation from scratch — never
 * trust a client-sent total.
 */
async function recalculateQuotation(quotationId: string) {
  const [items, current] = await Promise.all([
    db.quotationItem.findMany({ where: { quotationId } }),
    db.quotation.findUniqueOrThrow({ where: { id: quotationId }, select: { discount: true } }),
  ])
  const { totalAmount } = calculateTotals(
    items.map((i) => ({ quantity: i.quantity, rate: Number(i.rate) })),
    Number(current.discount)
  )

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { totalAmount },
    include: { items: true },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

export async function addQuotationItem(input: AddQuotationItemInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = addQuotationItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { quotationId, description, quantity, rate } = parsed.data
  await db.quotationItem.create({
    data: { quotationId, description, quantity, rate, amount: quantity * rate },
  })

  return recalculateQuotation(quotationId)
}

export async function updateQuotationItem(input: UpdateQuotationItemInput) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = updateQuotationItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { itemId, ...data } = parsed.data
  const existing = await db.quotationItem.findUniqueOrThrow({ where: { id: itemId } })
  const quantity = data.quantity ?? existing.quantity
  const rate = data.rate ?? Number(existing.rate)

  await db.quotationItem.update({
    where: { id: itemId },
    data: { ...data, amount: quantity * rate },
  })

  return recalculateQuotation(existing.quotationId)
}

export async function removeQuotationItem(itemId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const item = await db.quotationItem.delete({ where: { id: itemId } })
  return recalculateQuotation(item.quotationId)
}

/**
 * Full edit from the edit screen: header fields, the edit-only discount and
 * date, and the complete item list (replaced wholesale). Accepted quotations
 * are locked — their project's value was already set from the total.
 */
export async function updateQuotation(input: UpdateQuotationInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = updateQuotationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { id, clientName, reference, terms, items, discount, quotationDate } = parsed.data

  const existing = await db.quotation.findUnique({ where: { id }, select: { status: true } })
  if (!existing) {
    return { success: false as const, error: 'That quotation no longer exists.' }
  }
  if (existing.status === 'ACCEPTED') {
    return {
      success: false as const,
      error: 'An accepted quotation can’t be edited — its project was created from this total.',
    }
  }

  const { subtotal, totalAmount } = calculateTotals(items, discount)
  if (discount > subtotal) {
    return { success: false as const, error: 'The discount can’t be more than the subtotal.' }
  }

  const quotation = await db.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id } })
    return tx.quotation.update({
      where: { id },
      data: {
        clientName,
        // An emptied field must clear the stored value, not leave it as-is.
        reference: reference ?? null,
        terms: terms ?? null,
        discount,
        quotationDate,
        totalAmount,
        items: {
          create: items.map((item) => ({
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
          })),
        },
      },
    })
  })

  await logActivity(session.user.id, 'edited quotation', 'quotation', id)

  revalidatePath('/dashboard/quotations')
  revalidatePath(`/dashboard/quotations/${id}`)
  return { success: true as const, quotation }
}

export async function sendQuotation(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { status: 'SENT' },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

export async function rejectQuotation(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const quotation = await db.quotation.update({
    where: { id: quotationId },
    data: { status: 'REJECTED' },
  })

  revalidatePath('/dashboard/quotations')
  return { success: true as const, quotation }
}

/**
 * The one action with a side effect on another table: accepting a
 * quotation marks it ACCEPTED and creates the Project it funds, with
 * projectValue set from the quotation total. A quotation only carries a
 * typed name, so the user picks the client (created by hand on the Clients
 * page) the project belongs to; the quotation is linked to that client too.
 * Optionally seeds that
 * project's tasks from its type's template when asked. Both the status
 * change and project creation happen in one transaction so a quotation can
 * never end up ACCEPTED without its project existing.
 */
export async function acceptQuotation(input: AcceptQuotationInput) {
  const session = await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const parsed = acceptQuotationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message }
  }

  const { quotationId, clientId, projectTitle, projectType, deadline, seedTasks } = parsed.data

  const quotation = await db.quotation.findUnique({ where: { id: quotationId } })
  if (!quotation) {
    return { success: false as const, error: 'Quotation not found' }
  }
  if (quotation.status === 'ACCEPTED') {
    return { success: false as const, error: 'This quotation was already accepted' }
  }
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } })
  if (!client) {
    return { success: false as const, error: 'That client no longer exists — refresh and choose again.' }
  }

  const project = await db.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED', clientId },
    })

    return tx.project.create({
      data: {
        clientId,
        quotationId: quotation.id,
        title: projectTitle,
        type: projectType,
        projectValue: quotation.totalAmount,
        deadline,
        createdById: session.user.id,
      },
    })
  })

  if (seedTasks) {
    await seedTasksForProject(project.id, project.type)
  }
  await logActivity(session.user.id, 'accepted quotation', 'quotation', quotation.id, {
    projectId: project.id,
  })

  revalidatePath('/dashboard/quotations')
  revalidatePath('/dashboard/projects')
  return { success: true as const, project }
}

export async function listQuotations(filters?: {
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
}) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  return db.quotation.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}
/** Full quotation for the detail, edit and print screens. */
export async function getQuotationDetail(quotationId: string) {
  await requireRole(['SUPER_ADMIN', 'ADMIN'])

  const quotation = await db.quotation.findUnique({
    where: { id: quotationId },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      items: { orderBy: { id: 'asc' }, include: { service: { select: { name: true } } } },
      createdBy: { select: { name: true } },
      projects: { select: { id: true, title: true, type: true, status: true } },
    },
  })

  if (!quotation) return null

  const subtotal = quotation.items.reduce(
    (sum, i) => sum + i.quantity * Number(i.rate),
    0
  )
  const discount = Number(quotation.discount)

  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
    reference: quotation.reference,
    terms: quotation.terms,
    quotationDate: quotation.quotationDate,
    createdAt: quotation.createdAt,
    createdByName: quotation.createdBy.name,
    clientName: quotation.clientName,
    /** The linked client — null until the quotation is accepted. */
    client: quotation.client,
    items: quotation.items.map((i) => ({
      id: i.id,
      serviceId: i.serviceId,
      serviceName: i.service?.name ?? null,
      description: i.description,
      quantity: i.quantity,
      rate: Number(i.rate),
      amount: Number(i.amount),
    })),
    subtotal,
    discount,
    totalAmount: Number(quotation.totalAmount),
    project: quotation.projects[0] ?? null,
  }
}

export type QuotationDetail = NonNullable<Awaited<ReturnType<typeof getQuotationDetail>>>
