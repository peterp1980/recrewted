// Condensed from `supabase gen types` output for the recrewted project (Frankfurt).
// Regenerate and update after each migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type E = Database["public"]["Enums"]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: { created_at: string; display_name: string | null; external_account_id: string; id: string; organization_id: string | null; owner: E["account_owner"]; platform: string }
        Insert: { created_at?: string; display_name?: string | null; external_account_id: string; id?: string; organization_id?: string | null; owner: E["account_owner"]; platform: string }
        Update: { created_at?: string; display_name?: string | null; external_account_id?: string; id?: string; organization_id?: string | null; owner?: E["account_owner"]; platform?: string }
        Relationships: Rel[]
      }
      ad_costs: {
        Row: { campaign_id: string; clicks: number | null; cost_eur: number; day: string; impressions: number | null }
        Insert: { campaign_id: string; clicks?: number | null; cost_eur?: number; day: string; impressions?: number | null }
        Update: { campaign_id?: string; clicks?: number | null; cost_eur?: number; day?: string; impressions?: number | null }
        Relationships: Rel[]
      }
      ai_recommendations: {
        Row: { accepted: boolean | null; application_id: string | null; created_at: string; decided_by: string | null; id: string; input_ref: Json; kind: string; model: string; output: Json; vacancy_id: string | null }
        Insert: { accepted?: boolean | null; application_id?: string | null; created_at?: string; decided_by?: string | null; id?: string; input_ref: Json; kind: string; model: string; output: Json; vacancy_id?: string | null }
        Update: { accepted?: boolean | null; application_id?: string | null; created_at?: string; decided_by?: string | null; id?: string; input_ref?: Json; kind?: string; model?: string; output?: Json; vacancy_id?: string | null }
        Relationships: Rel[]
      }
      application_attribution: {
        Row: { ad_account_owner: E["account_owner"] | null; application_id: string; campaign_id: string | null; channel: string | null; click_id: string | null; click_id_expires_at: string | null; click_id_type: string | null; entry_point: E["entry_point"]; utm_campaign: string | null; utm_content: string | null; utm_medium: string | null; utm_source: string | null }
        Insert: { ad_account_owner?: E["account_owner"] | null; application_id: string; campaign_id?: string | null; channel?: string | null; click_id?: string | null; click_id_expires_at?: string | null; click_id_type?: string | null; entry_point: E["entry_point"]; utm_campaign?: string | null; utm_content?: string | null; utm_medium?: string | null; utm_source?: string | null }
        Update: { ad_account_owner?: E["account_owner"] | null; application_id?: string; campaign_id?: string | null; channel?: string | null; click_id?: string | null; click_id_expires_at?: string | null; click_id_type?: string | null; entry_point?: E["entry_point"]; utm_campaign?: string | null; utm_content?: string | null; utm_medium?: string | null; utm_source?: string | null }
        Relationships: [
          { foreignKeyName: "application_attribution_application_id_fkey"; columns: ["application_id"]; isOneToOne: true; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "application_attribution_campaign_id_fkey"; columns: ["campaign_id"]; isOneToOne: false; referencedRelation: "campaigns"; referencedColumns: ["id"] },
        ]
      }
      applications: {
        Row: { consent_version: string | null; knockout_reasons: Json; processing_consent_at: string | null; candidate_id: string; closed_at: string | null; cv_storage_path: string | null; duplicate_of: string | null; hired_at: string | null; id: string; score: number | null; shortlisted_at: string | null; status: E["application_status"]; submitted_at: string; vacancy_id: string }
        Insert: { consent_version?: string | null; knockout_reasons?: Json; processing_consent_at?: string | null; candidate_id: string; closed_at?: string | null; cv_storage_path?: string | null; duplicate_of?: string | null; hired_at?: string | null; id?: string; score?: number | null; shortlisted_at?: string | null; status?: E["application_status"]; submitted_at?: string; vacancy_id: string }
        Update: { consent_version?: string | null; knockout_reasons?: Json; processing_consent_at?: string | null; candidate_id?: string; closed_at?: string | null; cv_storage_path?: string | null; duplicate_of?: string | null; hired_at?: string | null; id?: string; score?: number | null; shortlisted_at?: string | null; status?: E["application_status"]; submitted_at?: string; vacancy_id?: string }
        Relationships: [
          { foreignKeyName: "applications_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] },
          { foreignKeyName: "applications_vacancy_id_fkey"; columns: ["vacancy_id"]; isOneToOne: false; referencedRelation: "vacancies"; referencedColumns: ["id"] },
          { foreignKeyName: "applications_duplicate_of_fkey"; columns: ["duplicate_of"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
        ]
      }
      audit_log: {
        Row: { action: string; actor: string | null; details: Json; id: number; occurred_at: string; record_id: string | null; table_name: string }
        Insert: { action: string; actor?: string | null; details?: Json; id?: never; occurred_at?: string; record_id?: string | null; table_name: string }
        Update: { action?: string; actor?: string | null; details?: Json; id?: never; occurred_at?: string; record_id?: string | null; table_name?: string }
        Relationships: []
      }
      campaigns: {
        Row: { ad_account_id: string | null; budget_eur: number | null; channel: string; created_at: string; ends_on: string | null; external_campaign_id: string | null; id: string; starts_on: string | null; status: E["campaign_status"]; target_qualified: number | null; utm_campaign: string | null; vacancy_id: string }
        Insert: { ad_account_id?: string | null; budget_eur?: number | null; channel: string; created_at?: string; ends_on?: string | null; external_campaign_id?: string | null; id?: string; starts_on?: string | null; status?: E["campaign_status"]; target_qualified?: number | null; utm_campaign?: string | null; vacancy_id: string }
        Update: { ad_account_id?: string | null; budget_eur?: number | null; channel?: string; created_at?: string; ends_on?: string | null; external_campaign_id?: string | null; id?: string; starts_on?: string | null; status?: E["campaign_status"]; target_qualified?: number | null; utm_campaign?: string | null; vacancy_id?: string }
        Relationships: Rel[]
      }
      candidates: {
        Row: { created_at: string; email: string | null; first_name: string; id: string; last_name: string; phone: string | null; talent_pool_consent_at: string | null }
        Insert: { created_at?: string; email?: string | null; first_name: string; id?: string; last_name: string; phone?: string | null; talent_pool_consent_at?: string | null }
        Update: { created_at?: string; email?: string | null; first_name?: string; id?: string; last_name?: string; phone?: string | null; talent_pool_consent_at?: string | null }
        Relationships: []
      }
      consents: {
        Row: { banner_version: string; decided_at: string; id: string; marketing: boolean; statistics: boolean; subject_ref: string; subject_type: string }
        Insert: { banner_version: string; decided_at?: string; id?: string; marketing?: boolean; statistics?: boolean; subject_ref: string; subject_type: string }
        Update: { banner_version?: string; decided_at?: string; id?: string; marketing?: boolean; statistics?: boolean; subject_ref?: string; subject_type?: string }
        Relationships: []
      }
      contracts: {
        Row: { created_at: string; id: string; kind: string; organization_id: string; pandadoc_document_id: string | null; signed_at: string | null; status: E["contract_status"]; storage_path: string | null; template_version: string; vacancy_id: string | null }
        Insert: { created_at?: string; id?: string; kind: string; organization_id: string; pandadoc_document_id?: string | null; signed_at?: string | null; status?: E["contract_status"]; storage_path?: string | null; template_version: string; vacancy_id?: string | null }
        Update: { created_at?: string; id?: string; kind?: string; organization_id?: string; pandadoc_document_id?: string | null; signed_at?: string | null; status?: E["contract_status"]; storage_path?: string | null; template_version?: string; vacancy_id?: string | null }
        Relationships: Rel[]
      }
      customer_feedback: {
        Row: { application_id: string; created_at: string; created_by: string; id: string; reason: string | null; verdict: E["feedback_verdict"] }
        Insert: { application_id: string; created_at?: string; created_by: string; id?: string; reason?: string | null; verdict: E["feedback_verdict"] }
        Update: { application_id?: string; created_at?: string; created_by?: string; id?: string; reason?: string | null; verdict?: E["feedback_verdict"] }
        Relationships: [
          { foreignKeyName: "customer_feedback_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "customer_feedback_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      customer_members: {
        Row: { organization_id: string; profile_id: string }
        Insert: { organization_id: string; profile_id: string }
        Update: { organization_id?: string; profile_id?: string }
        Relationships: [
          { foreignKeyName: "customer_members_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "customer_members_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      events: {
        Row: { ad_account_owner: E["account_owner"] | null; application_id: string | null; campaign_id: string | null; channel: string | null; entry_point: E["entry_point"] | null; event_id: string | null; id: number; name: string; occurred_at: string; organization_id: string | null; props: Json; vacancy_id: string | null }
        Insert: { ad_account_owner?: E["account_owner"] | null; application_id?: string | null; campaign_id?: string | null; channel?: string | null; entry_point?: E["entry_point"] | null; event_id?: string | null; id?: never; name: string; occurred_at?: string; organization_id?: string | null; props?: Json; vacancy_id?: string | null }
        Update: { ad_account_owner?: E["account_owner"] | null; application_id?: string | null; campaign_id?: string | null; channel?: string | null; entry_point?: E["entry_point"] | null; event_id?: string | null; id?: never; name?: string; occurred_at?: string; organization_id?: string | null; props?: Json; vacancy_id?: string | null }
        Relationships: Rel[]
      }
      job_ads: {
        Row: { approved_at: string | null; approved_by: string | null; body: string; channel: string; created_at: string; id: string; status: E["ad_status"]; template_key: string | null; title: string; vacancy_id: string; version: number }
        Insert: { approved_at?: string | null; approved_by?: string | null; body: string; channel: string; created_at?: string; id?: string; status?: E["ad_status"]; template_key?: string | null; title: string; vacancy_id: string; version?: number }
        Update: { approved_at?: string | null; approved_by?: string | null; body?: string; channel?: string; created_at?: string; id?: string; status?: E["ad_status"]; template_key?: string | null; title?: string; vacancy_id?: string; version?: number }
        Relationships: Rel[]
      }
      mail_outbox: {
        Row: { application_id: string | null; attempts: number; cancelled_at: string | null; created_at: string; data: Json; id: string; last_error: string | null; send_after: string; sent_at: string | null; template: string; to_email: string }
        Insert: { application_id?: string | null; attempts?: number; cancelled_at?: string | null; created_at?: string; data?: Json; id?: string; last_error?: string | null; send_after?: string; sent_at?: string | null; template: string; to_email: string }
        Update: { application_id?: string | null; attempts?: number; cancelled_at?: string | null; created_at?: string; data?: Json; id?: string; last_error?: string | null; send_after?: string; sent_at?: string | null; template?: string; to_email?: string }
        Relationships: [{ foreignKeyName: "mail_outbox_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] }]
      }
      organizations: {
        Row: { created_at: string; id: string; name: string; pipedrive_org_id: number | null; website: string | null }
        Insert: { created_at?: string; id?: string; name: string; pipedrive_org_id?: number | null; website?: string | null }
        Update: { created_at?: string; id?: string; name?: string; pipedrive_org_id?: number | null; website?: string | null }
        Relationships: []
      }
      postal_codes: {
        Row: { code: string; latitude: number; longitude: number; place: string }
        Insert: { code: string; latitude: number; longitude: number; place: string }
        Update: { code?: string; latitude?: number; longitude?: number; place?: string }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; full_name: string | null; id: string; role: E["user_role"] }
        Insert: { created_at?: string; full_name?: string | null; id: string; role?: E["user_role"] }
        Update: { created_at?: string; full_name?: string | null; id?: string; role?: E["user_role"] }
        Relationships: []
      }
      scorecard_criteria: {
        Row: { description: string | null; id: string; name: string; position: number; vacancy_id: string; weight: number }
        Insert: { description?: string | null; id?: string; name: string; position: number; vacancy_id: string; weight?: number }
        Update: { description?: string | null; id?: string; name?: string; position?: number; vacancy_id?: string; weight?: number }
        Relationships: [
          { foreignKeyName: "scorecard_criteria_vacancy_id_fkey"; columns: ["vacancy_id"]; isOneToOne: false; referencedRelation: "vacancies"; referencedColumns: ["id"] },
        ]
      }
      scorecard_ratings: {
        Row: { ai_suggested: boolean; application_id: string; criterion_id: string; rated_at: string; rated_by: string | null; rating: number; reason: string | null }
        Insert: { ai_suggested?: boolean; application_id: string; criterion_id: string; rated_at?: string; rated_by?: string | null; rating: number; reason?: string | null }
        Update: { ai_suggested?: boolean; application_id?: string; criterion_id?: string; rated_at?: string; rated_by?: string | null; rating?: number; reason?: string | null }
        Relationships: [
          { foreignKeyName: "scorecard_ratings_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "scorecard_ratings_criterion_id_fkey"; columns: ["criterion_id"]; isOneToOne: false; referencedRelation: "scorecard_criteria"; referencedColumns: ["id"] },
          { foreignKeyName: "scorecard_ratings_rated_by_fkey"; columns: ["rated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      screening_answers: {
        Row: { answer: Json; application_id: string; question_id: string }
        Insert: { answer: Json; application_id: string; question_id: string }
        Update: { answer?: Json; application_id?: string; question_id?: string }
        Relationships: [
          { foreignKeyName: "screening_answers_application_id_fkey"; columns: ["application_id"]; isOneToOne: false; referencedRelation: "applications"; referencedColumns: ["id"] },
          { foreignKeyName: "screening_answers_question_id_fkey"; columns: ["question_id"]; isOneToOne: false; referencedRelation: "screening_questions"; referencedColumns: ["id"] },
        ]
      }
      screening_questions: {
        Row: { id: string; kind: string; knockout_rule: Json | null; options: Json | null; position: number; question: string; vacancy_id: string }
        Insert: { id?: string; kind: string; knockout_rule?: Json | null; options?: Json | null; position: number; question: string; vacancy_id: string }
        Update: { id?: string; kind?: string; knockout_rule?: Json | null; options?: Json | null; position?: number; question?: string; vacancy_id?: string }
        Relationships: [
          { foreignKeyName: "screening_questions_vacancy_id_fkey"; columns: ["vacancy_id"]; isOneToOne: false; referencedRelation: "vacancies"; referencedColumns: ["id"] },
        ]
      }
      vacancies: {
        Row: { category: string | null; employer_visible: boolean; latitude: number | null; longitude: number | null; postal_code: string | null; created_at: string; created_by: string | null; employment_type: string | null; filled_at: string | null; id: string; location: string | null; organization_id: string; pipedrive_deal_id: number | null; pricing_model: E["pricing_model"] | null; published_at: string | null; remote: boolean; salary_max: number | null; salary_min: number | null; salary_period: string; status: E["vacancy_status"]; title: string; updated_at: string }
        Insert: { category?: string | null; employer_visible?: boolean; latitude?: number | null; longitude?: number | null; postal_code?: string | null; created_at?: string; created_by?: string | null; employment_type?: string | null; filled_at?: string | null; id?: string; location?: string | null; organization_id: string; pipedrive_deal_id?: number | null; pricing_model?: E["pricing_model"] | null; published_at?: string | null; remote?: boolean; salary_max?: number | null; salary_min?: number | null; salary_period?: string; status?: E["vacancy_status"]; title: string; updated_at?: string }
        Update: { category?: string | null; employer_visible?: boolean; latitude?: number | null; longitude?: number | null; postal_code?: string | null; created_at?: string; created_by?: string | null; employment_type?: string | null; filled_at?: string | null; id?: string; location?: string | null; organization_id?: string; pipedrive_deal_id?: number | null; pricing_model?: E["pricing_model"] | null; published_at?: string | null; remote?: boolean; salary_max?: number | null; salary_min?: number | null; salary_period?: string; status?: E["vacancy_status"]; title?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "vacancies_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "vacancies_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      vacancy_briefings: {
        Row: { data: Json; submitted_at: string | null; submitted_by: string | null; vacancy_id: string }
        Insert: { data?: Json; submitted_at?: string | null; submitted_by?: string | null; vacancy_id: string }
        Update: { data?: Json; submitted_at?: string | null; submitted_by?: string | null; vacancy_id?: string }
        Relationships: [
          { foreignKeyName: "vacancy_briefings_submitted_by_fkey"; columns: ["submitted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "vacancy_briefings_vacancy_id_fkey"; columns: ["vacancy_id"]; isOneToOne: true; referencedRelation: "vacancies"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      claim_due_mails: { Args: { max_count: number }; Returns: Database["public"]["Tables"]["mail_outbox"]["Row"][] }
      submit_application: { Args: { p: Json }; Returns: Json }
    }
    Enums: {
      account_owner: "recrewted" | "customer"
      ad_status: "draft" | "approved" | "published" | "archived"
      application_status: "new" | "knockout_failed" | "screening" | "qualified" | "rejected" | "shortlisted" | "interview" | "hired" | "withdrawn"
      campaign_status: "draft" | "running" | "paused" | "ended"
      contract_status: "draft" | "sent" | "viewed" | "completed" | "declined" | "expired"
      entry_point: "jobboard" | "career_page" | "widget" | "portal_feed"
      feedback_verdict: "fit" | "no_fit" | "interview" | "hired" | "rejected"
      pricing_model: "fixed_starter" | "fixed_pro" | "fixed_enterprise" | "service_fee_media_passthrough" | "service_fee_customer_media" | "success_fee" | "hybrid" | "subscription" | "self_service_platform" | "self_service_per_candidate" | "license"
      user_role: "admin" | "recruiter" | "customer"
      vacancy_status: "draft" | "contract_pending" | "active" | "paused" | "filled" | "closed"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

export const USER_ROLES = ["admin", "recruiter", "customer"] as const satisfies readonly Enums<"user_role">[]
