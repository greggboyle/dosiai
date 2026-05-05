export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      workspace: {
        Row: {
          id: string
          name: string
          domain: string | null
          logo_url: string | null
          plan: 'trial' | 'starter' | 'team' | 'business' | 'enterprise'
          trial_ends_at: string | null
          status: 'active' | 'read_only' | 'grace_period' | 'cancelled'
          billing_cycle: 'monthly' | 'annual' | null
          next_billing_date: string | null
          grace_period_ends_at: string | null
          ai_cost_mtd_cents: number
          ai_cost_ceiling_cents: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          logo_url?: string | null
          plan?: 'trial' | 'starter' | 'team' | 'business' | 'enterprise'
          trial_ends_at?: string | null
          status?: 'active' | 'read_only' | 'grace_period' | 'cancelled'
          billing_cycle?: 'monthly' | 'annual' | null
          next_billing_date?: string | null
          grace_period_ends_at?: string | null
          ai_cost_mtd_cents?: number
          ai_cost_ceiling_cents?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          last_active_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace']['Insert']>
      }
      workspace_member: {
        Row: {
          user_id: string
          workspace_id: string
          role: 'admin' | 'analyst' | 'viewer'
          seat_type: 'analyst' | 'viewer'
          invited_by: string | null
          joined_at: string
          last_active_at: string
          status: 'active' | 'invited' | 'suspended'
        }
        Insert: {
          user_id: string
          workspace_id: string
          role: 'admin' | 'analyst' | 'viewer'
          seat_type?: 'analyst' | 'viewer'
          invited_by?: string | null
          joined_at?: string
          last_active_at?: string
          status?: 'active' | 'invited' | 'suspended'
        }
        Update: Partial<Database['public']['Tables']['workspace_member']['Insert']>
      }
      workspace_invite: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: 'admin' | 'analyst' | 'viewer'
          invited_by: string | null
          token: string
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at: string
          expires_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role: 'admin' | 'analyst' | 'viewer'
          invited_by?: string | null
          token?: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at?: string
          expires_at: string
          accepted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['workspace_invite']['Insert']>
      }
      operator_user: {
        Row: {
          id: string
          name: string
          email: string
          role: 'viewer' | 'analyst' | 'admin' | 'owner'
          mfa_enabled: boolean
          status: 'active' | 'disabled'
          last_sign_in_at: string | null
          created_at: string
          created_by_id: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: 'viewer' | 'analyst' | 'admin' | 'owner'
          mfa_enabled?: boolean
          status?: 'active' | 'disabled'
          last_sign_in_at?: string | null
          created_at?: string
          created_by_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['operator_user']['Insert']>
      }
      workspace_override: {
        Row: {
          id: string
          workspace_id: string
          type: 'analyst_seat_cap' | 'competitor_cap' | 'topic_cap' | 'battle_card_cap' | 'ai_cost_ceiling_cents'
          original_value: string | null
          override_value: string
          reason: string
          is_active: boolean
          expires_at: string | null
          created_by_id: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          type: 'analyst_seat_cap' | 'competitor_cap' | 'topic_cap' | 'battle_card_cap' | 'ai_cost_ceiling_cents'
          original_value?: string | null
          override_value: string
          reason: string
          is_active?: boolean
          expires_at?: string | null
          created_by_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_override']['Insert']>
      }
      audit_log_entry: {
        Row: {
          id: string
          timestamp: string
          severity: 'info' | 'warn' | 'error' | 'critical'
          category: 'system' | 'auth' | 'billing' | 'membership' | 'override' | 'operator' | 'workspace'
          operator_id: string | null
          operator_role: string
          action: string
          target_type: string
          target_id: string
          target_name: string
          reason: string | null
          before_value: string | null
          after_value: string | null
          ip_address: string | null
          session_id: string | null
        }
        Insert: {
          id?: string
          timestamp?: string
          severity?: 'info' | 'warn' | 'error' | 'critical'
          category: 'system' | 'auth' | 'billing' | 'membership' | 'override' | 'operator' | 'workspace'
          operator_id?: string | null
          operator_role: string
          action: string
          target_type: string
          target_id: string
          target_name: string
          reason?: string | null
          before_value?: string | null
          after_value?: string | null
          ip_address?: string | null
          session_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['audit_log_entry']['Insert']>
      }
      competitor: {
        Row: {
          id: string
          workspace_id: string
          name: string
          website: string | null
          source: string | null
          status: 'active' | 'archived' | 'rejected'
          tier: 'primary_direct' | 'secondary_indirect' | 'emerging' | 'adjacent' | 'watching'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          website?: string | null
          source?: string | null
          status?: 'active' | 'archived' | 'rejected'
          tier?: 'primary_direct' | 'secondary_indirect' | 'emerging' | 'adjacent' | 'watching'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['competitor']['Insert']>
      }
      topic: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          status: 'active' | 'archived'
          created_by_id: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          status?: 'active' | 'archived'
          created_by_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['topic']['Insert']>
      }
      workspace_profile: {
        Row: {
          workspace_id: string
          company_name: string | null
          company_website: string | null
          company_summary: string | null
          icp: string | null
          industry: string | null
          geography: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          workspace_id: string
          company_name?: string | null
          company_website?: string | null
          company_summary?: string | null
          icp?: string | null
          industry?: string | null
          geography?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_profile']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
