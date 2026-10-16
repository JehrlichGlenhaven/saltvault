import type { Delivery } from '@/lib/types'

export const MILESTONES = [
  { key: 'order_placed_at', label: 'Order placed' },
  { key: 'supplier_confirmed_at', label: 'Supplier confirmed' },
  { key: 'sub_confirmed_at', label: 'Sub confirmed' },
  { key: 'delivered_at', label: 'Delivered' },
  { key: 'reconciled_at', label: 'Reconciled (actual tons)' },
  { key: 'sub_invoiced_at', label: 'Sub invoiced' },
  { key: 'sub_paid_at', label: 'Invoice paid by sub' },
  { key: 'supplier_invoiced_at', label: 'Supplier invoiced us' },
  { key: 'supplier_paid_at', label: 'Invoice paid by Glenhaven' },
] as const

export type MilestoneKey = (typeof MILESTONES)[number]['key']

export const MILESTONE_KEYS = MILESTONES.map((m) => m.key) as MilestoneKey[]

export function milestoneLabel(key: MilestoneKey): string {
  return MILESTONES.find((m) => m.key === key)?.label ?? key
}

/** The furthest-completed milestone, or null if none are set. */
export function currentStage(delivery: Delivery): MilestoneKey | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (delivery[MILESTONES[i].key]) return MILESTONES[i].key
  }
  return null
}

export function currentStageLabel(delivery: Delivery): string {
  const stage = currentStage(delivery)
  return stage ? milestoneLabel(stage) : 'Draft'
}
