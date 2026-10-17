import { PageHeader } from '@/components/page'
import { createProduct } from '../actions'
import { ProductForm } from '../form'

export default function NewProductPage() {
  return (
    <main>
      <PageHeader title="Add product" />
      <ProductForm action={createProduct} />
    </main>
  )
}
