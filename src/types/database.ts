export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Hand-authored placeholder matching supabase/migrations/0001_initial_schema.sql.
// Replace with Supabase generated types after the schema is applied.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          user_id: string
          name: string
          label: string | null
          latitude: number
          longitude: number
          elevation_m: number
          timezone: string | null
          country: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          label?: string | null
          latitude: number
          longitude: number
          elevation_m?: number
          timezone?: string | null
          country?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          label?: string | null
          latitude?: number
          longitude?: number
          elevation_m?: number
          timezone?: string | null
          country?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      satellites: {
        Row: {
          id: string
          norad_id: number
          name: string
          category: string | null
          description: string | null
          is_curated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          norad_id: number
          name: string
          category?: string | null
          description?: string | null
          is_curated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          norad_id?: number
          name?: string
          category?: string | null
          description?: string | null
          is_curated?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: "owner" | "member"
          created_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: "owner" | "member"
          created_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: "owner" | "member"
          created_at?: string
        }
        Relationships: []
      }
      group_subscriptions: {
        Row: {
          id: string
          group_id: string
          location_id: string
          satellite_id: string
          pass_type: "radio" | "visual"
          min_elevation: number
          min_visibility_seconds: number
          days_ahead: number
          alerts_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          location_id: string
          satellite_id: string
          pass_type: "radio" | "visual"
          min_elevation?: number
          min_visibility_seconds?: number
          days_ahead?: number
          alerts_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          location_id?: string
          satellite_id?: string
          pass_type?: "radio" | "visual"
          min_elevation?: number
          min_visibility_seconds?: number
          days_ahead?: number
          alerts_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pass_predictions: {
        Row: {
          id: string
          satellite_id: string
          location_id: string
          pass_type: "radio" | "visual"
          source: string
          start_utc: string
          max_utc: string
          end_utc: string
          start_az: number | null
          start_az_compass: string | null
          start_el: number | null
          max_az: number | null
          max_az_compass: string | null
          max_el: number | null
          end_az: number | null
          end_az_compass: string | null
          end_el: number | null
          magnitude: number | null
          duration_seconds: number | null
          score: "excellent" | "good" | "low" | null
          daylight_label:
            | "daylight"
            | "night"
            | "civil_twilight"
            | "nautical_twilight"
            | "astronomical_twilight"
            | "unknown"
            | null
          daylight_context: Json | null
          daylight_fetched_at: string | null
          raw: Json | null
          fetched_at: string
          cache_key: string
          created_at: string
        }
        Insert: {
          id?: string
          satellite_id: string
          location_id: string
          pass_type: "radio" | "visual"
          source?: string
          start_utc: string
          max_utc: string
          end_utc: string
          start_az?: number | null
          start_az_compass?: string | null
          start_el?: number | null
          max_az?: number | null
          max_az_compass?: string | null
          max_el?: number | null
          end_az?: number | null
          end_az_compass?: string | null
          end_el?: number | null
          magnitude?: number | null
          duration_seconds?: number | null
          score?: "excellent" | "good" | "low" | null
          daylight_label?:
            | "daylight"
            | "night"
            | "civil_twilight"
            | "nautical_twilight"
            | "astronomical_twilight"
            | "unknown"
            | null
          daylight_context?: Json | null
          daylight_fetched_at?: string | null
          raw?: Json | null
          fetched_at?: string
          cache_key: string
          created_at?: string
        }
        Update: {
          id?: string
          satellite_id?: string
          location_id?: string
          pass_type?: "radio" | "visual"
          source?: string
          start_utc?: string
          max_utc?: string
          end_utc?: string
          start_az?: number | null
          start_az_compass?: string | null
          start_el?: number | null
          max_az?: number | null
          max_az_compass?: string | null
          max_el?: number | null
          end_az?: number | null
          end_az_compass?: string | null
          end_el?: number | null
          magnitude?: number | null
          duration_seconds?: number | null
          score?: "excellent" | "good" | "low" | null
          daylight_label?:
            | "daylight"
            | "night"
            | "civil_twilight"
            | "nautical_twilight"
            | "astronomical_twilight"
            | "unknown"
            | null
          daylight_context?: Json | null
          daylight_fetched_at?: string | null
          raw?: Json | null
          fetched_at?: string
          cache_key?: string
          created_at?: string
        }
        Relationships: []
      }
      pass_rsvps: {
        Row: {
          id: string
          group_id: string
          pass_prediction_id: string
          user_id: string
          status: "going" | "maybe" | "skipping"
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          pass_prediction_id: string
          user_id: string
          status: "going" | "maybe" | "skipping"
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          pass_prediction_id?: string
          user_id?: string
          status?: "going" | "maybe" | "skipping"
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          id: string
          user_id: string
          group_id: string
          email_enabled: boolean
          lead_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          email_enabled?: boolean
          lead_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          email_enabled?: boolean
          lead_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          id: string
          user_id: string
          group_id: string
          pass_prediction_id: string
          channel: string
          lead_minutes: number
          status: "pending" | "sent" | "failed"
          sent_at: string | null
          provider_message_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          pass_prediction_id: string
          channel?: string
          lead_minutes: number
          status?: "pending" | "sent" | "failed"
          sent_at?: string | null
          provider_message_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          pass_prediction_id?: string
          channel?: string
          lead_minutes?: number
          status?: "pending" | "sent" | "failed"
          sent_at?: string | null
          provider_message_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      api_fetch_logs: {
        Row: {
          id: string
          provider: string
          endpoint: string
          status: string
          status_code: number | null
          message: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          endpoint: string
          status: string
          status_code?: number | null
          message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          endpoint?: string
          status?: string
          status_code?: number | null
          message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_group_member: {
        Args: { target_group_id: string; target_user_id?: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { target_group_id: string; target_user_id?: string }
        Returns: boolean
      }
      location_belongs_to_group_member: {
        Args: { target_location_id: string; target_group_id: string }
        Returns: boolean
      }
      is_prediction_in_group: {
        Args: { target_group_id: string; target_pass_prediction_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
