import { redirect } from 'next/navigation'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FolderOpen, FileText, BookOpen } from 'lucide-react'

export default async function ResourcesPage() {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground">
          Central library for decks, one-pagers, strategy docs, and other sales collateral.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Library</CardTitle>
          <CardDescription>
            Use this space to collect materials that can power future brief and battle card generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="size-4" />
                Organized repository
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Group resources by competitor, topic, or document type.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4" />
                Sales collateral context
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep pitch decks, one-pagers, and strategy docs in one place.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="size-4" />
                AI-ready foundation
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Build a high-quality source repository for future generation workflows.
              </p>
            </div>
          </div>
          <Button size="sm" disabled>
            <Upload className="mr-2 size-4" />
            Upload resources (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
