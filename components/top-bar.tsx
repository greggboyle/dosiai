'use client'

import * as React from 'react'
import { Search, Bell, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SweepStatus {
  status: 'healthy' | 'degraded' | 'running'
  lastRun?: string
}

interface TopBarProps {
  sweepStatus?: SweepStatus
  className?: string
}

const statusColors = {
  healthy: 'bg-positive',
  degraded: 'bg-warning',
  running: 'bg-accent animate-pulse',
}

const statusLabels = {
  healthy: 'All systems operational',
  degraded: 'Some sources delayed',
  running: 'Sweep in progress',
}

export function TopBar({ sweepStatus = { status: 'healthy' }, className }: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-border px-4',
        className
      )}
    >
      {/* Left: Sidebar toggle */}
      <SidebarTrigger className="-ml-1" />

      {/* Center: Search */}
      <div className="flex flex-1 items-center justify-center max-w-xl mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search intelligence, competitors, briefs..."
            className="h-9 w-full pl-9 pr-4 bg-secondary border-0"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right: Status, Notifications, Theme */}
      <div className="flex items-center gap-1">
        {/* Sweep Status Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <span
                className={cn(
                  'size-2 rounded-full',
                  statusColors[sweepStatus.status]
                )}
                aria-hidden="true"
              />
              <span className="sr-only">{statusLabels[sweepStatus.status]}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{statusLabels[sweepStatus.status]}</p>
            {sweepStatus.lastRun && (
              <p className="text-xs text-muted-foreground">
                Last sweep: {sweepStatus.lastRun}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
              <span className="sr-only">Notifications</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">3 new notifications</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              {mounted ? (
                theme === 'dark' ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )
              ) : (
                <div className="size-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
