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

/** Milestones applicable to a delivery's source — inventory sales have no supplier side. */
export function milestonesFor(delivery: Delivery) {
  if (delivery.source === 'inventory') {
    return MILESTONES.filter((m) =>
      ['order_placed_at', 'sub_confirmed_at', 'delivered_at', 'sub_invoiced_at', 'sub_paid_at'].includes(m.key)
    )
  }
  return MILESTONES
}

/** The furthest-completed milestone, or null if none are set. */
export function currentStage(delivery: Delivery): MilestoneKey | null {
  const milestones = milestonesFor(delivery)
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (delivery[milestones[i].key]) return milestones[i].key
  }
  return null
}

export function currentStageLabel(delivery: Delivery): string {
  const stage = currentStage(delivery)
  return stage ? milestoneLabel(stage) : 'Draft'
}
