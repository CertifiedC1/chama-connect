export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_access_logs: {
        Row: {
          action: string
          created_at: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_lockouts: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chama_settings: {
        Row: {
          chama_logo: string | null
          chama_name: string
          contribution_amount: number | null
          contribution_frequency: string | null
          created_at: string
          description: string | null
          enable_auto_fines: boolean | null
          enable_loan_auto_fines: boolean | null
          grace_period_days: number | null
          id: string
          interest_type: string | null
          late_contribution_fine: number | null
          late_loan_fine: number | null
          loan_eligibility_months: number | null
          loan_interest_rate: number | null
          max_loan_amount: number | null
          max_repayment_months: number | null
          meeting_day: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          chama_logo?: string | null
          chama_name?: string
          contribution_amount?: number | null
          contribution_frequency?: string | null
          created_at?: string
          description?: string | null
          enable_auto_fines?: boolean | null
          enable_loan_auto_fines?: boolean | null
          grace_period_days?: number | null
          id?: string
          interest_type?: string | null
          late_contribution_fine?: number | null
          late_loan_fine?: number | null
          loan_eligibility_months?: number | null
          loan_interest_rate?: number | null
          max_loan_amount?: number | null
          max_repayment_months?: number | null
          meeting_day?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          chama_logo?: string | null
          chama_name?: string
          contribution_amount?: number | null
          contribution_frequency?: string | null
          created_at?: string
          description?: string | null
          enable_auto_fines?: boolean | null
          enable_loan_auto_fines?: boolean | null
          grace_period_days?: number | null
          id?: string
          interest_type?: string | null
          late_contribution_fine?: number | null
          late_loan_fine?: number | null
          loan_eligibility_months?: number | null
          loan_interest_rate?: number | null
          max_loan_amount?: number | null
          max_repayment_months?: number | null
          meeting_day?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          contribution_date: string
          contribution_type: string
          created_at: string
          description: string | null
          id: string
          mpesa_reference: string | null
          payment_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date?: string
          contribution_type?: string
          created_at?: string
          description?: string | null
          id?: string
          mpesa_reference?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          contribution_type?: string
          created_at?: string
          description?: string | null
          id?: string
          mpesa_reference?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fines: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          fine_type: string
          id: string
          paid_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fine_type: string
          id?: string
          paid_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fine_type?: string
          id?: string
          paid_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          mpesa_reference: string | null
          payment_method: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          mpesa_reference?: string | null
          payment_method?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          mpesa_reference?: string | null
          payment_method?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          due_date: string
          id: string
          interest_amount: number
          interest_rate: number
          phone_number: string
          purpose: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          due_date: string
          id?: string
          interest_amount?: number
          interest_rate?: number
          phone_number: string
          purpose?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          due_date?: string
          id?: string
          interest_amount?: number
          interest_rate?: number
          phone_number?: string
          purpose?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          mpesa_reference: string | null
          phone_number: string
          related_id: string | null
          related_type: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          mpesa_reference?: string | null
          phone_number: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          mpesa_reference?: string | null
          phone_number?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          join_date: string
          member_number: string | null
          phone_number: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          join_date?: string
          member_number?: string | null
          phone_number: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          join_date?: string
          member_number?: string | null
          phone_number?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "treasurer" | "member"
      member_status: "active" | "suspended" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "treasurer", "member"],
      member_status: ["active", "suspended", "pending"],
    },
  },
} as const
