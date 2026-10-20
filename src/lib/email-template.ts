import { fmtMoney } from '@/lib/format'
import { deliveryRevenue, isBagged } from '@/lib/money'
import type { Delivery } from '@/lib/types'

export type ConfirmableDelivery = Delivery & {
  subcontractors: { name: string; contact_name: string | null; email: string | null } | null
  sites: { name: string; address: string | null } | null
  products: { name: string } | null
}

/** Default confirmation email with the order's data merged in — the starting
 *  point the user reviews and can edit before sending. */
export function buildConfirmationEmail(d: ConfirmableDelivery): { subject: string; body: string } {
  const product = d.products?.name ?? 'salt'
  const siteName = d.sites?.name ?? 'your site'
  const address = d.sites?.address

  const quantity = isBagged(d)
    ? `${d.sell_qty} ${d.sell_unit}${Number(d.sell_qty) === 1 ? '' : 's'}`
    : `${d.est_tons.toFixed(1)} tons`

  const material = d.source === 'inventory' ? `${product} (from our yard stock)` : product
  const cost = fmtMoney(deliveryRevenue(d))
  const greeting = d.subcontractors?.contact_name ?? d.subcontractors?.name ?? 'there'

  const subject = `Salt order confirmed — ${product} for ${siteName}`

  const body = `Hi ${greeting},

Your salt order with Glenhaven Snow is confirmed:

- Material: ${material}
- Deliver to: ${siteName}${address ? `, ${address}` : ''}
- Estimated quantity: ${quantity}
- Estimated cost: ${cost} (final total is billed on actual delivered weight)

We'll reach out when it's on the way.

— Glenhaven Snow
salt@glenhavensnow.com`

  return { subject, body }
}
