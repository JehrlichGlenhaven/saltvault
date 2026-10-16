import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DeleteButton } from '@/components/delete-button'
import { PageHeader } from '@/components/page'
import { fmtDateTime, fmtMoney } from '@/lib/format'
import { MILESTONES, currentStageLabel, milestoneLabel } from '@/lib/milestones'
import { deliveryCost, deliveryMargin, deliveryRevenue, deliveryTons, marginPct } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'
import type {
  Delivery,
  DeliveryEvent,
  Product,
  Season,
  Site,
  Subcontractor,
  Supplier,
} from '@/lib/types'
import { advanceMilestone, deleteDelivery, reconcileDelivery, updateDelivery } from '../actions'
import { DeliveryForm } from '../form'
import { ReconcileForm } from './reconcile-form'

type DeliveryRow = Delivery & {
  subcontractors: { name: string } | null
  sites: { name: string } | null
  products: { name: string } | null
  suppliers: { name: string } | null
  seasons: { name: string } | null
}

function eventText(event: DeliveryEvent): string {
  if (event.event === 'milestone') return `Advanced to “${milestoneLabel(event.to_stage as never)}”`
  if (event.event === 'created') return 'Order placed'
  if (event.event === 'edited') return 'Details edited'
  if (event.event === 'reconciled') return event.note ?? 'Reconciled'
  return event.note ?? event.event
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: delivery },
    { data: events },
    { data: seasons },
    { data: suppliers },
    { data: products },
    { data: subs },
    { data: sites },
  ] = await Promise.all([
    supabase
      .from('deliveries')
      .select('*, subcontractors(name), sites(name), products(name), suppliers(name), seasons(name)')
      .eq('id', id)
      .single(),
    supabase.from('delivery_events').select('*').eq('delivery_id', id).order('created_at', { ascending: false }),
    supabase.from('seasons').select('*').order('start_date', { ascending: false, nullsFirst: false }),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('subcontractors').select('*').eq('active', true).order('name'),
    supabase.from('sites').select('*').order('name'),
  ])
  if (!delivery) notFound()

  const d = delivery as unknown as DeliveryRow
  const reconciled = d.actual_tons !== null
  const pct = marginPct(d)

  return (
    <main className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <PageHeader title={`${d.subcontractors?.name ?? 'Delivery'} — ${d.sites?.name ?? ''}`} />
          <span className="inline-block rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
            {currentStageLabel(d)}
          </span>
        </div>
        <DeleteButton action={deleteDelivery.bind(null, d.id)} label="Delete delivery" />
      </div>

      {/* Summary */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-medium text-zinc-900">Summary</h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
          <div><dt className="text-zinc-500">Season</dt><dd className="font-medium text-zinc-900">{d.seasons?.name ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Supplier</dt><dd className="font-medium text-zinc-900">{d.suppliers?.name ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Product</dt><dd className="font-medium text-zinc-900">{d.products?.name ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Loads</dt><dd className="font-medium text-zinc-900">{d.loads}</dd></div>
          <div>
            <dt className="text-zinc-500">Tonnage</dt>
            <dd className="font-medium text-zinc-900">
              {reconciled ? `${Number(d.actual_tons).toFixed(2)} t (actual)` : `${d.est_tons.toFixed(1)} t (est)`}
            </dd>
          </div>
          <div><dt className="text-zinc-500">Cost / ton</dt><dd className="font-medium text-zinc-900">${Number(d.cost_per_ton).toFixed(2)}</dd></div>
          <div><dt className="text-zinc-500">Sell / ton</dt><dd className="font-medium text-zinc-900">${Number(d.sell_per_ton).toFixed(2)}</dd></div>
          <div><dt className="text-zinc-500">Misc fee</dt><dd className="font-medium text-zinc-900">{fmtMoney(d.misc_fee)}</dd></div>
          <div><dt className="text-zinc-500">Revenue{reconciled ? '' : ' (est)'}</dt><dd className="font-medium text-zinc-900">{fmtMoney(deliveryRevenue(d))}</dd></div>
          <div><dt className="text-zinc-500">Cost{reconciled ? '' : ' (est)'}</dt><dd className="font-medium text-zinc-900">{fmtMoney(deliveryCost(d))}</dd></div>
          <div>
            <dt className="text-zinc-500">Margin{reconciled ? '' : ' (est)'}</dt>
            <dd className={`font-medium ${deliveryMargin(d) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmtMoney(deliveryMargin(d))}
              {pct !== null ? ` (${pct.toFixed(1)}%)` : ''}
            </dd>
          </div>
          <div><dt className="text-zinc-500">Supplier ticket</dt><dd className="font-medium text-zinc-900">{d.supplier_ticket ?? '—'}</dd></div>
        </dl>
        {d.notes ? <p className="mt-4 text-sm text-zinc-600">Notes: {d.notes}</p> : null}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Tracker */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-zinc-900">Pipeline tracker</h3>
          <ol className="flex flex-col gap-2">
            {MILESTONES.map((m) => {
              const value = d[m.key]
              return (
                <li
                  key={m.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 px-3 py-2"
                >
                  <span className={`text-sm ${value ? 'font-medium text-zinc-900' : 'text-zinc-500'}`}>
                    {m.label}
                  </span>
                  {value ? (
                    <time className="text-xs text-zinc-500">{fmtDateTime(value)}</time>
                  ) : m.key === 'reconciled_at' ? (
                    <span className="text-xs text-zinc-400">Use the reconcile form</span>
                  ) : (
                    <form action={advanceMilestone.bind(null, d.id, m.key)}>
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Mark
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs text-zinc-400">
            Sub invoicing and both payment milestones will be automated by the invoicing
            phase — you can mark them manually until then.
          </p>
        </section>

        {/* Reconcile + events */}
        <div className="flex flex-col gap-8">
          {!reconciled ? (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-zinc-900">Reconcile (supplier invoice received)</h3>
              <ReconcileForm action={reconcileDelivery.bind(null, d.id)} estTons={deliveryTons(d)} />
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-zinc-900">Event log</h3>
            {(events ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">No events yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {((events ?? []) as DeliveryEvent[]).map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-zinc-700">{eventText(event)}</span>
                    <time className="shrink-0 text-xs text-zinc-400">{fmtDateTime(event.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Edit */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <details open={!reconciled}>
          <summary className="cursor-pointer text-sm font-medium text-zinc-900">
            Edit details{reconciled ? ' (locked — reconciled)' : ''}
          </summary>
          <div className="mt-6">
            {reconciled ? (
              <p className="text-sm text-zinc-500">
                Quantities and prices are locked once a delivery is reconciled.
              </p>
            ) : (
              <DeliveryForm
                action={updateDelivery.bind(null, d.id)}
                initial={d}
                seasons={(seasons ?? []) as Season[]}
                suppliers={(suppliers ?? []) as Supplier[]}
                products={(products ?? []) as Product[]}
                subcontractors={(subs ?? []) as Subcontractor[]}
                sites={(sites ?? []) as Site[]}
              />
            )}
          </div>
        </details>
      </section>
    </main>
  )
}

export default function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Detail params={params} />
    </Suspense>
  )
}
