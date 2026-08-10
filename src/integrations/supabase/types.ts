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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      copy_texts: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_accounts: {
        Row: {
          address: Json | null
          annual_revenue: number | null
          created_at: string
          id: string
          industry: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          annual_revenue?: number | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          annual_revenue?: number | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          assigned_to: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          account_id: string | null
          address: Json | null
          created_at: string
          emails: Json | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          owner_id: string
          phones: Json | null
          position: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          address?: Json | null
          created_at?: string
          emails?: Json | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id: string
          phones?: Json | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          address?: Json | null
          created_at?: string
          emails?: Json | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id?: string
          phones?: Json | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          account_id: string | null
          close_date: string | null
          contact_id: string | null
          created_at: string
          currency: string | null
          custom_fields: Json | null
          id: string
          lost_reason: string | null
          notes: string | null
          owner_id: string
          probability: number | null
          stage: string
          status: string | null
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          account_id?: string | null
          close_date?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          owner_id: string
          probability?: number | null
          stage?: string
          status?: string | null
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          account_id?: string | null
          close_date?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string
          probability?: number | null
          stage?: string
          status?: string | null
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          company: string | null
          converted_contact_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          converted_contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          converted_contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          feature_name: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_name: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_name?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feature_suggestions: {
        Row: {
          created_at: string
          id: string
          project_context: string | null
          suggestions: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_context?: string | null
          suggestions: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_context?: string | null
          suggestions?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_bank_transactions: {
        Row: {
          amount: number
          balance: number | null
          created_at: string
          description: string
          id: string
          imported_at: string | null
          matched_expense_id: string | null
          matched_invoice_id: string | null
          notes: string | null
          reconciled: boolean | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          created_at?: string
          description: string
          id?: string
          imported_at?: string | null
          matched_expense_id?: string | null
          matched_invoice_id?: string | null
          notes?: string | null
          reconciled?: boolean | null
          transaction_date: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          created_at?: string
          description?: string
          id?: string
          imported_at?: string | null
          matched_expense_id?: string | null
          matched_invoice_id?: string | null
          notes?: string | null
          reconciled?: boolean | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_transactions_matched_expense_id_fkey"
            columns: ["matched_expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_chart_of_accounts: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          account_id: string | null
          client_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          discount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_link: string | null
          status: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          discount?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          payment_link?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          discount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_link?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string
          gateway_data: Json | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_data?: Json | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_data?: Json | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          contact_id: string | null
          created_at: string
          id: string
          last_billing_date: string | null
          next_billing_date: string
          notes: string | null
          plan_name: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_billing_date?: string | null
          next_billing_date: string
          notes?: string | null
          plan_name: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_billing_date?: string | null
          next_billing_date?: string
          notes?: string | null
          plan_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          id: string
          prompt: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          ai_analysis: string | null
          business_name: string
          created_at: string
          email: string | null
          id: string
          phone: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          address?: string | null
          ai_analysis?: string | null
          business_name: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          address?: string | null
          ai_analysis?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_data: Json | null
          payment_method: string
          plan: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_data?: Json | null
          payment_method: string
          plan?: string | null
          status: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_data?: Json | null
          payment_method?: string
          plan?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cellphone: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cellphone?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cellphone?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          features: string | null
          id: string
          prompt: string | null
          tech_stack: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string | null
          id?: string
          prompt?: string | null
          tech_stack?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string | null
          id?: string
          prompt?: string | null
          tech_stack?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      signup_tokens: {
        Row: {
          cpf: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          name: string
          password_hash: string
          phone: string
          plan_id: string
          token: string
          used: boolean | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          name: string
          password_hash: string
          phone: string
          plan_id: string
          token: string
          used?: boolean | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          name?: string
          password_hash?: string
          phone?: string
          plan_id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_sla_hours: number | null
          resolved_at: string | null
          response_sla_hours: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          tags: string[] | null
          ticket_number: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_sla_hours?: number | null
          resolved_at?: string | null
          response_sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          ticket_number: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_sla_hours?: number | null
          resolved_at?: string | null
          response_sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          ticket_number?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits: number
          id: string
          last_reminder_sent: string | null
          last_reset_at: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          last_reminder_sent?: string | null
          last_reset_at?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          last_reminder_sent?: string | null
          last_reset_at?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          city: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          monthly_goal: number | null
          niche: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          monthly_goal?: number | null
          niche?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          monthly_goal?: number | null
          niche?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_count: number
          id: string
          message_template: string
          name: string
          sent_count: number
          started_at: string | null
          status: string
          target_phones: string[]
          total_count: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message_template: string
          name: string
          sent_count?: number
          started_at?: string | null
          status?: string
          target_phones?: string[]
          total_count?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message_template?: string
          name?: string
          sent_count?: number
          started_at?: string | null
          status?: string
          target_phones?: string[]
          total_count?: number
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          ai_enabled: boolean
          contact_name: string | null
          contact_phone: string
          created_at: string
          crm_contact_id: string | null
          crm_lead_id: string | null
          id: string
          last_message_at: string | null
          purchase_intent: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          crm_contact_id?: string | null
          crm_lead_id?: string | null
          id?: string
          last_message_at?: string | null
          purchase_intent?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_enabled?: boolean
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          crm_contact_id?: string | null
          crm_lead_id?: string | null
          id?: string
          last_message_at?: string | null
          purchase_intent?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string
          metadata: Json | null
          status: string
          zapi_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          zapi_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _endpoint: string
          _max_requests: number
          _user_id: string
          _window_seconds: number
        }
        Returns: boolean
      }
      deduct_credit: { Args: { user_id_param: string }; Returns: boolean }
      generate_ticket_number: { Args: never; Returns: string }
      get_dashboard_metrics: { Args: { period_days?: number }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_monthly_credits: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "sales" | "finance" | "manager" | "support" | "viewer"
      subscription_plan: "free" | "pro" | "enterprise"
      subscription_status: "active" | "pending" | "cancelled" | "overdue"
      ticket_category:
        | "technical"
        | "billing"
        | "feature_request"
        | "bug"
        | "general"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
        | "closed"
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
      app_role: ["admin", "sales", "finance", "manager", "support", "viewer"],
      subscription_plan: ["free", "pro", "enterprise"],
      subscription_status: ["active", "pending", "cancelled", "overdue"],
      ticket_category: [
        "technical",
        "billing",
        "feature_request",
        "bug",
        "general",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
    },
  },
} as const
