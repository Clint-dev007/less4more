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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          account_name: string
          account_no: string
          bank_name: string
          id: number
          updated_at: string
        }
        Insert: {
          account_name?: string
          account_no?: string
          bank_name?: string
          id?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_no?: string
          bank_name?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          id: string
          ref: string
          status: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          id?: string
          ref: string
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          id?: string
          ref?: string
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          end_at: string
          expected_return: number
          id: string
          plan_id: string
          start_at: string
          status: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          end_at: string
          expected_return: number
          id?: string
          plan_id: string
          start_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          end_at?: string
          expected_return?: number
          id?: string
          plan_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["plan_category"]
          created_at: string
          description: string
          duration_days: number
          icon: string
          id: string
          min_amount: number
          name: string
          roi: number
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["plan_category"]
          created_at?: string
          description?: string
          duration_days: number
          icon?: string
          id?: string
          min_amount: number
          name: string
          roi: number
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["plan_category"]
          created_at?: string
          description?: string
          duration_days?: number
          icon?: string
          id?: string
          min_amount?: number
          name?: string
          roi?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_name: string | null
          account_no: string | null
          balance: number
          bank_name: string | null
          id: string
          invested: number
          joined_at: string
          name: string
          phone: string | null
          ref_code: string
          referred_by: string | null
          returns: number
          status: string
        }
        Insert: {
          account_name?: string | null
          account_no?: string | null
          balance?: number
          bank_name?: string | null
          id: string
          invested?: number
          joined_at?: string
          name?: string
          phone?: string | null
          ref_code: string
          referred_by?: string | null
          returns?: number
          status?: string
        }
        Update: {
          account_name?: string | null
          account_no?: string | null
          balance?: number
          bank_name?: string | null
          id?: string
          invested?: number
          joined_at?: string
          name?: string
          phone?: string | null
          ref_code?: string
          referred_by?: string | null
          returns?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_paid: number
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          bonus_paid?: number
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          bonus_paid?: number
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_no: string
          amount: number
          bank_name: string
          created_at: string
          decided_at: string | null
          id: string
          payout_day: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          account_name: string
          account_no: string
          amount: number
          bank_name: string
          created_at?: string
          decided_at?: string | null
          id?: string
          payout_day: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          account_name?: string
          account_no?: string
          amount?: number
          bank_name?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          payout_day?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_deposit: { Args: { _deposit_id: string }; Returns: undefined }
      approve_withdrawal: { Args: { _id: string }; Returns: undefined }
      claim_first_admin: { Args: never; Returns: undefined }
      create_investment: {
        Args: { _amount: number; _plan_id: string }
        Returns: string
      }
      create_withdrawal: {
        Args: { _amount: number; _payout_day: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_deposit: { Args: { _deposit_id: string }; Returns: undefined }
      reject_withdrawal: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      deposit_status: "pending" | "approved" | "rejected"
      investment_status: "active" | "completed" | "cancelled"
      plan_category:
        | "thrift"
        | "agriculture"
        | "property"
        | "finance"
        | "poultry"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      deposit_status: ["pending", "approved", "rejected"],
      investment_status: ["active", "completed", "cancelled"],
      plan_category: [
        "thrift",
        "agriculture",
        "property",
        "finance",
        "poultry",
      ],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
