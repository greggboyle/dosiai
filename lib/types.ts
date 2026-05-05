// Shared types for DOSI.AI platform

export type Category = 'buy-side' | 'sell-side' | 'channel' | 'regulatory'

export interface MISScore {
  value: number // 0-100
  band: 'noise' | 'low' | 'medium' | 'high' | 'critical'
  confidence: 'high' | 'medium' | 'low'
  confidenceReason?: string
}

// C1: Full MIS score components matching spec §6.2
export interface MIScoreComponents {
  competitorProximity: number // 0-100
  recency: number // 0-100
  vendorConsensus: number // 0-100
  sourceAuthority: number // 0-100
  contentMagnitude: number // 0-100
  actionability: number // 0-100
  novelty: number // 0-100
  corroboration: number // 0-100
  relevanceToICP: number // 0-100
}

// Legacy score breakdown (kept for backward compatibility)
export interface ScoreBreakdown {
  competitorProximity: 'high' | 'medium' | 'low'
  recency: 'recent' | 'moderate' | 'old'
  vendorConsensus: string
  magnitude?: string
}

// C1: Reference types for normalized relationships
export interface CompetitorRef {
  id: string
  name: string
  logo?: string
}

export interface TopicRef {
  id: string
  name: string
}

export interface SourceRef {
  name: string
  url: string
  domain: string
  isPrimary?: boolean // UI can use this to highlight the primary source
}

// C1: Per-user item state (moved off the item record for multi-user workspaces)
export type ItemUserStatus = 'new' | 'read' | 'bookmarked'
export type ItemVisibility = 'feed' | 'filtered' | 'dismissed'

export interface ItemUserState {
  itemId: string
  userId: string
  status: ItemUserStatus
  visibility: ItemVisibility
  updatedAt: string
}

export interface FiveWH {
  who?: string
  what?: string
  when?: string
  where?: string
  why?: string
  how?: string
}

export interface Comment {
  id: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  content: string
  timestamp: string
  mentions?: string[]
}

export interface Source {
  name: string
  url: string
  domain: string
}

// Review metadata for customer voice items (E5: unified model)
export type ReviewPlatform = 'g2' | 'capterra' | 'trustradius' | 'app-store' | 'reddit' | 'hacker-news' | 'communities'
export type Sentiment = 'positive' | 'mixed' | 'negative' | 'neutral'

export interface ReviewMetadata {
  platform: ReviewPlatform
  sentiment: Sentiment
  rating?: number // e.g. 4.0 out of 5
  maxRating?: number // e.g. 5
  excerpt: string // 2-3 lines
  fullText: string
  reviewerRole?: string // e.g. "VP of Operations at mid-market shipper"
  reviewerCompany?: string
  subjectId: string // competitor ID or 'our-company'
  subjectName: string
  themes?: string[]
}

// C1: Subcategory for buy-side/sell-side further classification
export type ItemSubcategory = 'funding' | 'partnership' | 'product-launch' | 'pricing-change' | 'hiring' | 'earnings' | 'review' | 'news' | 'other'

export interface IntelligenceItem {
  id: string
  title: string
  summary: string
  content: string
  fullSummary?: string // 2-4 paragraph version
  mis: MISScore
  miScoreComponents?: MIScoreComponents // C1: Full breakdown for explanation
  miScoreExplanation?: string // C1: Human-readable explanation string
  scoreBreakdown?: ScoreBreakdown // Legacy, kept for backward compatibility
  fiveWH?: FiveWH
  category: Category
  subcategory?: ItemSubcategory // C1: Further classification
  sourceUrls: SourceRef[] // C1: Single array (was source + additionalSources)
  vendorConsensus: {
    confirmed: number
    total: number
  }
  relatedCompetitors: CompetitorRef[] // C1: Array (was single competitor)
  relatedTopics: TopicRef[] // C1: FK refs (was topics: string[])
  timestamp: string
  eventDate?: string
  relatedItems?: string[]
  comments?: Comment[]
  // C1: Review metadata for customer voice items (E5: unified model)
  reviewMetadata?: ReviewMetadata
  // C1: New fields from spec
  userNotes?: string // Analyst-attached notes
  reviewedBy?: string // userId for Review Queue flow
  reviewedAt?: string // timestamp for Review Queue flow
  
