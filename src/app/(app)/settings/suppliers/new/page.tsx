import { PageHeader } from '@/components/page'
import { createSupplier } from '../actions'
import { SupplierForm } from '../form'

export default function NewSupplierPage() {
  return (
    <main>
      <PageHeader title="Add supplier" />
      <SupplierForm action={createSupplier} />
    </main>
  )
}
