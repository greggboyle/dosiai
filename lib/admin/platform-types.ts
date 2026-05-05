export type VendorAggregateRow = {
  vendor: string
  calls: number
  successes: number
  failures: number
  avgLatencyMs: number | null
  totalCostCents: number
}

export type WorkspaceCostRow = {
  id: string
  name: string
  plan: string
  status: string
  ai_cost_mtd_cents: number
  ai_cost_ceiling_cents: number
  trial_ends_at: string | null
}
