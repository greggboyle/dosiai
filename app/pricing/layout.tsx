import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata = {
  title: 'Pricing | DOSI.AI',
  description: 'Simple, transparent pricing for competitive intelligence. Pay for analysts, not for your sales team.',
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  )
}
