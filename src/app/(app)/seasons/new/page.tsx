import { PageHeader } from '@/components/page'
import { createSeason } from '../actions'
import { SeasonForm } from '../form'

export default function NewSeasonPage() {
  return (
    <main>
      <PageHeader title="Add season" />
      <SeasonForm action={createSeason} />
    </main>
  )
}
