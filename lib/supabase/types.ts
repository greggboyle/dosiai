export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AiPurposeDb =
  | 'sweep_buy'
  | 'sweep_sell'
  | 'sweep_channel'
  | 'sweep_regulatory'
  | 'sweep_umbrella'
  | 'sweep_self'
  | 'sweep_topic'
  | 'competitor_profile_refresh'
  | 'scoring'
  | 'embedding'
  | 'brief_drafting'
  | 'battle_card_interview'
  | 'battle_card_draft'

export type AiVendorDb = 'openai' | 'anthropic' | 'xai'

export type PromptTemplateStatusDb = 'active' | 'draft' | 'archived'

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
          last_sweep_at: string | null
          review_queue_threshold: number
          scoring_weights: Json
          auto_briefs_auto_approve: boolean
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
          last_sweep_at?: string | null
          review_queue_threshold?: number
          scoring_weights?: Json
          auto_briefs_auto_approve?: boolean
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
          category:
            | 'system'
            | 'auth'
            | 'billing'
            | 'membership'
            | 'override'
            | 'operator'
            | 'workspace'
            | 'ai_routing'
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
          category:
            | 'system'
            | 'auth'
            | 'billing'
            | 'membership'
            | 'override'
            | 'operator'
            | 'workspace'
            | 'ai_routing'
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
          positioning: string | null
          icp_description: string | null
          pricing_model: string | null
          pricing_notes: string | null
          founded_year: number | null
          hq_location: string | null
          employee_count_estimate: number | null
          funding_status: string | null
          leadership: Json | null
          products: Json | null
          strengths: string[] | null
          weaknesses: string[] | null
          segment_relevance: string[] | null
          discovery_confidence: number | null
          ai_drafted_fields: string[] | null
          embedding: string | null
          last_profile_refresh: string | null
          last_significant_change_at: string | null
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
          positioning?: string | null
          icp_description?: string | null
          pricing_model?: string | null
          pricing_notes?: string | null
          founded_year?: number | null
          hq_location?: string | null
          employee_count_estimate?: number | null
          funding_status?: string | null
          leadership?: Json | null
          products?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          segment_relevance?: string[] | null
          discovery_confidence?: number | null
          ai_drafted_fields?: string[] | null
          embedding?: string | null
          last_profile_refresh?: string | null
          last_significant_change_at?: string | null
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
          search_seeds: string[] | null
          importance: 'critical' | 'high' | 'medium' | 'low'
          embedding: string | null
          related_topic_ids: string[]
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          status?: 'active' | 'archived'
          created_by_id: string
          created_at?: string
          search_seeds?: string[] | null
          importance?: 'critical' | 'high' | 'medium' | 'low'
          embedding?: string | null
          related_topic_ids?: string[]
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
          legal_name: string | null
          primary_url: string | null
          product_names: string[] | null
          brand_aliases: string[] | null
          founded_year: number | null
          headquarters: string | null
          geography_served: string[] | null
          icp_description: string | null
          value_props: string[] | null
          differentiators: string[] | null
          social_handles: Json | null
          press_kit_url: string | null
          created_at: string
          updated_at: string
          embedding: string | null
          differentiators_embedding: string | null
          segment_relevance: string[] | null
          summary_embedding: string | null
          value_prop_embedding: string | null
          updated_by: string | null
        }
        Insert: {
          workspace_id: string
          company_name?: string | null
          company_website?: string | null
          company_summary?: string | null
          icp?: string | null
          industry?: string | null
          geography?: string | null
          legal_name?: string | null
          primary_url?: string | null
          product_names?: string[] | null
          brand_aliases?: string[] | null
          founded_year?: number | null
          headquarters?: string | null
          geography_served?: string[] | null
          icp_description?: string | null
          value_props?: string[] | null
          differentiators?: string[] | null
          social_handles?: Json | null
          press_kit_url?: string | null
          created_at?: string
          updated_at?: string
          embedding?: string | null
          differentiators_embedding?: string | null
          segment_relevance?: string[] | null
          summary_embedding?: string | null
          value_prop_embedding?: string | null
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['workspace_profile']['Insert']>
      }
      ai_routing_config: {
        Row: {
          purpose: AiPurposeDb
          mode: string
          rules: Json
          updated_at: string
          updated_by_operator_id: string | null
        }
        Insert: {
          purpose: AiPurposeDb
          mode: string
          rules?: Json
          updated_at?: string
          updated_by_operator_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['ai_routing_config']['Insert']>
      }
      prompt_template: {
        Row: {
          id: string
          name: string
          purpose: AiPurposeDb
          vendor: AiVendorDb
          status: PromptTemplateStatusDb
          version: number
          content: string
          draft_content: string | null
          draft_note: string | null
          deployment_history: Json
          ab_test: Json | null
          variables: Json
          created_at: string
          updated_at: string
          updated_by_operator_id: string | null
        }
        Insert: {
          id?: string
          name: string
          purpose: AiPurposeDb
          vendor: AiVendorDb
          status?: PromptTemplateStatusDb
          version?: number
          content?: string
          draft_content?: string | null
          draft_note?: string | null
          deployment_history?: Json
          ab_test?: Json | null
          variables?: Json
          created_at?: string
          updated_at?: string
          updated_by_operator_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['prompt_template']['Insert']>
      }
      embedding_migration_state: {
        Row: {
          id: string
          old_model: string
          new_model: string
          progress_pct: number
          status: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          old_model: string
          new_model: string
          progress_pct?: number
          status?: string
          updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['embedding_migration_state']['Insert']>
      }
      sweep: {
        Row: {
          id: string
          workspace_id: string
          trigger: 'manual' | 'scheduled'
          trigger_user_id: string | null
          started_at: string
          completed_at: string | null
          status: 'running' | 'completed' | 'failed' | 'cancelled'
          vendors_used: Json
          items_found: number
          items_new: number
          items_dedup_collapsed: number
          errors: Json
          ai_cost_cents: number
        }
        Insert: {
          id?: string
          workspace_id: string
          trigger: 'manual' | 'scheduled'
          trigger_user_id?: string | null
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'completed' | 'failed' | 'cancelled'
          vendors_used?: Json
          items_found?: number
          items_new?: number
          items_dedup_collapsed?: number
          errors?: Json
          ai_cost_cents?: number
        }
        Update: Partial<Database['public']['Tables']['sweep']['Insert']>
      }
      vendor_call: {
        Row: {
          id: string
          workspace_id: string
          purpose: AiPurposeDb
          vendor: AiVendorDb
          model: string
          prompt_template_id: string | null
          prompt_template_version: number | null
          request_tokens: number
          response_tokens: number
          cost_cents: number
          latency_ms: number | null
          success: boolean
          error_message: string | null
          citation_count: number
          response_payload: Json | null
          sweep_id: string | null
          called_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          purpose: AiPurposeDb
          vendor: AiVendorDb
          model: string
          prompt_template_id?: string | null
          prompt_template_version?: number | null
          request_tokens?: number
          response_tokens?: number
          cost_cents?: number
          latency_ms?: number | null
          success?: boolean
          error_message?: string | null
          citation_count?: number
          response_payload?: Json | null
          sweep_id?: string | null
          called_at?: string
        }
        Update: Partial<Database['public']['Tables']['vendor_call']['Insert']>
      }
      intelligence_item: {
        Row: {
          id: string
          workspace_id: string
          sweep_id: string | null
          title: string
          summary: string
          content: string
          full_summary: string | null
          category: string
          subcategory: string | null
          five_wh: Json | null
          source_urls: Json
          source_type: string | null
          entities_mentioned: Json | null
          vendor_consensus: Json
          related_competitors: string[]
          related_topics: string[]
          mi_score: number
          mi_score_band: string
          mi_score_components: Json
          mi_score_explanation: string | null
          confidence: 'low' | 'medium' | 'high'
          confidence_reason: string | null
          review_metadata: Json | null
          embedding: string | null
          visibility: 'feed' | 'filtered' | 'dismissed'
          event_at: string
          ingested_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          user_notes: string | null
          dedup_of_item_id: string | null
          is_about_self: boolean
          ingestion_purpose: AiPurposeDb | null
        }
        Insert: {
          id?: string
          workspace_id: string
          sweep_id?: string | null
          title: string
          summary?: string
          content?: string
          full_summary?: string | null
          category: string
          subcategory?: string | null
          five_wh?: Json | null
          source_urls?: Json
          source_type?: string | null
          entities_mentioned?: Json | null
          vendor_consensus?: Json
          related_competitors?: string[]
          related_topics?: string[]
          mi_score: number
          mi_score_band: string
          mi_score_components?: Json
          mi_score_explanation?: string | null
          confidence: 'low' | 'medium' | 'high'
          confidence_reason?: string | null
          review_metadata?: Json | null
          embedding?: string | null
          visibility?: 'feed' | 'filtered' | 'dismissed'
          event_at?: string
          ingested_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          user_notes?: string | null
          dedup_of_item_id?: string | null
          is_about_self?: boolean
          ingestion_purpose?: AiPurposeDb | null
        }
        Update: Partial<Database['public']['Tables']['intelligence_item']['Insert']>
      }
      intelligence_item_vendor_call: {
        Row: {
          intelligence_item_id: string
          vendor_call_id: string
          role: string
        }
        Insert: {
          intelligence_item_id: string
          vendor_call_id: string
          role?: string
        }
        Update: Partial<Database['public']['Tables']['intelligence_item_vendor_call']['Insert']>
      }
      item_user_state: {
        Row: {
          item_id: string
          user_id: string
          status: 'new' | 'read' | 'bookmarked'
          is_watching: boolean
          updated_at: string
        }
        Insert: {
          item_id: string
          user_id: string
          status?: 'new' | 'read' | 'bookmarked'
          is_watching?: boolean
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['item_user_state']['Insert']>
      }
      suggested_competitor: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description_snippet: string | null
          embedding: string | null
          source_item_ids: string[]
          status: 'pending' | 'confirmed' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description_snippet?: string | null
          embedding?: string | null
          source_item_ids?: string[]
          status?: 'pending' | 'confirmed' | 'rejected'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['suggested_competitor']['Insert']>
      }
      brief: {
        Row: {
          id: string
          workspace_id: string
          author_id: string
          title: string
          summary: string
          body: string
          word_count: number
          brief_kind:
            | 'manual'
            | 'sweep_summary'
            | 'daily_summary'
            | 'weekly_intelligence'
            | 'regulatory_summary'
            | 'competitor'
          audience: 'leadership' | 'sales' | 'product' | 'general'
          priority: 'critical' | 'high' | 'medium'
          status: 'draft' | 'published' | 'archived'
          ai_drafted: boolean
          human_reviewed: boolean
          linked_item_ids: string[]
          linked_topic_ids: string[]
          linked_competitor_ids: string[]
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          author_id: string
          title?: string
          summary?: string
          body?: string
          word_count?: number
          brief_kind?:
            | 'manual'
            | 'sweep_summary'
            | 'daily_summary'
            | 'weekly_intelligence'
            | 'regulatory_summary'
            | 'competitor'
          audience?: 'leadership' | 'sales' | 'product' | 'general'
          priority?: 'critical' | 'high' | 'medium'
          status?: 'draft' | 'published' | 'archived'
          ai_drafted?: boolean
          human_reviewed?: boolean
          linked_item_ids?: string[]
          linked_topic_ids?: string[]
          linked_competitor_ids?: string[]
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['brief']['Insert']>
      }
      workspace_member_brief_subscription: {
        Row: {
          user_id: string
          workspace_id: string
          brief_kind:
            | 'manual'
            | 'sweep_summary'
            | 'daily_summary'
            | 'weekly_intelligence'
            | 'regulatory_summary'
            | 'competitor'
          subscribed: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          workspace_id: string
          brief_kind:
            | 'manual'
            | 'sweep_summary'
            | 'daily_summary'
            | 'weekly_intelligence'
            | 'regulatory_summary'
            | 'competitor'
          subscribed?: boolean
          updated_at?: string
        }
        Update: Partial<{
          subscribed: boolean
          updated_at: string
        }>
      }
      brief_user_read: {
        Row: {
          user_id: string
          brief_id: string
          read_at: string
        }
        Insert: {
          user_id: string
          brief_id: string
          read_at?: string
        }
        Update: Partial<Database['public']['Tables']['brief_user_read']['Insert']>
      }
      user_notification: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          type: 'brief_ready'
          title: string
          body: string | null
          brief_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          type?: 'brief_ready'
          title: string
          body?: string | null
          brief_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_notification']['Insert']>
      }
      brief_comment: {
        Row: {
          id: string
          brief_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          brief_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['brief_comment']['Insert']>
      }
      battle_card: {
        Row: {
          id: string
          workspace_id: string
          competitor_id: string
          segment_tag: string | null
          status: 'draft' | 'published' | 'archived'
          version: number
          owner_id: string | null
          freshness_score: number | null
          interview_state: Json
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          competitor_id: string
          segment_tag?: string | null
          status?: 'draft' | 'published' | 'archived'
          version?: number
          owner_id?: string | null
          freshness_score?: number | null
          interview_state?: Json
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['battle_card']['Insert']>
      }
      battle_card_section: {
        Row: {
          id: string
          battle_card_id: string
          section_type:
            | 'tldr'
            | 'why_we_win'
            | 'why_they_win'
            | 'objections'
            | 'trap_setters'
            | 'proof_points'
            | 'pricing'
            | 'recent_activity'
            | 'talk_tracks'
          content: Json
          display_order: number
          last_reviewed_at: string | null
          last_contributor_id: string | null
          ai_drafted: boolean
          source_item_ids: string[]
          feedback_count: number
          gap_count: number
        }
        Insert: {
          id?: string
          battle_card_id: string
          section_type:
            | 'tldr'
            | 'why_we_win'
            | 'why_they_win'
            | 'objections'
            | 'trap_setters'
            | 'proof_points'
            | 'pricing'
            | 'recent_activity'
            | 'talk_tracks'
          content?: Json
          display_order?: number
          last_reviewed_at?: string | null
          last_contributor_id?: string | null
          ai_drafted?: boolean
          source_item_ids?: string[]
          feedback_count?: number
          gap_count?: number
        }
        Update: Partial<Database['public']['Tables']['battle_card_section']['Insert']>
      }
      battle_card_generation_run: {
        Row: {
          id: string
          workspace_id: string
          battle_card_id: string
          created_by: string | null
          routing_purpose: AiPurposeDb
          vendor: AiVendorDb | null
          model: string | null
          status: 'queued' | 'processing' | 'ready' | 'failed'
          include_intel: boolean
          selected_resource_ids: string[]
          input_snapshot: Json
          output_snapshot: Json | null
          error: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          battle_card_id: string
          created_by?: string | null
          routing_purpose?: AiPurposeDb
          vendor?: AiVendorDb | null
          model?: string | null
          status?: 'queued' | 'processing' | 'ready' | 'failed'
          include_intel?: boolean
          selected_resource_ids?: string[]
          input_snapshot?: Json
          output_snapshot?: Json | null
          error?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['battle_card_generation_run']['Insert']>
      }
      battle_card_section_recommendation: {
        Row: {
          id: string
          workspace_id: string
          battle_card_id: string
          battle_card_section_id: string
          run_id: string
          section_type: string
          suggested_content: string
          rationale: string | null
          citations: Json
          confidence: number | null
          status: 'open' | 'accepted' | 'dismissed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          battle_card_id: string
          battle_card_section_id: string
          run_id: string
          section_type: string
          suggested_content: string
          rationale?: string | null
          citations?: Json
          confidence?: number | null
          status?: 'open' | 'accepted' | 'dismissed'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['battle_card_section_recommendation']['Insert']>
      }
      battle_card_share_link: {
        Row: {
          id: string
          workspace_id: string
          battle_card_id: string
          token: string
          expires_at: string
          created_by: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          battle_card_id: string
          token: string
          expires_at: string
          created_by?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['battle_card_share_link']['Insert']>
      }
      workspace_reason_tag: {
        Row: {
          id: string
          workspace_id: string
          tag: string
          usage_count: number
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          tag: string
          usage_count?: number
          archived?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_reason_tag']['Insert']>
      }
      win_loss_outcome: {
        Row: {
          id: string
          workspace_id: string
          deal_name: string
          competitor_id: string
          additional_competitor_ids: string[]
          outcome: 'won' | 'lost' | 'no_decision' | 'disqualified'
          deal_size_cents: number | null
          deal_size_band: string | null
          segment: string | null
          deal_stage_at_close: string | null
          close_date: string
          reason_summary: string
          reason_tags: string[]
          battle_card_id: string | null
          most_helpful_section_type:
            | 'tldr'
            | 'why_we_win'
            | 'why_they_win'
            | 'objections'
            | 'trap_setters'
            | 'proof_points'
            | 'pricing'
            | 'recent_activity'
            | 'talk_tracks'
            | null
          missing_section_feedback: string | null
          notes: string | null
          source: 'manual' | 'crm_sync'
          external_id: string | null
          submitted_by: string
          submitted_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          deal_name: string
          competitor_id: string
          additional_competitor_ids?: string[]
          outcome: 'won' | 'lost' | 'no_decision' | 'disqualified'
          deal_size_cents?: number | null
          deal_size_band?: string | null
          segment?: string | null
          deal_stage_at_close?: string | null
          close_date?: string
          reason_summary: string
          reason_tags?: string[]
          battle_card_id?: string | null
          most_helpful_section_type?:
            | 'tldr'
            | 'why_we_win'
            | 'why_they_win'
            | 'objections'
            | 'trap_setters'
            | 'proof_points'
            | 'pricing'
            | 'recent_activity'
            | 'talk_tracks'
            | null
          missing_section_feedback?: string | null
          notes?: string | null
          source?: 'manual' | 'crm_sync'
          external_id?: string | null
          submitted_by: string
          submitted_at?: string
        }
        Update: Partial<Database['public']['Tables']['win_loss_outcome']['Insert']>
      }
      battle_card_section_gap_note: {
        Row: {
          id: string
          workspace_id: string
          battle_card_section_id: string
          win_loss_outcome_id: string | null
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          battle_card_section_id: string
          win_loss_outcome_id?: string | null
          note: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['battle_card_section_gap_note']['Insert']>
      }
      channel: {
        Row: {
          id: string
          workspace_id: string
          name: string
          type:
            | 'publication'
            | 'conference'
            | 'podcast'
            | 'webinar'
            | 'community'
            | 'analyst_firm'
            | 'other'
          url: string | null
          authority_score: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          type?:
            | 'publication'
            | 'conference'
            | 'podcast'
            | 'webinar'
            | 'community'
            | 'analyst_firm'
            | 'other'
          url?: string | null
          authority_score?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['channel']['Insert']>
      }
      channel_appearance: {
        Row: {
          item_id: string
          channel_id: string
          appearance_at: string
        }
        Insert: {
          item_id: string
          channel_id: string
          appearance_at?: string
        }
        Update: Partial<Database['public']['Tables']['channel_appearance']['Insert']>
      }
      trial_warning_seen: {
        Row: {
          workspace_id: string
          threshold: 't_minus_7' | 't_minus_3' | 't_minus_1'
          seen_at: string
          dismissed: boolean
        }
        Insert: {
          workspace_id: string
          threshold: 't_minus_7' | 't_minus_3' | 't_minus_1'
          seen_at?: string
          dismissed?: boolean
        }
        Update: Partial<Database['public']['Tables']['trial_warning_seen']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