  // DEPRECATED: User state fields - moved to ItemUserState for multi-user support
  // These are kept temporarily for v1 single-user-per-workspace but should migrate
  /** @deprecated Use ItemUserState instead */
  isRead?: boolean
  /** @deprecated Use ItemUserState instead */
  isBookmarked?: boolean
  /** @deprecated Use ItemUserState instead */
  isWatching?: boolean
}

export interface CompetitorLeader {
  role: string
  name: string
  since: string
  linkedIn?: string
}

export interface CompetitorProduct {
  name: string
  description?: string
}

export interface ReviewExcerpt {
  id: string
  content: string
  rating: number
  platform: string
  sentiment: 'positive' | 'mixed' | 'negative'
  date: string
}

export interface SentimentSummary {
  positive: number
  mixed: number
  negative: number
  netChange: number // vs prior period
  period: string
}

export interface WinLossSummary {
  winRate: number
  trend: number // change vs prior period
  period: string
  topWinReasons: string[]
  topLossReasons: string[]
  totalOutcomes: number
}

export interface CompetitorNote {
  id: string
  content: string // markdown
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

// C2: Competitor tier enum (spec values)
export type CompetitorTier = 'primary_direct' | 'secondary_indirect' | 'emerging' | 'adjacent' | 'watching'

// C2: Competitor pricing model enum (spec values)
export type CompetitorPricingModel = 'subscription' | 'usage' | 'freemium' | 'enterprise_contract' | 'hybrid' | 'unknown'

// C2: Competitor status enum
export type CompetitorStatus = 'active' | 'archived' | 'rejected'

export interface Competitor {
  id: string
  name: string
  logo?: string
  website: string
  description: string
  overallMIS: MISScore
  recentActivity: number // count of items in last 7 days
  status: CompetitorStatus // C2: Replaces watchStatus
  // Extended profile fields
  tier?: CompetitorTier // C2: Updated enum
  segments?: string[]
  positioning?: string
  icp?: string
  pricingModel?: CompetitorPricingModel // C2: Updated enum
  pricingNotes?: string
  founded?: number
  hq?: string
  employeeEstimate?: number
  fundingStatus?: string
  leadership?: CompetitorLeader[]
  products?: CompetitorProduct[]
  strengths?: string[]
  weaknesses?: string[]
  lastProfileRefresh?: string
  sentimentSummary?: SentimentSummary
  winLossSummary?: WinLossSummary
  recentReviews?: ReviewExcerpt[]
  notes?: CompetitorNote[]
  linkedBriefIds?: string[]
  // C2: New fields from spec
  discoveryConfidence?: number // 0-1 for auto-discovered competitors
  aiDraftedFields?: string[] // Field names populated by AI, not yet human-confirmed
  lastSignificantChangeAt?: string // Drives staleness banner
}

export interface Brief {
  id: string
  title: string
  audience: 'leadership' | 'sales' | 'product' | 'general'
  priority: 'critical' | 'high' | 'medium'
  summary: string
  body: string // markdown content
  cadence?: 'weekly' | 'monthly' | 'ad-hoc' // optional, for recurring briefs
  createdAt: string
  updatedAt: string
  publishedAt?: string
  wordCount: number
  author: {
    id: string
    name: string
    avatar?: string
  }
  linkedItemIds: string[] // intelligence item IDs
  status: 'draft' | 'published' | 'archived'
  aiDrafted: boolean
  humanReviewed: boolean
  comments?: Comment[]
}

// C3: Battle card section types (spec vocabulary)
export type BattleCardSectionType = 
  | 'tldr'
  | 'why_we_win'
  | 'why_they_win'
  | 'objections'
  | 'trap_setters'
  | 'proof_points'
  | 'pricing'
  | 'recent_activity'
  | 'talk_tracks'

// C3: Battle card status
export type BattleCardStatus = 'draft' | 'published' | 'archived'

// C3: Individual section entity (separate from parent for section-level tracking)
export interface BattleCardSection {
  id: string
  battleCardId: string
  type: BattleCardSectionType
  content: string // markdown or structured JSON depending on type
  lastReviewedAt?: string
  lastContributorId?: string
  lastContributorName?: string
  aiDrafted: boolean
  sourceItemIds: string[] // Intelligence items that informed this section
  feedbackCount: number // Win/loss outcomes that cited this section
  gapCount: number // Times this section was cited as "missing" in loss feedback
  order: number // For UI ordering
}

// C3: Interview state for section-by-section drafting
export interface BattleCardInterviewState {
  currentSectionType?: BattleCardSectionType
  completedSections: BattleCardSectionType[]
  lastInteractionAt?: string
  interviewerId?: string
}

// C3: Battle card parent entity
export interface BattleCard {
  id: string
  competitorId: string
  competitorName: string
  segmentTag?: string // C3: Segment variants - one card per (competitor, segment) tuple
  status: BattleCardStatus // C3: Status
  version: number // C3: Incremented on publish
  ownerId?: string // C3: Owner
  ownerName?: string
  freshnessScore?: number // C3: Computed freshness (0-100)
  interviewState?: BattleCardInterviewState // C3: Per-section interview progress
  sections: BattleCardSection[] // C3: Array of section entities
  createdAt: string
  updatedAt: string
  publishedAt?: string
  
