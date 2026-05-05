'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Building2,
  Clock,
  Flag,
  Route,
  FileCode,
  Activity,
  Heart,
  UserCheck,
  ScrollText,
  Users,
  CreditCard,
  LogOut,
  ChevronDown,
  X,
  LayoutDashboard,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { endImpersonation } from '@/app/admin/impersonation/actions'

// Operator roles
type OperatorRole = 'viewer' | 'analyst' | 'admin' | 'owner'

interface OperatorUser {
  id: string
  name: string
  email: string
  role: OperatorRole
}

// Impersonation state (would come from context in real app)
interface ImpersonationState {
  isActive: boolean
  workspaceName?: string
  workspaceId?: string
  startedAt?: string
  operatorName?: string
}

const roleLabels: Record<OperatorRole, string> = {
  viewer: 'Viewer',
  analyst: 'Analyst',
  admin: 'Admin',
  owner: 'Owner',
}

const roleColors: Record<OperatorRole, string> = {
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
  analyst: 'bg-blue-100 text-blue-700 border-blue-200',
  admin: 'bg-red-100 text-red-700 border-red-200',
  owner: 'bg-amber-100 text-amber-700 border-amber-200',
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: OperatorRole[] // if undefined, all roles can see
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Workspaces',
    items: [
      { label: 'Search', href: '/admin/workspaces/search', icon: Search },
      { label: 'Recently Active', href: '/admin/workspaces/recent', icon: Clock },
      { label: 'Flagged', href: '/admin/workspaces/flagged', icon: Flag },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'AI Routing', href: '/admin/ai-routing', icon: Route, roles: ['admin', 'owner'] },
      { label: 'Prompts', href: '/admin/prompts', icon: FileCode, roles: ['admin', 'owner'] },
      { label: 'Vendor Health', href: '/admin/vendor-health', icon: Activity },
      { label: 'System Health', href: '/admin/system-health', icon: Heart },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Impersonation Sessions', href: '/admin/impersonation', icon: UserCheck },
      { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText },
      { label: 'Operator Users', href: '/admin/operators', icon: Users, roles: ['admin', 'owner'] },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Credits & Overrides', href: '/admin/billing', icon: CreditCard, roles: ['admin', 'owner'] },
    ],
  },
]

function AdminSidebar({ operatorRole }: { operatorRole: OperatorRole }) {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] shrink-0 border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-1 p-2">
        {navigation.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(operatorRole)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className="mb-2">
              <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

function ImpersonationBanner({ state, onEnd }: { state: ImpersonationState; onEnd: () => Promise<void> }) {
  if (!state.isActive) return null

  const duration = state.startedAt
    ? `${Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 60000)} min`
    : '0 min'

  return (
    <div className="flex h-10 items-center justify-between bg-purple-600 px-4 text-white">
      <div className="flex items-center gap-2 text-[13px]">
        <UserCheck className="size-4" />
        <span>
          Impersonating <strong>{state.workspaceName}</strong> as {state.operatorName} — {duration}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-white hover:bg-purple-700 hover:text-white"
        onClick={() => {
          void onEnd()
        }}
      >
        <X className="size-3 mr-1" />
        End impersonation
      </Button>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isMobile, setIsMobile] = React.useState(false)
  const [currentOperator, setCurrentOperator] = React.useState<OperatorUser | null>(null)
  const [authLoading, setAuthLoading] = React.useState(true)
  const [impersonationState, setImpersonationState] = React.useState<ImpersonationState>({ isActive: false })

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    setSupabase(createSupabaseBrowserClient())
  }, [])

  React.useEffect(() => {
    if (!supabase) return

    if (pathname === '/admin/sign-in') {
      setAuthLoading(false)
      return
    }

    let mounted = true
    async function loadOperator() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        if (mounted) {
          setCurrentOperator(null)
          setAuthLoading(false)
          router.replace('/admin/sign-in')
        }
        return
      }

      const { data: operator } = await supabase
        .from('operator_user')
        .select('*')
        .eq('email', session.user.email.toLowerCase())
        .eq('status', 'active')
        .maybeSingle()

      if (!mounted) return
      if (!operator) {
        setCurrentOperator(null)
        setAuthLoading(false)
        router.replace('/admin/sign-in')
        return
      }

      setCurrentOperator({
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
      })

      const { data: activeImpersonation } = await supabase
        .from('impersonation_session')
        .select('id,workspace_id,started_at,workspace:workspace_id(name)')
        .eq('operator_id', operator.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeImpersonation) {
        setImpersonationState({
          isActive: true,
          workspaceId: activeImpersonation.workspace_id,
          workspaceName: (activeImpersonation.workspace as unknown as { name?: string })?.name,
          startedAt: activeImpersonation.started_at,
          operatorName: operator.name,
        })
      } else {
        setImpersonationState({ isActive: false })
      }

      setAuthLoading(false)
    }

    loadOperator()
    return () => {
      mounted = false
    }
  }, [pathname, router, supabase])

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/admin/sign-in')
  }

  const handleEndImpersonation = async () => {
    if (!supabase || !impersonationState.workspaceId || !currentOperator) return
    const { data: active } = await supabase
      .from('impersonation_session')
      .select('id')
      .eq('operator_id', currentOperator.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!active) return
    await endImpersonation(active.id)
    setImpersonationState({ isActive: false })
    router.refresh()
  }

  if (pathname === '/admin/sign-in') {
    return <>{children}</>
  }

  if (authLoading || !currentOperator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading operator session...</div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-900">Best viewed on desktop</div>
          <div className="mt-1 text-sm text-slate-500">
            The DOSI.AI Admin panel requires a screen width of at least 1024px.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Impersonation Banner */}
      <ImpersonationBanner state={impersonationState} onEnd={handleEndImpersonation} />

      {/* Top Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-800 px-4">
        {/* Left: Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">DOSI.AI</span>
          <span className="text-sm text-slate-400">Admin</span>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search workspaces by name, domain, or admin email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full border-slate-600 bg-slate-700 pl-9 text-[13px] text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right: Role badge, name, sign out */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn('text-[11px]', roleColors[currentOperator.role])}>
            {roleLabels[currentOperator.role]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-slate-200 hover:bg-slate-700 hover:text-white">
                {currentOperator.name}
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{currentOperator.name}</div>
                <div className="text-xs text-slate-500">{currentOperator.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        <AdminSidebar operatorRole={currentOperator.role} />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
