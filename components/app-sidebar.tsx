'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  Hash,
  FileText,
  Swords,
  TrendingUp,
  MessageSquare,
  FolderOpen,
  Settings,
  ChevronDown,
  Plus,
  ChevronsUpDown,
  CreditCard,
  User,
  Sparkles,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { TrialPill, SidebarTrialCard } from '@/components/billing/trial-banner'
import type { WorkspaceSubscription } from '@/lib/billing-types'
import type { SidebarNavBadgeCounts } from '@/lib/dashboard/queries'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Core nav: primary workflows. "More" holds secondary destinations.
type NavItemConfig = {
  label: string
  href: string
  icon: LucideIcon
  badge?: (counts: SidebarNavBadgeCounts) => number | undefined
}

const coreNavItems: NavItemConfig[] = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  {
    label: 'My Market Briefs',
    href: '/my-briefs',
    icon: Sparkles,
    badge: (c) => (c.myMarketBriefsUnread > 0 ? c.myMarketBriefsUnread : undefined),
  },
  {
    label: 'All Intel',
    href: '/intel',
    icon: Newspaper,
    badge: (c) => (c.feedReviewQueue > 0 ? c.feedReviewQueue : undefined),
  },
  { label: 'Competitors', href: '/competitors', icon: Building2 },
  { label: 'Battle Cards', href: '/battle-cards', icon: Swords },
]

const moreNavItems: NavItemConfig[] = [
  { label: 'Topics', href: '/topics', icon: Hash },
  {
    label: 'All Briefs',
    href: '/briefs',
    icon: FileText,
    badge: (c) => (c.briefCount > 0 ? c.briefCount : undefined),
  },
  { label: 'Win/Loss', href: '/win-loss', icon: TrendingUp },
  { label: 'Reviews', href: '/customer-voice', icon: MessageSquare },
  { label: 'Resources', href: '/resources', icon: FolderOpen },
]

interface AppSidebarProps {
  workspace: { id: string; name: string; logo?: string }
  member: { name: string; email: string; role: 'admin' | 'analyst' | 'viewer' }
  subscription: WorkspaceSubscription
  navBadgeCounts: SidebarNavBadgeCounts
}

export function AppSidebar({ workspace, member, subscription, navBadgeCounts }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null)

  React.useEffect(() => {
    setSupabase(createSupabaseBrowserClient())
  }, [])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-accent text-accent-foreground font-semibold">
                    {workspace.name.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{workspace.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Workspace</span>
                      {!collapsed && <TrialPill subscription={subscription} collapsed={collapsed} />}
                    </div>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {[workspace].map((item) => (
                  <DropdownMenuItem key={item.id} className="gap-2 p-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground text-xs font-semibold">
                      {item.name.charAt(0)}
                    </div>
                    {item.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2">
                  <Plus className="size-4" />
                  Add workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map((item) => {
                const badge = item.badge?.(navBadgeCounts)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge != null && badge > 0 ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs">More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moreNavItems.map((item) => {
                const badge = item.badge?.(navBadgeCounts)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge != null && badge > 0 ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Trial card above footer - for trial workspaces */}
      {!collapsed && <SidebarTrialCard subscription={subscription} collapsed={collapsed} />}

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={undefined} alt={member.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link href="/settings/billing">
                    <CreditCard className="size-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link href="/settings/members">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link href="/profile">
                    <User className="size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 p-2">
                  <Link href="/settings/company-profile">
                    <Building2 className="size-4" />
                    Company Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2 text-destructive" onClick={signOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
