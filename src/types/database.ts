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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: never
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: never
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: number
          target_description: string | null
          target_id: string | null
          target_table: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: never
          target_description?: string | null
          target_id?: string | null
          target_table: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: never
          target_description?: string | null
          target_id?: string | null
          target_table?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          dni: number | null
          id: number
          name: string | null
          phone: number | null
        }
        Insert: {
          dni?: number | null
          id?: never
          name?: string | null
          phone?: number | null
        }
        Update: {
          dni?: number | null
          id?: never
          name?: string | null
          phone?: number | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: number
          name: string
          price: number
          quantity: number
          unit_of_measure: string
        }
        Insert: {
          id?: never
          name: string
          price: number
          quantity: number
          unit_of_measure: string
        }
        Update: {
          id?: never
          name?: string
          price?: number
          quantity?: number
          unit_of_measure?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: number | null
          id: number
          manufacturing_cost: number | null
          name: string
          price: number
          recipe_id: number | null
          suggested_price: number | null
          temperatura: string | null
          tipo_leche: string | null
        }
        Insert: {
          category_id?: number | null
          id?: never
          manufacturing_cost?: number | null
          name: string
          price: number
          recipe_id?: number | null
          suggested_price?: number | null
          temperatura?: string | null
          tipo_leche?: string | null
        }
        Update: {
          category_id?: number | null
          id?: never
          manufacturing_cost?: number | null
          name?: string
          price?: number
          recipe_id?: number | null
          suggested_price?: number | null
          temperatura?: string | null
          tipo_leche?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          id: number
          ingredient_id: number | null
          item_name: string
          price: number
          purchase_id: number
        }
        Insert: {
          id?: never
          ingredient_id?: number | null
          item_name: string
          price: number
          purchase_id: number
        }
        Update: {
          id?: never
          ingredient_id?: number | null
          item_name?: string
          price?: number
          purchase_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          account_id: number | null
          created_at: string
          delivery_cost: number | null
          has_delivery: boolean
          id: number
          notes: string | null
          total: number
          user_id: string
          yape_change: number | null
        }
        Insert: {
          account_id?: number | null
          created_at?: string
          delivery_cost?: number | null
          has_delivery?: boolean
          id?: never
          notes?: string | null
          total?: number
          user_id: string
          yape_change?: number | null
        }
        Update: {
          account_id?: number | null
          created_at?: string
          delivery_cost?: number | null
          has_delivery?: boolean
          id?: never
          notes?: string | null
          total?: number
          user_id?: string
          yape_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          quantity: number
          recipe_id: number
          recipe_ingredients_id: number
          unit_of_measure: string
        }
        Insert: {
          quantity: number
          recipe_id: number
          recipe_ingredients_id: number
          unit_of_measure: string
        }
        Update: {
          quantity?: number
          recipe_id?: number
          recipe_ingredients_id?: number
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_ingredients_id_fkey"
            columns: ["recipe_ingredients_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          description: string
          id: number
          manufacturing_cost: number
          name: string
          quantity: number
          unit_of_measure: string
        }
        Insert: {
          description: string
          id?: never
          manufacturing_cost: number
          name: string
          quantity: number
          unit_of_measure: string
        }
        Update: {
          description?: string
          id?: never
          manufacturing_cost?: number
          name?: string
          quantity?: number
          unit_of_measure?: string
        }
        Relationships: []
      }
      sale_products: {
        Row: {
          id: number
          product_id: number
          quantity: number
          sale_id: number
          status: string
          temperatura: string | null
          tipo_leche: string | null
          unit_price: number
        }
        Insert: {
          id?: never
          product_id: number
          quantity: number
          sale_id: number
          status?: string
          temperatura?: string | null
          tipo_leche?: string | null
          unit_price?: number
        }
        Update: {
          id?: never
          product_id?: number
          quantity?: number
          sale_id?: number
          status?: string
          temperatura?: string | null
          tipo_leche?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_products_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_amount: number | null
          customer_id: number | null
          id: number
          order_type: string
          payment_date: string | null
          payment_method: string | null
          sale_date: string
          table_number: number | null
          total_price: number
          user_id: string | null
          yape_amount: number | null
        }
        Insert: {
          cash_amount?: number | null
          customer_id?: number | null
          id?: number
          order_type: string
          payment_date?: string | null
          payment_method?: string | null
          sale_date?: string
          table_number?: number | null
          total_price: number
          user_id?: string | null
          yape_amount?: number | null
        }
        Update: {
          cash_amount?: number | null
          customer_id?: number | null
          id?: number
          order_type?: string
          payment_date?: string | null
          payment_method?: string | null
          sale_date?: string
          table_number?: number | null
          total_price?: number
          user_id?: string | null
          yape_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: number
          amount: number
          created_at: string
          description: string | null
          id: number
          reference_id: number | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: number
          amount: number
          created_at?: string
          description?: string | null
          id?: never
          reference_id?: number | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: number
          amount?: number
          created_at?: string
          description?: string | null
          id?: never
          reference_id?: number | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      record_transaction: {
        Args: {
          p_account_id: number
          p_amount: number
          p_description?: string
          p_reference_id?: number
          p_reference_type?: string
          p_type: string
          p_user_id?: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "cocinero" | "barista"
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
      app_role: ["admin", "cocinero", "barista"],
    },
  },
} as const
