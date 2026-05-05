import { getVendorCallAggregates } from '@/app/admin/actions/platform'
import { VendorHealthClient } from '@/app/admin/vendor-health/vendor-health-client'
import { vendorAggregatesToMetrics } from '@/lib/admin/vendor-health-from-calls'

export default async function VendorHealthPage() {
  const aggregates = await getVendorCallAggregates(7)
  const initialMetrics = vendorAggregatesToMetrics(aggregates)
  return <VendorHealthClient initialMetrics={initialMetrics} />
}
