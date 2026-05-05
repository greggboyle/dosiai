import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RegulatoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regulatory</h1>
          <p className="text-sm text-muted-foreground">
            Track regulatory filings, compliance updates, and legal developments
          </p>
        </div>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Watch
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Scale className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">No regulatory watches configured</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
          Monitor SEC filings, patent applications, and regulatory announcements relevant to your competitive landscape.
        </p>
        <Button className="mt-4">
          <Plus className="size-4 mr-2" />
          Configure watches
        </Button>
      </div>
    </div>
  )
}
