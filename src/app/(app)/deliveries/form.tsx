'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { fmtMoney } from '@/lib/format'
import type {
  Delivery,
  Product,
  Season,
  Site,
  Subcontractor,
  Supplier,
} from '@/lib/types'
import { getPriceQuote } from './actions'

export function DeliveryForm({
  action,
  initial,
  seasons,
  suppliers,
  products,
  subcontractors,
  sites,
  defaultSeasonId,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  initial?: Delivery
  seasons: Season[]
  suppliers: Supplier[]
  products: Product[]
  subcontractors: Subcontractor[]
  sites: Site[]
  defaultSeasonId?: string
}) {
  const [state, formAction] = useActionState(action, initialFormState)

  const [subId, setSubId] = useState(initial?.subcontractor_id ?? '')
  const [siteId, setSiteId] = useState(initial?.site_id ?? '')
  const [supplierId, setSupplierId] = useState(initial?.supplier_id ?? '')
  const [productId, setProductId] = useState(initial?.product_id ?? '')

  const [loads, setLoads] = useState(String(initial?.loads ?? 1))
  const [tonsPerLoad, setTonsPerLoad] = useState(String(initial?.est_tons_per_load ?? 24))
  const [costPerTon, setCostPerTon] = useState(
    initial ? String(initial.cost_per_ton) : ''
  )
  const [sellPerTon, setSellPerTon] = useState(
    initial ? String(initial.sell_per_ton) : ''
  )
  const [miscFee, setMiscFee] = useState(String(initial?.misc_fee ?? 0))
  const [quoteNote, setQuoteNote] = useState<string | null>(null)

  // Sites belong to a sub — filter the options when a sub is chosen.
  const visibleSites = subId ? sites.filter((s) => s.subcontractor_id === subId) : sites

  // Auto-fill cost/sell from the price tables once supplier + product + sub
  // are all chosen. Skipped on first render so editing never clobbers values.
  const skipFirstQuote = useRef(true)
  useEffect(() => {
    if (skipFirstQuote.current) {
      skipFirstQuote.current = false
      return
    }
    if (!supplierId || !productId || !subId) return
    let cancelled = false
    void getPriceQuote(supplierId, productId, subId).then((quote) => {
      if (cancelled) return
      if (quote.costPerTon === null) {
        setQuoteNote('No current supplier price found for that supplier + product — enter the cost manually.')
      } else if (quote.markupPct === null) {
        setCostPerTon(String(quote.costPerTon))
        setQuoteNote('No active markup rule found — enter the sell price manually.')
      } else {
        setCostPerTon(String(quote.costPerTon))
        setSellPerTon(quote.sellPerTon !== null ? quote.sellPerTon.toFixed(2) : '')
        setQuoteNote(`Auto-filled from price tables (markup ${quote.markupPct}%). Both fields stay editable.`)
      }
    })
    return () => {
      cancelled = true
    }
  }, [supplierId, productId, subId])

  const estTons = (Number(loads) || 0) * (Number(tonsPerLoad) || 0)
  const estRevenue = estTons * (Number(sellPerTon) || 0)
  const estCost = estTons * (Number(costPerTon) || 0) + (Number(miscFee) || 0)
  const estMargin = estRevenue - estCost

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Season">
          <select name="season_id" required defaultValue={initial?.season_id ?? defaultSeasonId ?? ''} className={inputCls}>
            <option value="" disabled>
              Select a season…
            </option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.is_active ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supplier">
          <select
            name="supplier_id"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Select a supplier…
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Product">
          <select
            name="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Select a product…
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subcontractor">
          <select
            name="subcontractor_id"
            required
            value={subId}
            onChange={(e) => {
              setSubId(e.target.value)
              setSiteId('')
            }}
            className={inputCls}
          >
            <option value="" disabled>
              Select a subcontractor…
            </option>
            {subcontractors.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Site" hint={subId ? 'Only this sub’s sites are shown' : 'Pick a sub first to narrow the list'}>
          <select
            name="site_id"
            required
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Select a site…
            </option>
            {visibleSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Loads (triaxles)">
            <input
              name="loads"
              type="number"
              step="0.5"
              min="0.5"
              required
              value={loads}
              onChange={(e) => setLoads(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Est. tons/load">
            <input
              name="est_tons_per_load"
              type="number"
              step="0.1"
              min="0.1"
              required
              value={tonsPerLoad}
              onChange={(e) => setTonsPerLoad(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Cost per ton ($)">
          <input
            name="cost_per_ton"
            type="number"
            step="0.01"
            min="0"
            required
            value={costPerTon}
            onChange={(e) => setCostPerTon(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Sell per ton ($)">
          <input
            name="sell_per_ton"
            type="number"
            step="0.01"
            min="0"
            required
            value={sellPerTon}
            onChange={(e) => setSellPerTon(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Misc fee ($)" hint="Rare extra charge from the supplier — added to cost">
          <input
            name="misc_fee"
            type="number"
            step="0.01"
            min="0"
            value={miscFee}
            onChange={(e) => setMiscFee(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Supplier ticket / BOL #">
          <input name="supplier_ticket" defaultValue={initial?.supplier_ticket ?? ''} className={inputCls} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ''} className={inputCls} />
      </Field>

      {quoteNote ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {quoteNote}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{estTons.toFixed(1)} t</div>
          <div className="text-xs text-zinc-500">Est. tonnage</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-900">{fmtMoney(estRevenue)}</div>
          <div className="text-xs text-zinc-500">Est. revenue</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-900">{fmtMoney(estCost)}</div>
          <div className="text-xs text-zinc-500">Est. cost</div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${estMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmtMoney(estMargin)}
          </div>
          <div className="text-xs text-zinc-500">Est. margin</div>
        </div>
      </div>

      <FormError error={state.error} />
      <div>
        <SubmitButton>{initial ? 'Save changes' : 'Place order'}</SubmitButton>
      </div>
    </form>
  )
}
