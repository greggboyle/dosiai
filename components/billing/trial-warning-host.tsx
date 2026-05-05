'use client'

import * as React from 'react'
import { TrialWarningModal, type WarningThreshold } from '@/components/billing/trial-warning-modal'
import { dismissTrialWarning } from '@/lib/billing/trial-warning-actions'
import {
  modalStepToTrial,
  sortTrialThresholds,
  trialThresholdRank,
  trialToModalStep,
  type TrialThreshold,
} from '@/lib/billing/trial-warning-data'
import type { TrialUsageStats, WorkspaceSubscription } from '@/lib/billing-types'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function TrialWarningHost(props: {
  workspaceId: string
  subscription: WorkspaceSubscription
  usageStats: TrialUsageStats
  initialPending: TrialThreshold[]
}) {
  const { workspaceId, subscription, usageStats, initialPending } = props

  const [open, setOpen] = React.useState(false)
  const [alertThreshold, setAlertThreshold] = React.useState<WarningThreshold | null>(null)

  const queueRef = React.useRef<TrialThreshold[]>([])
  const openRef = React.useRef(false)
  const pendingRef = React.useRef(initialPending)
  pendingRef.current = initialPending

  React.useEffect(() => {
    openRef.current = open
  }, [open])

  const showNext = React.useCallback(() => {
    const q = queueRef.current
    if (!q.length) {
      setOpen(false)
      setAlertThreshold(null)
      openRef.current = false
      return
    }
    const next = q.shift()!
    queueRef.current = q
    setAlertThreshold(trialToModalStep(next))
    setOpen(true)
    openRef.current = true
  }, [])

  const enqueue = React.useCallback(
    (th: TrialThreshold) => {
      const q = queueRef.current
      if (q.includes(th)) return
      q.push(th)
      q.sort((a, b) => trialThresholdRank(a) - trialThresholdRank(b))
      queueRef.current = q
      if (!openRef.current) showNext()
    },
    [showNext]
  )

  React.useEffect(() => {
    if (subscription.planId !== 'trial') return
    queueRef.current = sortTrialThresholds([...pendingRef.current])
    showNext()
  }, [workspaceId, subscription.planId, showNext])

  React.useEffect(() => {
    if (subscription.planId !== 'trial') return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase.channel(`workspace:${workspaceId}`)
    channel.on('broadcast', { event: 'trial.warning' }, (message: unknown) => {
      const m = message as { payload?: Record<string, unknown>; threshold?: TrialThreshold }
      const inner = (m && typeof m === 'object' && 'payload' in m ? m.payload : m) as Record<string, unknown> | undefined
      const th = (inner?.threshold ?? m?.threshold) as TrialThreshold | undefined
      if (!th) return
      if (th !== 't_minus_7' && th !== 't_minus_3' && th !== 't_minus_1') return
      enqueue(th)
    })
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [workspaceId, subscription.planId, enqueue])

  const onDismiss = React.useCallback(
    async (step: WarningThreshold) => {
      try {
        await dismissTrialWarning(modalStepToTrial(step))
      } catch {
        // still advance queue so UX is not stuck
      }
      setOpen(false)
      setAlertThreshold(null)
      openRef.current = false
      showNext()
    },
    [showNext]
  )

  const onUpgrade = React.useCallback(() => {
    window.location.href = '/pricing'
  }, [])

  if (subscription.planId !== 'trial') {
    return null
  }

  return (
    <TrialWarningModal
      subscription={subscription}
      usageStats={usageStats}
      isOpen={open}
      alertThreshold={alertThreshold ?? undefined}
      onDismiss={onDismiss}
      onUpgrade={onUpgrade}
    />
  )
}
