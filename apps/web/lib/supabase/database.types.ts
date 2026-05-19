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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at_utc: string
          default_payment_account_name: string | null
          default_payment_account_number: string | null
          default_payment_method: string | null
          default_payment_notes: string | null
          default_payment_payee_name: string | null
          default_payment_qr_data_url: string | null
          email: string
          id: string
          name: string
          username: string | null
        }
        Insert: {
          created_at_utc?: string
          default_payment_account_name?: string | null
          default_payment_account_number?: string | null
          default_payment_method?: string | null
          default_payment_notes?: string | null
          default_payment_payee_name?: string | null
          default_payment_qr_data_url?: string | null
          email: string
          id: string
          name: string
          username?: string | null
        }
        Update: {
          created_at_utc?: string
          default_payment_account_name?: string | null
          default_payment_account_number?: string | null
          default_payment_method?: string | null
          default_payment_notes?: string | null
          default_payment_payee_name?: string | null
          default_payment_qr_data_url?: string | null
          email?: string
          id?: string
          name?: string
          username?: string | null
        }
        Relationships: []
      }
      bill_fees: {
        Row: {
          bill_id: string
          fee_type: number
          id: string
          name: string
          value: number
        }
        Insert: {
          bill_id: string
          fee_type: number
          id?: string
          name: string
          value: number
        }
        Update: {
          bill_id?: string
          fee_type?: number
          id?: string
          name?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_fees_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_item_responsibilities: {
        Row: {
          bill_item_id: string
          id: string
          participant_id: string
        }
        Insert: {
          bill_item_id: string
          id?: string
          participant_id: string
        }
        Update: {
          bill_item_id?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_item_responsibilities_bill_item_id_fkey"
            columns: ["bill_item_id"]
            isOneToOne: false
            referencedRelation: "bill_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_item_responsibilities_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          amount: number
          bill_id: string
          description: string
          id: string
        }
        Insert: {
          amount: number
          bill_id: string
          description: string
          id?: string
        }
        Update: {
          amount?: number
          bill_id?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_shares: {
        Row: {
          bill_id: string
          fee_amount: number
          id: string
          participant_id: string
          pre_fee_amount: number
          total_share_amount: number
          weight: number
        }
        Insert: {
          bill_id: string
          fee_amount: number
          id?: string
          participant_id: string
          pre_fee_amount: number
          total_share_amount: number
          weight: number
        }
        Update: {
          bill_id?: string
          fee_amount?: number
          id?: string
          participant_id?: string
          pre_fee_amount?: number
          total_share_amount?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_shares_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_shares_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          created_at_utc: string
          currency_code: string
          group_id: string
          id: string
          primary_payer_participant_id: string
          reference_image_data_url: string | null
          split_mode: number
          store_name: string
          transaction_date_utc: string
          updated_at_utc: string
        }
        Insert: {
          created_at_utc?: string
          currency_code?: string
          group_id: string
          id?: string
          primary_payer_participant_id: string
          reference_image_data_url?: string | null
          split_mode: number
          store_name: string
          transaction_date_utc: string
          updated_at_utc?: string
        }
        Update: {
          created_at_utc?: string
          currency_code?: string
          group_id?: string
          id?: string
          primary_payer_participant_id?: string
          reference_image_data_url?: string | null
          split_mode?: number
          store_name?: string
          transaction_date_utc?: string
          updated_at_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_primary_payer_participant_id_fkey"
            columns: ["primary_payer_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at_utc: string
          created_by_user_id: string | null
          id: string
          name: string
          status: number
        }
        Insert: {
          created_at_utc?: string
          created_by_user_id?: string | null
          id?: string
          name: string
          status?: number
        }
        Update: {
          created_at_utc?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at_utc: string
          group_id: string
          id: string
          invitation_status: number
          invited_user_id: string | null
          name: string
          username: string | null
        }
        Insert: {
          created_at_utc?: string
          group_id: string
          id?: string
          invitation_status?: number
          invited_user_id?: string | null
          name: string
          username?: string | null
        }
        Update: {
          created_at_utc?: string
          group_id?: string
          id?: string
          invitation_status?: number
          invited_user_id?: string | null
          name?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_contributions: {
        Row: {
          amount: number
          bill_id: string
          created_at_utc: string
          id: string
          participant_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at_utc?: string
          id?: string
          participant_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at_utc?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_contributions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_contributions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_share_links: {
        Row: {
          account_name: string | null
          account_number: string | null
          created_at_utc: string
          creator_name: string | null
          from_date_utc: string | null
          group_id: string
          id: string
          is_active: boolean
          notes: string | null
          payee_name: string | null
          payment_method: string | null
          payment_qr_data_url: string | null
          receiver_payment_infos_json: string | null
          share_token: string
          to_date_utc: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          created_at_utc?: string
          creator_name?: string | null
          from_date_utc?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payee_name?: string | null
          payment_method?: string | null
          payment_qr_data_url?: string | null
          receiver_payment_infos_json?: string | null
          share_token: string
          to_date_utc?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          created_at_utc?: string
          creator_name?: string | null
          from_date_utc?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payee_name?: string | null
          payment_method?: string | null
          payment_qr_data_url?: string | null
          receiver_payment_infos_json?: string | null
          share_token?: string
          to_date_utc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_share_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_transfer_confirmations: {
        Row: {
          amount: number
          from_date_utc: string | null
          from_participant_id: string
          group_id: string
          id: string
          marked_paid_at_utc: string | null
          marked_received_at_utc: string | null
          proof_screenshot_data_url: string | null
          status: number
          to_date_utc: string | null
          to_participant_id: string
          transfer_key: string
          updated_at_utc: string
        }
        Insert: {
          amount: number
          from_date_utc?: string | null
          from_participant_id: string
          group_id: string
          id?: string
          marked_paid_at_utc?: string | null
          marked_received_at_utc?: string | null
          proof_screenshot_data_url?: string | null
          status?: number
          to_date_utc?: string | null
          to_participant_id: string
          transfer_key: string
          updated_at_utc?: string
        }
        Update: {
          amount?: number
          from_date_utc?: string | null
          from_participant_id?: string
          group_id?: string
          id?: string
          marked_paid_at_utc?: string | null
          marked_received_at_utc?: string | null
          proof_screenshot_data_url?: string | null
          status?: number
          to_date_utc?: string | null
          to_participant_id?: string
          transfer_key?: string
          updated_at_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_transfer_confirmations_from_participant_id_fkey"
            columns: ["from_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_transfer_confirmations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_transfer_confirmations_to_participant_id_fkey"
            columns: ["to_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_participant_id: string }
        Returns: undefined
      }
      create_bill_with_items: {
        Args: { p_group_id: string; p_input: Json }
        Returns: string
      }
      decline_invitation: {
        Args: { p_participant_id: string }
        Returns: undefined
      }
      get_group_members: {
        Args: { p_group_id: string }
        Returns: {
          is_creator: boolean
          name: string
          user_id: string
          username: string
        }[]
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      record_settlement_action: {
        Args: {
          p_action: string
          p_actor_participant_id: string
          p_amount: number
          p_from_date_utc: string
          p_from_participant_id: string
          p_group_id: string
          p_proof_screenshot_data_url: string
          p_to_date_utc: string
          p_to_participant_id: string
          p_transfer_key: string
        }
        Returns: Json
      }
      resolve_share_token: { Args: { p_token: string }; Returns: Json }
      update_bill_with_items: {
        Args: { p_bill_id: string; p_input: Json }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