  // Legacy fields kept for backward compatibility during migration
  /** @deprecated Use sections array instead */
  legacySections?: {
    overview?: string
    strengths?: string[]
    weaknesses?: string[]
    positioning?: string
    objectionHandling?: { objection: string; response: string }[]
    talkingPoints?: string[]
  }
}

// C4: Outcome values (no_decision uses underscore in DB, camelCase in TS is fine)
export type WinLossOutcomeValue = 'won' | 'lost' | 'no_decision' | 'disqualified'

// C4: Deal size band enum (spec values - broader range)
export type DealSizeBand = '<10k' | '10k-50k' | '50k-250k' | '250k-1m' | '>1m' | 'unknown'

// C4: Source of the record
export type WinLossSource = 'manual' | 'crm_sync'

// C4: Renamed from WinLossRecord to WinLossOutcome
export interface WinLossOutcome {
  id: string
  dealName?: string // E2 decision: kept from v0, spec doesn't have it but useful
  outcome: WinLossOutcomeValue
  primaryCompetitorId: string
  primaryCompetitorName: string
  additionalCompetitorIds?: string[]
  additionalCompetitorNames?: string[]
  dealSize?: number // C4: Renamed from acv
  dealSizeBand?: DealSizeBand // C4: Updated enum
  segment: string // e.g. 'Enterprise', 'Mid-Market', 'SMB'
  closeDate: string
  reasonSummary: string // 1-2 sentences
  reasonTags: string[]
  battleCardConsulted?: {
    battleCardId: string
    battleCardName: string
    mostHelpfulSection?: BattleCardSectionType // C4: Use section type
    whatWasMissing?: string
  }
  notes?: string
  createdBy: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  // C4: New fields from spec
  source: WinLossSource // manual or crm_sync
  externalId?: string // CRM mapping (Salesforce Opportunity ID, HubSpot Deal ID)
  dealStageAtClose?: string // Informational
}

// Legacy type alias for backward compatibility
/** @deprecated Use WinLossOutcome instead */
export type WinLossRecord = WinLossOutcome

// Customer Voice summary (computed from filtered IntelligenceItems with reviewMetadata)
export interface CustomerVoiceSummary {
  positive: number
  mixed: number
  negative: number
  neutral: number
  total: number
  netSentiment: number // e.g. +24 or -8
  netChange: number // vs prior period
  period: string // e.g. "30 days"
  topThemes: { theme: string; count: number }[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'analyst' | 'pmm' | 'sales_leader' | 'executive' | 'ae'
}

// C7: Workspace member management types
export type WorkspaceMemberRole = 'admin' | 'member' | 'viewer'

export interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: WorkspaceMemberRole
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  joinedAt: string
  invitedBy?: string
  lastActiveAt?: string
}

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface WorkspaceInvite {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceMemberRole
  status: InviteStatus
  invitedBy: {
    id: string
    name: string
  }
  invitedAt: string
  expiresAt: string
  acceptedAt?: string
  token?: string // For signed-link-based acceptance
}

export type SweepStatus = 'healthy' | 'degraded' | 'failing' | 'never-run' | 'paused'

export interface Workspace {
  id: string
  name: string
  logo?: string
  sweepStatus: SweepStatus
}

// Channel types
export type ChannelType = 'publication' | 'conference' | 'podcast' | 'webinar' | 'community' | 'analyst-firm'

export interface ChannelAppearance {
  competitorId: string
  competitorName: string
  count: number
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  itemCount: number // items in the time window
  mostRecentDate: string
  appearances: ChannelAppearance[]
  authorityScore: number // 1-10
  url?: string
}

export interface ChannelItem {
  id: string
  channelId: string
  channelName: string
  title: string
  summary: string
  competitorId: string
  competitorName: string
  timestamp: string
  mis: MISScore
  sourceUrl?: string
}

export interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}

