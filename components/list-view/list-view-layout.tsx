import { cn } from '@/lib/utils'

export interface ListViewLayoutProps {
  title: string
  subtitle?: React.ReactNode
  headerActions?: React.ReactNode
  controlBar?: React.ReactNode
  children: React.ReactNode
  /** List (default) or responsive grid for battle cards etc. */
  layout?: 'list' | 'grid'
  className?: string
}

export function ListViewLayout({
  title,
  subtitle,
  headerActions,
  controlBar,
  children,
  layout = 'list',
  className,
}: ListViewLayoutProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
        {headerActions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div> : null}
      </div>
      {controlBar}
      <div
        className={
          layout === 'grid'
            ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
            : 'space-y-3'
        }
      >
        {children}
      </div>
    </div>
  )
}
