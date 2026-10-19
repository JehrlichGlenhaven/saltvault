'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Field, FormError, SubmitButton, inputCls } from '@/components/forms'
import { initialFormState, type FormState } from '@/lib/forms'
import { fmtMoney } from '@/lib/format'
import { costPerSellUnit } from '@/lib/money'
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

  // tons mode
  const [loads, setLoads] = useState(String(initial?.loads ?? 1))
  const [tonsPerLoad, setTonsPerLoad] = useState(String(initial?.est_tons_per_load ?? 24))
  const [costPerTon, setCostPerTon] = useState(initial ? String(initial.cost_per_ton) : '')
  const [markupPerTon, setMarkupPerTon] = useState(initial ? String(initial.markup_per_ton) : '')

  // bags mode
  const [bagsPerPallet, setBagsPerPallet] = useState(String(initial?.bags_per_pallet ?? 50))
  const [buyQty, setBuyQty] = useState(initial?.buy_qty != null ? String(initial.buy_qty) : '')
  const [buyUnit, setBuyUnit] = useState<'bag' | 'pallet'>(initial?.buy_unit ?? 'pallet')
  const [buyUnitCost, setBuyUnitCost] = useState(initial?.buy_unit_cost != null ? String(initial.buy_unit_cost) : '')
  const [sellQty, setSellQty] = useState(initial?.sell_qty != null ? String(initial.sell_qty) : '')
  const [sellUnit, setSellUnit] = useState<'bag' | 'pallet'>(initial?.sell_unit ?? 'bag')
  const [sellMarkup, setSellMarkup] = useState(initial?.sell_markup_per_unit != null ? String(initial.sell_markup_per_unit) : '')

  const [miscFee, setMiscFee] = useState(String(initial?.misc_fee ?? 0))
  const [quoteNote, setQuoteNote] = useState<string | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)
  const bagged = selectedProduct?.unit === 'bag'

  // Sites belong to a sub — filter the options when a sub is chosen.
  const visibleSites = subId ? sites.filter((s) => s.subcontractor_id === subId) : sites

  // Auto-fill cost/markup from the per-ton price tables once supplier + product
  // + sub are chosen. Skipped for bagged products (per-ton prices don't apply)
  // and on first render so editing never clobbers values.
  const skipFirstQuote = useRef(true)
  useEffect(() => {
    if (skipFirstQuote.current) {
      skipFirstQuote.current = false
      return
    }
    if (!supplierId || !productId || !subId) return
    const product = products.find((p) => p.id === productId)
    if (product?.unit === 'bag') return // bagged: no per-ton price lookup
    let cancelled = false
    void getPriceQuote(supplierId, productId, subId).then((quote) => {
      if (cancelled) return
      if (quote.costPerTon === null) {
        setQuoteNote('No current supplier price found for that supplier + product — enter the cost manually.')
      } else if (quote.markupPerTon === null) {
        setCostPerTon(String(quote.costPerTon))
        setQuoteNote('No active markup rule found — enter the markup manually.')
      } else {
        setCostPerTon(String(quote.costPerTon))
        setMarkupPerTon(quote.markupPerTon.toFixed(2))
        setQuoteNote(`Auto-filled from price tables (markup rule ${quote.markupPct}% = $${quote.markupPerTon.toFixed(2)}/t). Both fields stay editable.`)
      }
    })
    return () => {
      cancelled = true
    }
  }, [supplierId, productId, subId, products])

  // --- live previews ---
  const estTons = (Number(loads) || 0) * (Number(tonsPerLoad) || 0)
  const sellPerTonNum = (Number(costPerTon) || 0) + (Number(markupPerTon) || 0)

  const bpp = Number(bagsPerPallet) || 0
  const buyQtyN = Number(buyQty) || 0
  const buyCostN = Number(buyUnitCost) || 0
  const sellQtyN = Number(sellQty) || 0
  const sellMarkupN = Number(sellMarkup) || 0
  const costPerSell = bpp > 0 ? costPerSellUnit(buyUnit, sellUnit, buyCostN, bpp) : 0
  const sellPricePerUnit = costPerSell + sellMarkupN

  const estRevenue = bagged ? sellQtyN * sellPricePerUnit : estTons * sellPerTonNum
  const estCost = bagged
    ? buyQtyN * buyCostN + (Number(miscFee) || 0)
    : estTons * (Number(costPerTon) || 0) + (Number(miscFee) || 0)
  const estMargin = estRevenue - estCost

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="qty_mode" value={bagged ? 'bags' : 'tons'} />

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
                {product.unit === 'bag' ? ' (bagged)' : ''}
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

        {!bagged ? (
          <>
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
            <Field
              label="Markup per ton ($)"
              hint={`Sell price: $${sellPerTonNum.toFixed(2)}/t (cost + markup)`}
            >
              <input
                name="markup_per_ton"
                type="number"
                step="0.01"
                min="0"
                required
                value={markupPerTon}
                onChange={(e) => setMarkupPerTon(e.target.value)}
                className={inputCls}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Bags per pallet" hint="Used to convert when buy and sell units differ">
              <input
                name="bags_per_pallet"
                type="number"
                step="1"
                min="1"
                required
                value={bagsPerPallet}
                onChange={(e) => setBagsPerPallet(e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="We buy (qty)">
                <input
                  name="buy_qty"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={buyQty}
                  onChange={(e) => setBuyQty(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Buy unit">
                <select
                  name="buy_unit"
                  value={buyUnit}
                  onChange={(e) => setBuyUnit(e.target.value as 'bag' | 'pallet')}
                  className={inputCls}
                >
                  <option value="pallet">pallets</option>
                  <option value="bag">bags</option>
                </select>
              </Field>
            </div>
            <Field label={`Buy cost per ${buyUnit} ($)`}>
              <input
                name="buy_unit_cost"
                type="number"
                step="0.01"
                min="0"
                required
                value={buyUnitCost}
                onChange={(e) => setBuyUnitCost(e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sub buys (qty)">
                <input
                  name="sell_qty"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={sellQty}
                  onChange={(e) => setSellQty(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Sell unit">
                <select
                  name="sell_unit"
                  value={sellUnit}
                  onChange={(e) => setSellUnit(e.target.value as 'bag' | 'pallet')}
                  className={inputCls}
                >
                  <option value="bag">bags</option>
                  <option value="pallet">pallets</option>
                </select>
              </Field>
            </div>
            <Field
              label={`Markup per ${sellUnit} ($)`}
              hint={`Sell price: $${sellPricePerUnit.toFixed(2)}/${sellUnit} (cost $${costPerSell.toFixed(2)} + markup)`}
            >
              <input
                name="sell_markup_per_unit"
                type="number"
                step="0.01"
                min="0"
                required
                value={sellMarkup}
                onChange={(e) => setSellMarkup(e.target.value)}
                className={inputCls}
              />
            </Field>
          </>
        )}

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

      {(() => {
        const noteToShow =
          quoteNote ?? (bagged ? 'Bagged product — enter the buy cost and markup per unit below.' : null)
        return noteToShow ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {noteToShow}
          </p>
        ) : null
      })()}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">
            {bagged ? `${sellQtyN} ${sellUnit}${sellQtyN === 1 ? '' : 's'}` : `${estTons.toFixed(1)} t`}
          </div>
          <div className="text-xs text-zinc-500">{bagged ? 'Sell quantity' : 'Est. tonnage'}</div>
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