// Topic types
export type TopicImportance = 'critical' | 'high' | 'medium' | 'low'

// C5: Topic status enum (more extensible than boolean isArchived)
export type TopicStatus = 'active' | 'archived'

// Used for computed sparkline data (E6: computed on demand, not stored)
export interface TopicActivityDataPoint {
  week: string // e.g. "W1", "W2", etc.
  count: number
}

export interface Topic {
  id: string
  name: string
  description: string
  importance: TopicImportance
  searchSeeds: string[] // C5: Renamed from seeds
  // Note: activitySparkline is computed on demand, not stored (E6)
  itemCountLast7Days: number
  itemCountLast7DaysChange: number // e.g. +3, -2, 0
  itemCountLast30Days: number
  itemCountLast30DaysChange: number
  // C5: linkedCompetitorIds/Names are computed via join, not stored in DB
  // Kept in TS type for UI rendering convenience
  linkedCompetitorIds: string[]
  linkedCompetitorNames: string[]
  /** Same-workspace topic IDs this theme overlaps with (cross-tags). */
  relatedTopicIds?: string[]
  relatedTopicNames?: string[]
  createdAt: string
  updatedAt: string
  status: TopicStatus // C5: Replaces isArchived
}

// Helper function to get MIS band from value
export function getMISBand(value: number): MISScore['band'] {
  if (value <= 20) return 'noise'
  if (value <= 40) return 'low'
  if (value <= 60) return 'medium'
  if (value <= 80) return 'high'
  return 'critical'
}

// Helper function to get MIS color class
export function getMISColorClass(band: MISScore['band']): string {
  const colors = {
    noise: 'bg-mis-noise text-white',
    low: 'bg-mis-low text-white',
    medium: 'bg-mis-medium text-foreground',
    high: 'bg-mis-high text-foreground',
    critical: 'bg-mis-critical text-white',
  }
  return colors[band]
}

// Helper for relative timestamps
export function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to get category display info
export function getCategoryInfo(category: Category): { label: string; color: string } {
  const info = {
    'buy-side': { label: 'Buy-side', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    'sell-side': { label: 'Sell-side', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
    'channel': { label: 'Channel', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    'regulatory': { label: 'Regulatory', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  }
  return info[category]
}
