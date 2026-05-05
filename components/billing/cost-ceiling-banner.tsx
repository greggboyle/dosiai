'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceSubscription } from '@/lib/billing-types'

export function CostCeilingBanner({ subscription }: { subscription: WorkspaceSubscription }) {
  const pct = subscription.aiCostPercentUsed ?? 0
  if (pct < 85) return null

  const over = pct >= 100

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 border-b px-6 py-2 text-sm',
        over ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        {over ? (
          <>
            Monthly AI usage has reached the workspace ceiling ({pct}%).
          </>
        ) : (
          <>Approaching monthly AI usage ceiling ({pct}%).</>
        )}{' '}
        <Link href="/settings/billing" className="underline underline-offset-2 font-medium">
          Review billing
        </Link>
      </span>
    </div>
  )
}
