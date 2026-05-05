'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

// Operator roles
type OperatorRole = 'support' | 'ops' | 'engineer' | 'admin' | 'auditor'

interface OperatorUser {
  id: string
  name: string
  email: string
  role: OperatorRole
}

// Mock current operator
const currentOperator: OperatorUser = {
  id: 'op-1',
  name: 'Alex Chen',
  email: 'alex@dosi.ai',
  role: 'admin',
}

// Impersonation state (would come from context in real app)
interface ImpersonationState {
  isActive: boolean
  workspaceName?: string
  workspaceId?: string
  startedAt?: string
  operatorName?: string
}

const mockImpersonation: ImpersonationState = {
  isActive: false,
}

const roleLabels: Record<OperatorRole, string> = {
  support: 'Support',
  ops: 'Ops',
  engineer: 'Engineer',
  admin: 'Admin',
  auditor: 'Auditor',
}

const roleColors: Record<OperatorRole, string> = {
  support: 'bg-blue-100 text-blue-700 border-blue-200',
  ops: 'bg-amber-100 text-amber-700 border-amber-200',
  engineer: 'bg-green-100 text-green-700 border-green-200',
  admin: 'bg-red-100 text-red-700 border-red-200',
  auditor: 'bg-slate-100 text-slate-700 border-slate-200',
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
      { label: 'AI Routing', href: '/admin/ai-routing', icon: Route, roles: ['engineer', 'admin'] },
      { label: 'Prompts', href: '/admin/prompts', icon: FileCode, roles: ['engineer', 'admin'] },
      { label: 'Vendor Health', href: '/admin/vendor-health', icon: Activity },
      { label: 'System Health', href: '/admin/system-health', icon: Heart },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Impersonation Sessions', href: '/admin/impersonation', icon: UserCheck },
      { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText },
      { label: 'Operator Users', href: '/admin/operators', icon: Users, roles: ['admin'] },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Credits & Overrides', href: '/admin/billing', icon: CreditCard, roles: ['ops', 'admin'] },
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

function ImpersonationBanner({ state }: { state: ImpersonationState }) {
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
      >
        <X className="size-3 mr-1" />
        End impersonation
      </Button>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      <ImpersonationBanner state={mockImpersonation} />

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
              <DropdownMenuItem className="text-red-600">
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
