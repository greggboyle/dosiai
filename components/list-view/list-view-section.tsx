import { cn } from '@/lib/utils'

export interface ListViewSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function ListViewSection({ title, subtitle, children, className }: ListViewSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
