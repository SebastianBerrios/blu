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
      activities: {
        Row: {
          anchor_date: string | null
          category: string
          created_at: string
          days_of_week: number[] | null
          description: string | null
          frequency: string
          id: number
          interval_days: number | null
          is_active: boolean
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          anchor_date?: string | null
          category: string
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          frequency: string
          id?: number
          interval_days?: number | null
          is_active?: boolean
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          anchor_date?: string | null
          category?: string
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          frequency?: string
          id?: number
          interval_days?: number | null
          is_active?: boolean
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_assignments: {
        Row: {
          activity_id: number
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          activity_id?: number
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          target_margin: number | null
          tipo: string | null
        }
        Insert: {
          id?: never
          name: string
          target_margin?: number | null
          tipo?: string | null
        }
        Update: {
          id?: never
          name?: string
          target_margin?: number | null
          tipo?: string | null
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
      employee_tasks: {
        Row: {
          category: string
          created_at: string | null
          days_of_week: number[] | null
          frequency: string
          id: number
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          days_of_week?: number[] | null
          frequency: string
          id?: never
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          days_of_week?: number[] | null
          frequency?: string
          id?: never
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_hours_log: {
        Row: {
          created_at: string
          created_by: string
          description: string
          hours: number
          id: number
          reference_id: number | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          hours: number
          id?: never
          reference_id?: number | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          hours?: number
          id?: never
          reference_id?: number | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_hours_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_hours_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_groups: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          group_id: number | null
          id: number
          name: string
          needs_purchase: boolean
          price: number
          quantity: number
          recipe_id: number | null
          stock_quantity: number
          unit_of_measure: string
          unit_weight_g: number | null
        }
        Insert: {
          group_id?: number | null
          id?: never
          name: string
          needs_purchase?: boolean
          price: number
          quantity: number
          recipe_id?: number | null
          stock_quantity?: number
          unit_of_measure: string
          unit_weight_g?: number | null
        }
        Update: {
          group_id?: number | null
          id?: never
          name?: string
          needs_purchase?: boolean
          price?: number
          quantity?: number
          recipe_id?: number | null
          stock_quantity?: number
          unit_of_measure?: string
          unit_weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ingredient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: number
          ingredient_id: number
          new_quantity: number
          note: string | null
          old_quantity: number
          reason: string
          reference_id: number | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ingredient_id: number
          new_quantity: number
          note?: string | null
          old_quantity: number
          reason?: string
          reference_id?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ingredient_id?: number
          new_quantity?: number
          note?: string | null
          old_quantity?: number
          reason?: string
          reference_id?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          bundle_product_id: number
          component_product_id: number
          id: number
          quantity: number
        }
        Insert: {
          bundle_product_id: number
          component_product_id: number
          id?: never
          quantity?: number
        }
        Update: {
          bundle_product_id?: number
          component_product_id?: number
          id?: never
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_components_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      productions: {
        Row: {
          batches: number
          created_at: string
          id: number
          ingredient_id: number
          recipe_id: number
          reversed_at: string | null
          reversed_by: string | null
          user_id: string | null
          user_name: string | null
          yield_added: number
        }
        Insert: {
          batches: number
          created_at?: string
          id?: never
          ingredient_id: number
          recipe_id: number
          reversed_at?: string | null
          reversed_by?: string | null
          user_id?: string | null
          user_name?: string | null
          yield_added: number
        }
        Update: {
          batches?: number
          created_at?: string
          id?: never
          ingredient_id?: number
          recipe_id?: number
          reversed_at?: string | null
          reversed_by?: string | null
          user_id?: string | null
          user_name?: string | null
          yield_added?: number
        }
        Relationships: [
          {
            foreignKeyName: "productions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          id: number
          is_available: boolean
          manufacturing_cost: number | null
          name: string
          price: number
          rappi_price: number | null
          recipe_id: number | null
          suggested_price: number | null
          temperatura: string | null
          tipo_leche: string | null
        }
        Insert: {
          category_id?: number | null
          id?: never
          is_available?: boolean
          manufacturing_cost?: number | null
          name: string
          price: number
          rappi_price?: number | null
          recipe_id?: number | null
          suggested_price?: number | null
          temperatura?: string | null
          tipo_leche?: string | null
        }
        Update: {
          category_id?: number | null
          id?: never
          is_available?: boolean
          manufacturing_cost?: number | null
          name?: string
          price?: number
          rappi_price?: number | null
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
          quantity: number | null
          unit: string | null
        }
        Insert: {
          id?: never
          ingredient_id?: number | null
          item_name: string
          price: number
          purchase_id: number
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          id?: never
          ingredient_id?: number | null
          item_name?: string
          price?: number
          purchase_id?: number
          quantity?: number | null
          unit?: string | null
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
          plin_change: number | null
          total: number
          user_id: string
        }
        Insert: {
          account_id?: number | null
          created_at?: string
          delivery_cost?: number | null
          has_delivery?: boolean
          id?: never
          notes?: string | null
          plin_change?: number | null
          total?: number
          user_id: string
        }
        Update: {
          account_id?: number | null
          created_at?: string
          delivery_cost?: number | null
          has_delivery?: boolean
          id?: never
          notes?: string | null
          plin_change?: number | null
          total?: number
          user_id?: string
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
          preparation_steps: string | null
          quantity: number
          unit_of_measure: string
        }
        Insert: {
          description: string
          id?: never
          manufacturing_cost: number
          name: string
          preparation_steps?: string | null
          quantity: number
          unit_of_measure: string
        }
        Update: {
          description?: string
          id?: never
          manufacturing_cost?: number
          name?: string
          preparation_steps?: string | null
          quantity?: number
          unit_of_measure?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          enabled: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sale_products: {
        Row: {
          discount_amount: number
          id: number
          loyalty_reward: string | null
          product_id: number
          quantity: number
          sale_id: number
          status: string
          temperatura: string | null
          tipo_leche: string | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          discount_amount?: number
          id?: never
          loyalty_reward?: string | null
          product_id: number
          quantity: number
          sale_id: number
          status?: string
          temperatura?: string | null
          tipo_leche?: string | null
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          discount_amount?: number
          id?: never
          loyalty_reward?: string | null
          product_id?: number
          quantity?: number
          sale_id?: number
          status?: string
          temperatura?: string | null
          tipo_leche?: string | null
          unit_cost?: number
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
          cash_received: number | null
          commission: number | null
          customer_id: number | null
          discount_amount: number
          id: number
          last_edited_at: string | null
          last_edited_by: string | null
          notes: string | null
          order_type: string
          payment_date: string | null
          payment_method: string | null
          payment_registered_by: string | null
          plin_amount: number | null
          sale_date: string
          sale_number: number
          table_number: number | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          cash_amount?: number | null
          cash_received?: number | null
          commission?: number | null
          customer_id?: number | null
          discount_amount?: number
          id?: number
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_type: string
          payment_date?: string | null
          payment_method?: string | null
          payment_registered_by?: string | null
          plin_amount?: number | null
          sale_date?: string
          sale_number?: number
          table_number?: number | null
          total_price: number
          user_id?: string | null
        }
        Update: {
          cash_amount?: number | null
          cash_received?: number | null
          commission?: number | null
          customer_id?: number | null
          discount_amount?: number
          id?: number
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_type?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_registered_by?: string | null
          plin_amount?: number | null
          sale_date?: string
          sale_number?: number
          table_number?: number | null
          total_price?: number
          user_id?: string | null
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
            foreignKeyName: "sales_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_registered_by_fkey"
            columns: ["payment_registered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      schedule_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string | null
          id: number
          is_absence: boolean | null
          is_day_off: boolean
          is_extra_shift: boolean | null
          override_date: string
          reason: string | null
          start_time: string | null
          time_off_request_id: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: never
          is_absence?: boolean | null
          is_day_off?: boolean
          is_extra_shift?: boolean | null
          override_date: string
          reason?: string | null
          start_time?: string | null
          time_off_request_id?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: never
          is_absence?: boolean | null
          is_day_off?: boolean
          is_extra_shift?: boolean | null
          override_date?: string
          reason?: string | null
          start_time?: string | null
          time_off_request_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_overrides_time_off_request_id_fkey"
            columns: ["time_off_request_id"]
            isOneToOne: false
            referencedRelation: "time_off_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: number
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: never
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: never
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          activity_id: number
          completed_at: string | null
          completed_by: string | null
          completion_date: string
          id: number
          user_id: string
        }
        Insert: {
          activity_id: number
          completed_at?: string | null
          completed_by?: string | null
          completion_date: string
          id?: never
          user_id: string
        }
        Update: {
          activity_id?: number
          completed_at?: string | null
          completed_by?: string | null
          completion_date?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          created_at: string
          end_time: string | null
          hours_requested: number
          id: number
          is_full_day: boolean
          reason: string | null
          requested_date: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          hours_requested: number
          id?: never
          is_full_day?: boolean
          reason?: string | null
          requested_date: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          hours_requested?: number
          id?: never
          is_full_day?: boolean
          reason?: string | null
          requested_date?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          kind: string
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          kind?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: number
          amount: number
          category_id: number | null
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
          category_id?: number | null
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
          category_id?: number | null
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
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
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
      user_permissions: {
        Row: {
          enabled: boolean
          permission: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          enabled: boolean
          permission: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          enabled?: boolean
          permission?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
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
      _convert_qty: {
        Args: {
          p_from: string
          p_grams_per_unit?: number
          p_qty: number
          p_to: string
        }
        Returns: number
      }
      adjust_account_balance: {
        Args: {
          p_account_id: number
          p_description?: string
          p_new_balance: number
          p_user_id?: string
        }
        Returns: number
      }
      adjust_inventory_manual: {
        Args: {
          p_ingredient_id: number
          p_new_quantity: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      apply_purchase_inventory: {
        Args: {
          p_purchase_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      approve_time_off_request: {
        Args: {
          p_admin_id: string
          p_request_id: number
          p_review_note?: string
        }
        Returns: undefined
      }
      create_purchase_atomic: { Args: { p_payload: Json }; Returns: number }
      create_sale_atomic: { Args: { p_payload: Json }; Returns: number }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      deduct_inventory_for_delivery: {
        Args: {
          p_sale_product_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      delete_delivered_sale_product: {
        Args: {
          p_sale_product_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      delete_purchase_atomic: {
        Args: { p_purchase_id: number; p_user_id?: string }
        Returns: undefined
      }
      delete_purchase_transactions: {
        Args: { p_purchase_id: number }
        Returns: undefined
      }
      delete_sale_atomic: {
        Args: { p_sale_id: number; p_user_id?: string; p_user_name?: string }
        Returns: undefined
      }
      delete_sale_transactions: {
        Args: { p_sale_id: number }
        Returns: undefined
      }
      deliver_all_sale_products: {
        Args: { p_sale_id: number; p_user_id?: string; p_user_name?: string }
        Returns: number
      }
      deliver_sale_product: {
        Args: {
          p_sale_product_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      discard_inventory: {
        Args: {
          p_ingredient_id: number
          p_note?: string
          p_quantity: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      has_permission: {
        Args: { p_permission: string; p_user_id?: string }
        Returns: boolean
      }
      produce_recipe_batch: {
        Args: {
          p_batches: number
          p_ingredient_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: number
      }
      recompute_bundle_cost: {
        Args: { p_bundle_id: number }
        Returns: undefined
      }
      record_transaction: {
        Args: {
          p_account_id: number
          p_amount: number
          p_category_id?: number
          p_description?: string
          p_reference_id?: number
          p_reference_type?: string
          p_type: string
          p_user_id?: string
        }
        Returns: number
      }
      register_late_payment: {
        Args: {
          p_cash_amount: number
          p_cash_received: number
          p_discount_amount?: number
          p_payment_method: string
          p_payments: Json
          p_plin_amount: number
          p_products: Json
          p_sale_id: number
          p_total_price: number
          p_user_id?: string
        }
        Returns: undefined
      }
      replace_purchase_transactions: {
        Args: { p_payments: Json; p_purchase_id: number; p_user_id?: string }
        Returns: undefined
      }
      replace_sale_transactions: {
        Args: { p_payments: Json; p_sale_id: number; p_user_id?: string }
        Returns: undefined
      }
      reverse_inventory_for_sale: {
        Args: { p_sale_id: number; p_user_id?: string; p_user_name?: string }
        Returns: undefined
      }
      reverse_production: {
        Args: {
          p_production_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      reverse_purchase_inventory: {
        Args: {
          p_purchase_id: number
          p_user_id?: string
          p_user_name?: string
        }
        Returns: undefined
      }
      transfer_between_accounts: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_account_id: number
          p_to_account_id: number
          p_user_id?: string
        }
        Returns: undefined
      }
      update_purchase_atomic: {
        Args: {
          p_account_id: number
          p_delivery_cost: number
          p_has_delivery: boolean
          p_items: Json
          p_notes: string
          p_payments: Json
          p_plin_change: number
          p_purchase_id: number
          p_total: number
          p_user_id?: string
        }
        Returns: undefined
      }
      upsert_activity_with_assignments: {
        Args: {
          p_activity_id: number
          p_anchor_date: string
          p_assignee_ids: string[]
          p_category: string
          p_days_of_week: number[]
          p_description: string
          p_frequency: string
          p_interval_days: number
          p_sort_order: number
          p_title: string
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
