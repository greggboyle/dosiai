import type { VendorHealthMetric, AIVendor } from '@/lib/admin-types'
import type { VendorAggregateRow } from '@/lib/admin/platform-types'

export function vendorAggregatesToMetrics(rows: VendorAggregateRow[]): VendorHealthMetric[] {
  const now = new Date().toISOString()
  return rows.map((r) => {
    const errPct = r.calls ? (r.failures / r.calls) * 100 : 0
    const lat = r.avgLatencyMs ?? 0
    let status: VendorHealthMetric['status'] = 'healthy'
    if (errPct > 15 || r.calls === 0) status = 'down'
    else if (errPct > 3) status = 'degraded'

    return {
      vendor: r.vendor as AIVendor,
      status,
      latencyP50Ms: lat || 0,
      latencyP99Ms: lat ? Math.round(lat * 2.2) : 0,
      errorRateLast1h: errPct,
      errorRateLast24h: errPct,
      totalCallsLast24h: r.calls,
      lastCheckedAt: now,
    }
  })
}
