import { redirect } from 'next/navigation'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FolderOpen, FileText, BookOpen, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { uploadResource } from '@/lib/resources/actions'
import { listWorkspaceResources } from '@/lib/resources/storage'
import { formatRelativeLabel } from '@/lib/dashboard/queries'

export default async function ResourcesPage() {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/sign-in')
  const { data: member } = await supabase
    .from('workspace_member')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const canUpload = member?.role === 'admin' || member?.role === 'analyst'
  const resources = await listWorkspaceResources(workspaceId)

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
          {canUpload ? (
            <form action={uploadResource} className="flex flex-wrap items-center gap-2">
              <Input name="file" type="file" required className="max-w-sm" />
              <Button size="sm" type="submit">
                <Upload className="mr-2 size-4" />
                Upload resource
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">Only admins and analysts can upload resources.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded Resources</CardTitle>
          <CardDescription>
            Files are workspace-scoped and ready to be used as future AI context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {resources.map((resource) => (
                <div
                  key={resource.path}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(resource.sizeBytes / 1024).toFixed(1)} KB
                      {resource.updatedAt ? ` · Updated ${formatRelativeLabel(resource.updatedAt)}` : ''}
                    </p>
                  </div>
                  {resource.signedUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={resource.signedUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 size-3.5" />
                        Open
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
