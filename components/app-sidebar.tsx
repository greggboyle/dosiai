'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  Hash,
  FileText,
  Swords,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronDown,
  Plus,
  ChevronsUpDown,
  CreditCard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { TrialPill, SidebarTrialCard } from '@/components/billing/trial-banner'
import { AIUsageIndicator } from '@/components/billing/ai-usage-indicator'
import type { WorkspaceSubscription, AIUsageState } from '@/lib/billing-types'
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

// Simplified navigation for Tier 1 & 2 personas (mid-market PMMs)
// Core items are always visible, advanced items hidden in "More" for Tier 3
const coreNavItems = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Feed', href: '/feed', icon: Newspaper, badge: 12 },
  { label: 'Competitors', href: '/competitors', icon: Building2 },
  { label: 'Battle Cards', href: '/battle-cards', icon: Swords },
]

const moreNavItems = [
  { label: 'Topics', href: '/topics', icon: Hash },
  { label: 'Briefs', href: '/briefs', icon: FileText, badge: 2 },
  { label: 'Win/Loss', href: '/win-loss', icon: TrendingUp },
  { label: 'Reviews', href: '/customer-voice', icon: MessageSquare },
]

// Mock data - replace with real data
const currentWorkspace = {
  id: '1',
  name: 'Acme Corp',
  logo: undefined,
}

const currentUser = {
  id: '1',
  name: 'Sarah Chen',
  email: 'sarah@acme.com',
  avatar: undefined,
  role: 'analyst' as const,
}

const workspaces = [
  { id: '1', name: 'Acme Corp', logo: undefined },
  { id: '2', name: 'Acme Labs', logo: undefined },
]

// Mock subscription state - in production this comes from context/API
const mockSubscription: WorkspaceSubscription = {
  planId: 'trial',
  status: 'active',
  billingInterval: null,
  currentPeriodStart: '2026-04-22T00:00:00Z',
  currentPeriodEnd: '2026-05-06T00:00:00Z',
  cancelAtPeriodEnd: false,
  trialStatus: 'active',
  trialStartedAt: '2026-04-22T00:00:00Z',
  trialEndsAt: '2026-05-06T00:00:00Z',
  trialDaysRemaining: 8,
  aiCostUsedCents: 1200,
  aiCostCeilingCents: 4000,
  aiCostPercentUsed: 30,
  analystSeatsUsed: 1,
  analystSeatsLimit: 1,
}

const mockAIUsage: AIUsageState = {
  currentMonthCents: 1200,
  ceilingCents: 4000,
  percentUsed: 30,
  isAtSoftLimit: false,
  isAtHardLimit: false,
  nextResetDate: 'May 6',
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

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
                    {currentWorkspace.name.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{currentWorkspace.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Workspace</span>
                      {!collapsed && <TrialPill subscription={mockSubscription} collapsed={collapsed} />}
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
                {workspaces.map((workspace) => (
                  <DropdownMenuItem key={workspace.id} className="gap-2 p-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground text-xs font-semibold">
                      {workspace.name.charAt(0)}
                    </div>
                    {workspace.name}
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
        {/* Core Navigation - Always visible, friendly for Tier 1 & 2 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map((item) => (
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
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* More - Expandable for advanced features (Tier 2 & 3) */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs">More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moreNavItems.map((item) => (
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
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Trial card above footer - for trial workspaces */}
      {!collapsed && <SidebarTrialCard subscription={mockSubscription} collapsed={collapsed} />}

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
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {currentUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser.role}</span>
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
                <DropdownMenuItem className="gap-2 p-2">
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2 text-destructive">
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
