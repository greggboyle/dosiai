import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { SystemHealthClient, type SystemHealthData } from './system-health-client'

type Status = 'healthy' | 'degraded' | 'down'

function statusFromRates(failureRate: number): Status {
  if (failureRate >= 0.25) return 'down'
  if (failureRate >= 0.1) return 'degraded'
  return 'healthy'
}

export default async function SystemHealthPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  const [{ data: sweeps }, { data: vendorCalls }, { data: audits }] = await Promise.all([
    admin.from('sweep').select('id,status,started_at,completed_at,trigger').gte('started_at', oneDayAgo).order('started_at', { ascending: true }),
    admin.from('vendor_call').select('id,called_at,success,latency_ms,vendor,error_message').gte('called_at', oneDayAgo).order('called_at', { ascending: true }),
    admin
      .from('audit_log_entry')
      .select('id,timestamp,severity,action,target_name,reason')
      .in('severity', ['warn', 'error', 'critical'])
      .gte('timestamp', oneDayAgo)
      .order('timestamp', { ascending: false })
      .limit(20),
  ])

  const sweeps1h = (sweeps ?? []).filter((s) => s.started_at >= oneHourAgo)
  const failedSweeps1h = sweeps1h.filter((s) => s.status === 'failed').length
  const completedSweeps1h = sweeps1h.filter((s) => s.status === 'completed').length
  const runningSweeps = sweeps1h.filter((s) => s.status === 'running').length
  const sweepFailureRate = sweeps1h.length > 0 ? failedSweeps1h / sweeps1h.length : 0

  const calls1h = (vendorCalls ?? []).filter((c) => c.called_at >= oneHourAgo)
  const failedCalls1h = calls1h.filter((c) => !c.success).length
  const callFailureRate = calls1h.length > 0 ? failedCalls1h / calls1h.length : 0
  const latencies = calls1h.map((c) => c.latency_ms ?? 0).filter((n) => n > 0).sort((a, b) => a - b)
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0
  const p99 = latencies.length ? latencies[Math.floor(latencies.length * 0.99)] : 0

  const buckets = new Map<string, { hour: string; requests: number; sweeps: number }>()
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
    buckets.set(key, { hour: `${String(d.getUTCHours()).padStart(2, '0')}:00`, requests: 0, sweeps: 0 })
  }
  for (const c of vendorCalls ?? []) {
    const d = new Date(c.called_at)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
    const b = buckets.get(key)
    if (b) b.requests += 1
  }
  for (const s of sweeps ?? []) {
    const d = new Date(s.started_at)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
    const b = buckets.get(key)
    if (b && s.status === 'completed') b.sweeps += 1
  }

  const data: SystemHealthData = {
    lastUpdatedIso: now.toISOString(),
    components: [
      {
        name: 'API Gateway',
        kind: 'api',
        status: statusFromRates(callFailureRate),
        metrics: [
          { label: 'Requests (1h)', value: `${calls1h.length}`, status: 'ok' },
          { label: 'P50 Latency', value: `${p50}ms`, status: p50 > 1200 ? 'warning' : 'ok' },
          { label: 'P99 Latency', value: `${p99}ms`, status: p99 > 3000 ? 'critical' : p99 > 1500 ? 'warning' : 'ok' },
          { label: 'Error Rate', value: `${(callFailureRate * 100).toFixed(1)}%`, status: callFailureRate > 0.1 ? 'critical' : callFailureRate > 0.05 ? 'warning' : 'ok' },
        ],
      },
      {
        name: 'Sweep Workers',
        kind: 'worker',
        status: statusFromRates(sweepFailureRate),
        metrics: [
          { label: 'Running (1h)', value: `${runningSweeps}`, status: runningSweeps > 20 ? 'warning' : 'ok' },
          { label: 'Started (1h)', value: `${sweeps1h.length}`, status: 'ok' },
          { label: 'Completed (1h)', value: `${completedSweeps1h}`, status: 'ok' },
          { label: 'Failed (1h)', value: `${failedSweeps1h}`, status: failedSweeps1h > 0 ? 'warning' : 'ok' },
        ],
      },
    ],
    throughputData: [...buckets.values()],
    incidents:
      (audits ?? []).map((a) => ({
        id: a.id,
        severity: a.severity,
        title: a.action.replaceAll('_', ' '),
        detail: a.reason ?? a.target_name,
        timestamp: a.timestamp,
      })) ?? [],
  }

  return <SystemHealthClient data={data} />
}
