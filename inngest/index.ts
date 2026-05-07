import { learnFromOutcome } from '@/inngest/functions/learn-from-outcome'
import { trialWarningCheck } from '@/inngest/functions/trial-warning-check'
import { refreshBattleCardRecentActivity } from '@/inngest/functions/refresh-battle-card-recent-activity'
import { synthesizeBattleCardSection } from '@/inngest/functions/synthesize-battle-card-section'
import { draftBrief } from '@/inngest/functions/draft-brief'
import { draftBattleCard } from '@/inngest/functions/draft-battle-card'
import { trialExpirationCheck } from '@/inngest/functions/trial-expiration-check'
import { monthlyCostReset } from '@/inngest/functions/monthly-cost-reset'
import { populateCompetitorProfile } from '@/inngest/functions/populate-competitor-profile'
import { reembedCorpus } from '@/inngest/functions/reembed-corpus'
import {
  embedResourceChunks,
  extractResourceText,
  indexUploadedResource,
} from '@/inngest/functions/index-resource-document'
import { runSweep } from '@/inngest/sweeps/run-sweep'
import { scheduleSweeps } from '@/inngest/sweeps/schedule-sweeps'

export const functions = [
  learnFromOutcome,
  trialWarningCheck,
  synthesizeBattleCardSection,
  refreshBattleCardRecentActivity,
  draftBrief,
  draftBattleCard,
  trialExpirationCheck,
  monthlyCostReset,
  populateCompetitorProfile,
  reembedCorpus,
  indexUploadedResource,
  extractResourceText,
  embedResourceChunks,
  runSweep,
  scheduleSweeps,
]
