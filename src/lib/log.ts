import type { SupabaseClient } from '@supabase/supabase-js'

/** Append to a delivery's audit log. */
export async function logDeliveryEvent(
  supabase: SupabaseClient,
  deliveryId: string,
  event: string,
  options: { fromStage?: string | null; toStage?: string | null; note?: string | null } = {}
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from('delivery_events').insert({
    delivery_id: deliveryId,
    event,
    from_stage: options.fromStage ?? null,
    to_stage: options.toStage ?? null,
    note: options.note ?? null,
    created_by: user?.id ?? null,
  })
}
