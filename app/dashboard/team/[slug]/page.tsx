export const dynamic = 'force-dynamic'

export default function TeamPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <h2 className="font-serif text-3xl text-ink-900 capitalize">{params.slug}</h2>
    </div>
  )
}
