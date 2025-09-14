import ClientDocPage from './ClientDocPage'

export default function DocPage({ params }: { params: { doc_id: string } }) {
  return <ClientDocPage params={params} />
}
