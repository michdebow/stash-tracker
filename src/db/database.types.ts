export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      expense_categories: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          expense_date: string;
          id: string;
          updated_at: string;
          user_id: string;
          year_month: string;
        };
        Insert: {
          amount: number;
          category_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          expense_date: string;
          id?: string;
          updated_at?: string;
          user_id: string;
          year_month: string;
        };
        Update: {
          amount?: number;
          category_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          expense_date?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
          year_month?: string;
        };
        Relationships: [];
      };
      month_budget: {
        Row: {
          budget_set: number;
          created_at: string;
          current_balance: number;
          deleted_at: string | null;
          id: string;
          updated_at: string;
          user_id: string;
          year_month: string;
        };
        Insert: {
          budget_set: number;
          created_at?: string;
          current_balance?: number;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
          year_month: string;
        };
        Update: {
          budget_set?: number;
          created_at?: string;
          current_balance?: number;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
          year_month?: string;
        };
        Relationships: [];
      };
      stash_transactions: {
        Row: {
          amount: number;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          stash_id: string;
          transaction_type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          stash_id: string;
          transaction_type: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          stash_id?: string;
          transaction_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stash_transactions_stash_id_fkey";
            columns: ["stash_id"];
            isOneToOne: false;
            referencedRelation: "stashes";
            referencedColumns: ["id"];
          },
        ];
      };
      stashes: {
        Row: {
          created_at: string;
          current_balance: number;
          deleted_at: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_balance?: number;
          deleted_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_balance?: number;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      delete_user_account: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      format_year_month: {
        Args: { d: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
