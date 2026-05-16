import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ListEmptyStateVariant = 'no_records' | 'filtered_empty'

export interface ListEmptyStateProps {
  variant: ListEmptyStateVariant
  recordLabel: string
  /** Shown when variant is `no_records` */
  description?: string
  primaryAction?: { label: string; href: string }
  clearFiltersHref?: string
  className?: string
}

export function ListEmptyState({
  variant,
  recordLabel,
  description,
  primaryAction,
  clearFiltersHref,
  className,
}: ListEmptyStateProps) {
  if (variant === 'filtered_empty') {
    return (
      <div className={cn('rounded-lg border border-dashed p-10 text-center', className)}>
        <p className="text-sm font-medium">No {recordLabel} match your filters.</p>
        {clearFiltersHref ? (
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href={clearFiltersHref}>Clear filters</Link>
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-dashed p-10 text-center', className)}>
      <p className="text-sm font-medium">No {recordLabel} yet.</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {primaryAction ? (
        <Button className="mt-4" asChild>
          <Link href={primaryAction.href}>{primaryAction.label}</Link>
        </Button>
      ) : null}
    </div>
  )
}
