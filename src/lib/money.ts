import type { Delivery } from '@/lib/types'

/** Billable tons: actual once reconciled, estimated before. */
export function deliveryTons(delivery: Delivery): number {
  return delivery.actual_tons ?? delivery.est_tons
}

export function isReconciled(delivery: Delivery): boolean {
  return delivery.actual_tons !== null
}

/** Revenue = tons × sell price. */
export function deliveryRevenue(delivery: Delivery): number {
  return deliveryTons(delivery) * delivery.sell_per_ton
}

/** Cost = tons × cost price + misc fee (a rare extra charge from the supplier). */
export function deliveryCost(delivery: Delivery): number {
  return deliveryTons(delivery) * delivery.cost_per_ton + delivery.misc_fee
}

export function deliveryMargin(delivery: Delivery): number {
  return deliveryRevenue(delivery) - deliveryCost(delivery)
}

export function marginPct(delivery: Delivery): number | null {
  const revenue = deliveryRevenue(delivery)
  if (revenue === 0) return null
  return (deliveryMargin(delivery) / revenue) * 100
}
