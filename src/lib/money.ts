import type { Delivery } from '@/lib/types'

export function isBagged(delivery: Delivery): boolean {
  return delivery.qty_mode === 'bags'
}

/** Billable tons: actual once reconciled, estimated before. Bagged rows
 *  contribute 0 — their quantity is bags/pallets, not tons. */
export function deliveryTons(delivery: Delivery): number {
  if (isBagged(delivery)) return 0
  return delivery.actual_tons ?? delivery.est_tons
}

export function isReconciled(delivery: Delivery): boolean {
  return delivery.qty_mode === 'bags'
    ? delivery.actual_sell_qty !== null
    : delivery.actual_tons !== null
}

/** Cost of one *sell* unit, converting across bag/pallet when they differ. */
export function costPerSellUnit(
  buyUnit: 'bag' | 'pallet',
  sellUnit: 'bag' | 'pallet',
  buyUnitCost: number,
  bagsPerPallet: number
): number {
  if (buyUnit === sellUnit) return buyUnitCost
  if (buyUnit === 'pallet') return buyUnitCost / bagsPerPallet // pallet → bags
  return buyUnitCost * bagsPerPallet // bags → pallet
}

/** Revenue: tons × sell/ton, or sell qty × sell price per bag/pallet. */
export function deliveryRevenue(delivery: Delivery): number {
  if (isBagged(delivery)) {
    return (delivery.actual_sell_qty ?? delivery.sell_qty ?? 0) * (delivery.sell_unit_price ?? 0)
  }
  return deliveryTons(delivery) * delivery.sell_per_ton
}

/** Cost: tons × cost/ton + misc fee, or buy qty × buy cost per unit + misc fee. */
export function deliveryCost(delivery: Delivery): number {
  if (isBagged(delivery)) {
    return (
      (delivery.actual_buy_qty ?? delivery.buy_qty ?? 0) *
        (delivery.actual_buy_unit_cost ?? delivery.buy_unit_cost ?? 0) +
      delivery.misc_fee
    )
  }
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

/** Display string for a delivery's quantity in lists/reports. */
export function qtyDisplay(delivery: Delivery): string {
  if (isBagged(delivery)) {
    const qty = delivery.actual_sell_qty ?? delivery.sell_qty ?? 0
    const unit = delivery.sell_unit === 'pallet' ? 'pallets' : 'bags'
    return `${Number(qty)} ${unit}${delivery.actual_sell_qty === null ? ' (est)' : ''}`
  }
  return `${deliveryTons(delivery).toFixed(1)}${delivery.actual_tons === null ? ' (est)' : ''}`
}
