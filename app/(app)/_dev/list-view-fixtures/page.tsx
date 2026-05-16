import { notFound } from 'next/navigation'
import { ListCard } from '@/components/list-view/list-card'
import type { ListCardData } from '@/lib/types/dosi'

const FIXTURES: ListCardData<{ note: string }>[] = [
  {
    recordId: '00000000-0000-0000-0000-000000000001',
    recordType: 'brief',
    title: 'Weekly market pulse',
    preview: 'Short preview line for layout QA in development.',
    primaryBadge: { label: 'Sweep summary', variant: 'neutral' },
    metadata: { attribution: { type: 'ai_drafted' } },
    timestamp: new Date().toISOString(),
    userState: 'unread',
    raw: { note: 'fixture' },
  },
  {
    recordId: '00000000-0000-0000-0000-000000000002',
    recordType: 'intelligence_item',
    title: 'Competitor launches new SKU line',
    preview: 'Another preview to verify two-line clamp and metadata row.',
    primaryBadge: { label: 'Customer deployments', variant: 'buy_side' },
    scoreIndicator: { value: 82, band: 'high' },
    confidenceIndicator: 'high',
    metadata: {
      sourceLabel: 'sec.gov',
      relatedEntities: [{ label: 'Acme Logistics', type: 'competitor' }],
    },
    timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
    userState: 'read',
    raw: { note: 'fixture' },
  },
]

export default function ListViewFixturesPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">List view fixtures</h1>
        <p className="text-sm text-muted-foreground">Development-only preview of shared list cards.</p>
      </div>
      <div className="space-y-4">
        {FIXTURES.map((f) => (
          <ListCard key={f.recordId} data={f} href="#" />
        ))}
      </div>
    </div>
  )
}
