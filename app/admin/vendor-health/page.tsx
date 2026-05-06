import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getVendorCallAggregates } from '@/app/admin/actions/platform'
import { VendorHealthClient } from '@/app/admin/vendor-health/vendor-health-client'
import { vendorAggregatesToMetrics } from '@/lib/admin/vendor-health-from-calls'
import type { AIVendor } from '@/lib/admin-types'

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
  return sorted[idx] ?? 0
}

function bucketKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
}

export default async function VendorHealthPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const now = new Date()
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const aggregates = await getVendorCallAggregates(7)
  const initialMetrics = vendorAggregatesToMetrics(aggregates)

  const { data: calls } = await admin
    .from('vendor_call')
    .select('vendor,success,latency_ms,called_at')
    .gte('called_at', since24h)
    .order('called_at', { ascending: true })

  const vendors: AIVendor[] = ['openai', 'anthropic', 'xai']
  const bucketSeed = new Map<string, { hour: string; latencies: number[]; total: number; failed: number }>()
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000)
    bucketSeed.set(bucketKey(d), {
      hour: `${String(d.getUTCHours()).padStart(2, '0')}:00`,
      latencies: [],
      total: 0,
      failed: 0,
    })
  }

  const perVendor = new Map<AIVendor, Map<string, { hour: string; latencies: number[]; total: number; failed: number }>>()
  for (const v of vendors) {
    perVendor.set(v, new Map([...bucketSeed.entries()].map(([k, b]) => [k, { ...b, latencies: [] }])))
  }

  for (const c of calls ?? []) {
    const vendor = c.vendor as AIVendor
    if (!vendors.includes(vendor)) continue
    const key = bucketKey(new Date(c.called_at))
    const bucket = perVendor.get(vendor)?.get(key)
    if (!bucket) continue
    bucket.total += 1
    if (!c.success) bucket.failed += 1
    if (typeof c.latency_ms === 'number' && c.latency_ms >= 0) bucket.latencies.push(c.latency_ms)
  }

  const seriesByVendor = Object.fromEntries(
    vendors.map((v) => {
      const points = [...(perVendor.get(v)?.values() ?? [])]
      return [
        v,
        {
          latency: points.map((p) => {
            const sorted = [...p.latencies].sort((a, b) => a - b)
            return {
              hour: p.hour,
              p50: percentile(sorted, 0.5),
              p99: percentile(sorted, 0.99),
            }
          }),
          error: points.map((p) => ({
            hour: p.hour,
            rate: p.total > 0 ? (p.failed / p.total) * 100 : 0,
          })),
        },
      ]
    })
  ) as Record<AIVendor, { latency: Array<{ hour: string; p50: number; p99: number }>; error: Array<{ hour: string; rate: number }> }>

  return <VendorHealthClient initialMetrics={initialMetrics} seriesByVendor={seriesByVendor} />
}
