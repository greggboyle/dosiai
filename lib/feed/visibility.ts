import type { Database } from '@/lib/supabase/types'

export type IntelligenceVisibility = Database['public']['Tables']['intelligence_item']['Row']['visibility']

export function determineVisibility(score: number, threshold: number): IntelligenceVisibility {
  return score >= threshold ? 'feed' : 'filtered'
}
