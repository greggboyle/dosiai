import { learnFromOutcome } from '@/inngest/functions/learn-from-outcome'
import { trialWarningCheck } from '@/inngest/functions/trial-warning-check'
import { refreshBattleCardRecentActivity } from '@/inngest/functions/refresh-battle-card-recent-activity'
import { synthesizeBattleCardSection } from '@/inngest/functions/synthesize-battle-card-section'
import { draftBriefByKindFunctions } from '@/inngest/functions/draft-brief-by-kind'
import { draftBriefRequestedCompat } from '@/inngest/functions/draft-brief-requested-compat'
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
import { runHiringSweep } from '@/inngest/sweeps/run-hiring-sweep'
import { scheduleSweeps } from '@/inngest/sweeps/schedule-sweeps'
import { scheduleHiringSweeps } from '@/inngest/sweeps/schedule-hiring-sweeps'
import { backfillBriefSummaryBatch } from '@/inngest/functions/backfill-brief-summary'

export const functions = [
  learnFromOutcome,
  trialWarningCheck,
  synthesizeBattleCardSection,
  refreshBattleCardRecentActivity,
  draftBriefRequestedCompat,
  ...draftBriefByKindFunctions,
  draftBattleCard,
  trialExpirationCheck,
  monthlyCostReset,
  populateCompetitorProfile,
  reembedCorpus,
  indexUploadedResource,
  extractResourceText,
  embedResourceChunks,
  runSweep,
  runHiringSweep,
  scheduleSweeps,
  scheduleHiringSweeps,
  backfillBriefSummaryBatch,
]
