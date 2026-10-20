import type { DocumentStatus } from '@/lib/types'

export type Side =
  | { kind: 'paid'; docId: string; number: string; due: string | null }
  | { kind: 'none' }
  | {
      kind: 'open'
      docId: string
      number: string
      due: string | null
      amount: number
      status: DocumentStatus
    }

export type DocInfo = {
  number: string
  due: string | null
  status: DocumentStatus
  total: number
  balance: number
}

export type ItemInfo = { docId: string; amount: number }

const DAY = 86_400_000
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'America/New_York'

function todayStart(): number {
  // midnight today in the business timezone, so "overdue" flips at the right moment
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })
  return new Date(`${todayStr}T00:00:00Z`).getTime()
}

export function buildDocMaps(
  docs: { id: string; number: string; due_date: string | null; status: DocumentStatus }[],
  items: { doc_id: string; delivery_id: string; amount: number | string }[],
  payments: { doc_id: string; amount: number | string }[]
): { docById: Map<string, DocInfo>; itemByDelivery: Map<string, ItemInfo> } {
  const totalById = new Map<string, number>()
  const itemByDelivery = new Map<string, ItemInfo>()
  for (const item of items) {
    totalById.set(item.doc_id, (totalById.get(item.doc_id) ?? 0) + Number(item.amount))
    itemByDelivery.set(item.delivery_id, { docId: item.doc_id, amount: Number(item.amount) })
  }
  const paidById = new Map<string, number>()
  for (const p of payments) {
    paidById.set(p.doc_id, (paidById.get(p.doc_id) ?? 0) + Number(p.amount))
  }
  const docById = new Map<string, DocInfo>()
  for (const doc of docs) {
    const total = totalById.get(doc.id) ?? 0
    docById.set(doc.id, {
      number: doc.number,
      due: doc.due_date,
      status: doc.status,
      total,
      balance: Math.max(0, total - (paidById.get(doc.id) ?? 0)),
    })
  }
  return { docById, itemByDelivery }
}

export function sideFor(
  deliveryId: string,
  itemByDelivery: Map<string, ItemInfo>,
  docById: Map<string, DocInfo>
): Side {
  const item = itemByDelivery.get(deliveryId)
  if (!item) return { kind: 'none' }
  const doc = docById.get(item.docId)
  if (!doc) return { kind: 'none' }
  if (doc.balance <= 0.005 || doc.total <= 0) {
    return { kind: 'paid', docId: item.docId, number: doc.number, due: doc.due }
  }
  // this delivery's share of the document's remaining balance
  const amount = Math.round(doc.balance * (item.amount / doc.total) * 100) / 100
  return { kind: 'open', docId: item.docId, number: doc.number, due: doc.due, amount, status: doc.status }
}

/** Lower = more urgent. Overdue sorts before upcoming, then unbilled, then settled. */
export function urgency(side: Side): number {
  if (side.kind === 'open') {
    if (!side.due) return 5000
    return (new Date(`${side.due}T00:00:00Z`).getTime() - todayStart()) / DAY // negative = overdue
  }
  if (side.kind === 'none') return 9998
  return 9999
}

export function daysUntilDue(due: string): number {
  return Math.round((new Date(`${due}T00:00:00Z`).getTime() - todayStart()) / DAY)
}
