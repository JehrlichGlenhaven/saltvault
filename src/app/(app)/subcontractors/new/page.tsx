import { PageHeader } from '@/components/page'
import { createSubcontractor } from '../actions'
import { SubcontractorForm } from '../form'

export default function NewSubcontractorPage() {
  return (
    <main>
      <PageHeader title="Add subcontractor" />
      <SubcontractorForm action={createSubcontractor} />
    </main>
  )
}
