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
      audit_log: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          table_name: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          table_name: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      buyback_agreements: {
        Row: {
          approved_at: string | null
          created_at: string | null
          date_generated: string | null
          id: string
          paid_at: string | null
          snapshot: Json
          status: string
          total_value_pln: number
          user_id: string
          voucher_count: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          date_generated?: string | null
          id?: string
          paid_at?: string | null
          snapshot: Json
          status?: string
          total_value_pln: number
          user_id: string
          voucher_count: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          date_generated?: string | null
          id?: string
          paid_at?: string | null
          snapshot?: Json
          status?: string
          total_value_pln?: number
          user_id?: string
          voucher_count?: number
        }
        Relationships: []
      }
      buyback_batch_items: {
        Row: {
          amount_pln: number
          batch_id: string
          employee_id: string
          full_name: string
          iban: string
          id: string
          voucher_count: number
          voucher_ids: string[]
        }
        Insert: {
          amount_pln: number
          batch_id: string
          employee_id: string
          full_name: string
          iban: string
          id?: string
          voucher_count: number
          voucher_ids?: string[]
        }
        Update: {
          amount_pln?: number
          batch_id?: string
          employee_id?: string
          full_name?: string
          iban?: string
          id?: string
          voucher_count?: number
          voucher_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "buyback_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "buyback_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_batch_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyback_batches: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_csv: string | null
          format: string
          id: string
          period_label: string | null
          status: string
          total_amount: number
          voucher_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_csv?: string | null
          format?: string
          id?: string
          period_label?: string | null
          status?: string
          total_amount?: number
          voucher_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_csv?: string | null
          format?: string
          id?: string
          period_label?: string | null
          status?: string
          total_amount?: number
          voucher_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "buyback_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          agent_id: string
          agent_name: string
          agent_role: string
          amount_pln: number
          commission_type: string
          created_at: string | null
          id: string
          is_paid: boolean
          order_id: string | null
          paid_at: string | null
          quarter: string | null
          rate: number
        }
        Insert: {
          agent_id: string
          agent_name: string
          agent_role: string
          amount_pln: number
          commission_type: string
          created_at?: string | null
          id?: string
          is_paid?: boolean
          order_id?: string | null
          paid_at?: string | null
          quarter?: string | null
          rate: number
        }
        Update: {
          agent_id?: string
          agent_name?: string
          agent_role?: string
          amount_pln?: number
          commission_type?: string
          created_at?: string | null
          id?: string
          is_paid?: boolean
          order_id?: string | null
          paid_at?: string | null
          quarter?: string | null
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "voucher_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          advisor_id: string | null
          archived_at: string | null
          balance_active: number
          balance_pending: number
          created_at: string | null
          custom_payment_terms_days: number | null
          custom_voucher_validity_days: number | null
          director_id: string | null
          external_crm_id: string | null
          fee_percent: number
          id: string
          is_sync_managed: boolean | null
          krs: string | null
          manager_id: string | null
          name: string
          nip: string
          origin: string | null
          regon: string | null
          updated_at: string | null
          voucher_expiry_day: number
          voucher_expiry_hour: number
          voucher_expiry_minute: number
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          advisor_id?: string | null
          archived_at?: string | null
          balance_active?: number
          balance_pending?: number
          created_at?: string | null
          custom_payment_terms_days?: number | null
          custom_voucher_validity_days?: number | null
          director_id?: string | null
          external_crm_id?: string | null
          fee_percent?: number
          id?: string
          is_sync_managed?: boolean | null
          krs?: string | null
          manager_id?: string | null
          name: string
          nip: string
          origin?: string | null
          regon?: string | null
          updated_at?: string | null
          voucher_expiry_day?: number
          voucher_expiry_hour?: number
          voucher_expiry_minute?: number
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          advisor_id?: string | null
          archived_at?: string | null
          balance_active?: number
          balance_pending?: number
          created_at?: string | null
          custom_payment_terms_days?: number | null
          custom_voucher_validity_days?: number | null
          director_id?: string | null
          external_crm_id?: string | null
          fee_percent?: number
          id?: string
          is_sync_managed?: boolean | null
          krs?: string | null
          manager_id?: string | null
          name?: string
          nip?: string
          origin?: string | null
          regon?: string | null
          updated_at?: string | null
          voucher_expiry_day?: number
          voucher_expiry_hour?: number
          voucher_expiry_minute?: number
        }
        Relationships: []
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          first_name: string
          hr_temp_password: string | null
          id: string
          is_decision_maker: boolean
          is_hr_operator: boolean
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          first_name: string
          hr_temp_password?: string | null
          id?: string
          is_decision_maker?: boolean
          is_hr_operator?: boolean
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          hr_temp_password?: string | null
          id?: string
          is_decision_maker?: boolean
          is_hr_operator?: boolean
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_company_contacts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_activities: {
        Row: {
          client_profile_id: string | null
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          client_profile_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          client_profile_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_activities_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "crm_client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_client_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_profiles: {
        Row: {
          assigned_to: string | null
          avg_salary: number | null
          company_id: string | null
          created_at: string
          fee_percent: number | null
          id: string
          last_contact_at: string | null
          notes: string | null
          num_employees: number | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          avg_salary?: number | null
          company_id?: string | null
          created_at?: string
          fee_percent?: number | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          num_employees?: number | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          avg_salary?: number | null
          company_id?: string | null
          created_at?: string
          fee_percent?: number | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          num_employees?: number | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_profiles_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_client_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_batch_items: {
        Row: {
          amount: number
          batch_id: string
          created_at: string | null
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string | null
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "distribution_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_batches: {
        Row: {
          company_id: string
          created_at: string | null
          hr_name: string
          hr_user_id: string | null
          id: string
          order_id: string | null
          status: string
          total_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          hr_name: string
          hr_user_id?: string | null
          id: string
          order_id?: string | null
          status?: string
          total_amount: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          hr_name?: string
          hr_user_id?: string | null
          id?: string
          order_id?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribution_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "voucher_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_purchases: {
        Row: {
          activated_at: string | null
          cancelled_at: string | null
          category: string
          created_at: string | null
          employee_id: string
          id: string
          next_billing_date: string | null
          price_pkt: number
          product_id: string
          purchase_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          cancelled_at?: string | null
          category: string
          created_at?: string | null
          employee_id: string
          id?: string
          next_billing_date?: string | null
          price_pkt: number
          product_id: string
          purchase_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          cancelled_at?: string | null
          category?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          next_billing_date?: string | null
          price_pkt?: number
          product_id?: string
          purchase_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vouchers: {
        Row: {
          assigned_at: string | null
          company_id: string | null
          employee_id: string
          voucher_account_id: string
        }
        Insert: {
          assigned_at?: string | null
          company_id?: string | null
          employee_id: string
          voucher_account_id: string
        }
        Update: {
          assigned_at?: string | null
          company_id?: string | null
          employee_id?: string
          voucher_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vouchers_voucher_account_id_fkey"
            columns: ["voucher_account_id"]
            isOneToOne: false
            referencedRelation: "voucher_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          amount_gross: number
          amount_net: number
          company_id: string
          created_at: string
          document_number: string | null
          external_payment_ref: string | null
          id: string
          issued_at: string
          linked_order_id: string | null
          payment_confirmed_at: string | null
          payment_due_date: string | null
          pdf_url: string | null
          status: string
          type: string
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount_gross?: number
          amount_net?: number
          company_id: string
          created_at?: string
          document_number?: string | null
          external_payment_ref?: string | null
          id?: string
          issued_at?: string
          linked_order_id?: string | null
          payment_confirmed_at?: string | null
          payment_due_date?: string | null
          pdf_url?: string | null
          status?: string
          type: string
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount_gross?: number
          amount_net?: number
          company_id?: string
          created_at?: string
          document_number?: string | null
          external_payment_ref?: string | null
          id?: string
          issued_at?: string
          linked_order_id?: string | null
          payment_confirmed_at?: string | null
          payment_due_date?: string | null
          pdf_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_financial_docs_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_financial_docs_order"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "voucher_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      iban_change_requests: {
        Row: {
          created_at: string
          id: string
          new_iban: string
          reason: string
          rejection_reason: string | null
          requested_at: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_iban: string
          reason: string
          rejection_reason?: string | null
          requested_at?: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_iban?: string
          reason?: string
          rejection_reason?: string | null
          requested_at?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          company_id: string
          created_at: string | null
          hr_name: string
          hr_user_id: string | null
          id: string
          report_data: Json | null
          status: string
          total_processed: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          hr_name: string
          hr_user_id?: string | null
          id?: string
          report_data?: Json | null
          status?: string
          total_processed?: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          hr_name?: string
          hr_user_id?: string | null
          id?: string
          report_data?: Json | null
          status?: string
          total_processed?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          contact_person: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          nip: string | null
          notes: string | null
          phone: string | null
          qualification_notes: string | null
          rejected_at: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          contact_person?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          nip?: string | null
          notes?: string | null
          phone?: string | null
          qualification_notes?: string | null
          rejected_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          contact_person?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          nip?: string | null
          notes?: string | null
          phone?: string | null
          qualification_notes?: string | null
          rejected_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_configs: {
        Row: {
          channels: Json | null
          company_id: string | null
          created_at: string
          enabled: boolean
          id: string
          target: string
          trigger: string
          updated_at: string
        }
        Insert: {
          channels?: Json | null
          company_id?: string | null
          created_at?: string
          enabled?: boolean
          id: string
          target: string
          trigger: string
          updated_at?: string
        }
        Update: {
          channels?: Json | null
          company_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          target?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: Json | null
          created_at: string
          date: string
          id: string
          message: string
          priority: string | null
          read: boolean
          target_entity_id: string | null
          target_entity_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          action?: Json | null
          created_at?: string
          date?: string
          id?: string
          message: string
          priority?: string | null
          read?: boolean
          target_entity_id?: string | null
          target_entity_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          action?: Json | null
          created_at?: string
          date?: string
          id?: string
          message?: string
          priority?: string | null
          read?: boolean
          target_entity_id?: string | null
          target_entity_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_calculations: {
        Row: {
          client_profile_id: string | null
          company_name: string
          config: Json | null
          created_at: string
          created_by: string | null
          employees: Json
          id: string
          lead_id: string | null
          nip: string | null
          period: string
          provision_percent: number | null
          results: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          client_profile_id?: string | null
          company_name: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          employees?: Json
          id?: string
          lead_id?: string | null
          nip?: string | null
          period: string
          provision_percent?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_profile_id?: string | null
          company_name?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          employees?: Json
          id?: string
          lead_id?: string | null
          nip?: string | null
          period?: string
          provision_percent?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_calculations_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "crm_client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_calculations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_available: boolean | null
          name: string
          price_pkt: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price_pkt: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price_pkt?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string
          id: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          company_id: string | null
          created_at: string | null
          creator_id: string
          creator_name: string
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at?: string | null
          creator_id: string
          creator_name: string
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string | null
          creator_id?: string
          creator_name?: string
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          audit_log_retention_days: number
          default_voucher_validity_days: number
          id: string
          min_password_length: number
          payment_terms_days: number
          pdf_auto_scaling: boolean | null
          platform_currency: string
          session_timeout_minutes: number
          updated_at: string | null
        }
        Insert: {
          audit_log_retention_days?: number
          default_voucher_validity_days?: number
          id?: string
          min_password_length?: number
          payment_terms_days?: number
          pdf_auto_scaling?: boolean | null
          platform_currency?: string
          session_timeout_minutes?: number
          updated_at?: string | null
        }
        Update: {
          audit_log_retention_days?: number
          default_voucher_validity_days?: number
          id?: string
          min_password_length?: number
          payment_terms_days?: number
          pdf_auto_scaling?: boolean | null
          platform_currency?: string
          session_timeout_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_role: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          anonymized_at: string | null
          company_id: string | null
          company_name: string | null
          contract_type: string | null
          created_at: string | null
          department: string | null
          full_name: string | null
          hire_date: string | null
          iban: string | null
          iban_verified: boolean | null
          iban_verified_at: string | null
          id: string
          pesel: string | null
          pesel_encrypted: string | null
          phone_number: string | null
          position: string | null
          role: string
          status: string
          temp_password: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          two_fa_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          anonymized_at?: string | null
          company_id?: string | null
          company_name?: string | null
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          hire_date?: string | null
          iban?: string | null
          iban_verified?: boolean | null
          iban_verified_at?: string | null
          id: string
          pesel?: string | null
          pesel_encrypted?: string | null
          phone_number?: string | null
          position?: string | null
          role: string
          status?: string
          temp_password?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          anonymized_at?: string | null
          company_id?: string | null
          company_name?: string | null
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          hire_date?: string | null
          iban?: string | null
          iban_verified?: boolean | null
          iban_verified_at?: string | null
          id?: string
          pesel?: string | null
          pesel_encrypted?: string | null
          phone_number?: string | null
          position?: string | null
          role?: string
          status?: string
          temp_password?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_accounts: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      voucher_orders: {
        Row: {
          amount_pln: number
          amount_vouchers: number
          company_id: string
          created_at: string | null
          distribution_plan: Json | null
          doc_fee_id: string | null
          doc_voucher_id: string | null
          fee_pln: number
          hr_user_id: string | null
          id: string
          is_first_invoice: boolean | null
          payroll_snapshots: Json | null
          status: string
          total_pln: number
          umowa_pdf_url: string | null
          updated_at: string | null
          voucher_valid_until: string | null
        }
        Insert: {
          amount_pln: number
          amount_vouchers: number
          company_id: string
          created_at?: string | null
          distribution_plan?: Json | null
          doc_fee_id?: string | null
          doc_voucher_id?: string | null
          fee_pln?: number
          hr_user_id?: string | null
          id?: string
          is_first_invoice?: boolean | null
          payroll_snapshots?: Json | null
          status?: string
          total_pln: number
          umowa_pdf_url?: string | null
          updated_at?: string | null
          voucher_valid_until?: string | null
        }
        Update: {
          amount_pln?: number
          amount_vouchers?: number
          company_id?: string
          created_at?: string | null
          distribution_plan?: Json | null
          doc_fee_id?: string | null
          doc_voucher_id?: string | null
          fee_pln?: number
          hr_user_id?: string | null
          id?: string
          is_first_invoice?: boolean | null
          payroll_snapshots?: Json | null
          status?: string
          total_pln?: number
          umowa_pdf_url?: string | null
          updated_at?: string | null
          voucher_valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_transactions: {
        Row: {
          amount: number
          created_at: string | null
          from_user_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          service_id: string | null
          service_name: string | null
          status: string
          to_user_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          to_user_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          to_user_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "voucher_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          buyback_agreement_id: string | null
          company_id: string
          created_at: string | null
          current_owner_id: string
          face_value_pln: number
          id: string
          issued_at: string | null
          issuer_address: string
          issuer_name: string
          issuer_nip: string
          legal_basis: string
          metadata: Json | null
          order_id: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          redeemed_order_id: string | null
          redemption_scope: string
          serial_number: string
          status: string
          valid_until: string
        }
        Insert: {
          buyback_agreement_id?: string | null
          company_id: string
          created_at?: string | null
          current_owner_id: string
          face_value_pln?: number
          id?: string
          issued_at?: string | null
          issuer_address?: string
          issuer_name?: string
          issuer_nip?: string
          legal_basis?: string
          metadata?: Json | null
          order_id: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redeemed_order_id?: string | null
          redemption_scope?: string
          serial_number: string
          status?: string
          valid_until: string
        }
        Update: {
          buyback_agreement_id?: string | null
          company_id?: string
          created_at?: string | null
          current_owner_id?: string
          face_value_pln?: number
          id?: string
          issued_at?: string | null
          issuer_address?: string
          issuer_name?: string
          issuer_nip?: string
          legal_basis?: string
          metadata?: Json | null
          order_id?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redeemed_order_id?: string | null
          redemption_scope?: string
          serial_number?: string
          status?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vouchers_buyback"
            columns: ["buyback_agreement_id"]
            isOneToOne: false
            referencedRelation: "buyback_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "voucher_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_voucher_tree: { Args: never; Returns: Json }
      backfill_pesel_encrypted: { Args: { p_key: string }; Returns: number }
      company_cleanup: { Args: { p_company_id: string }; Returns: Json }
      compute_voucher_valid_until: {
        Args: {
          p_expiry_day: number
          p_expiry_hour?: number
          p_expiry_minute?: number
        }
        Returns: string
      }
      decrypt_pesel: {
        Args: { p_ciphertext: string; p_key: string }
        Returns: string
      }
      dev_cleanup_all: { Args: never; Returns: Json }
      distribute_to_employee: {
        Args: {
          p_amount: number
          p_company_id: string
          p_from_user_id: string
          p_order_id?: string
          p_to_user_id: string
          p_valid_until?: string
        }
        Returns: number
      }
      encrypt_pesel: {
        Args: { p_key: string; p_pesel: string }
        Returns: string
      }
      expire_overdue_vouchers: {
        Args: { p_company_id?: string }
        Returns: number
      }
      expire_vouchers_and_create_buybacks: {
        Args: { p_company_id?: string }
        Returns: {
          buyback_count: number
          expired_count: number
        }[]
      }
      generate_voucher_serial: { Args: never; Returns: string }
      get_employee_voucher_history: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_employee_vouchers: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Json
      }
      get_expired_vouchers_by_employee: {
        Args: { p_company_id: string }
        Returns: {
          employee_id: string
          voucher_count: number
        }[]
      }
      mint_vouchers: {
        Args: {
          p_company_id: string
          p_order_id: string
          p_owner_id: string
          p_quantity: number
          p_valid_months?: number
          p_valid_until?: string
        }
        Returns: undefined
      }
      redeem_voucher: {
        Args: {
          p_serial_number: string
          p_service_id?: string
          p_service_name?: string
          p_user_id: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_vouchers: {
        Args: {
          p_amount: number
          p_from_user_id: string
          p_order_id?: string
          p_to_user_id: string
          p_type: string
        }
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
  public: {
    Enums: {},
  },
} as const

// ── Legacy type re-exports (backwards compatibility) ─────────────────────────
export type { VoucherStatus, OrderStatus, CommissionType } from './enums';
export type { DbRole } from '../lib/roleMap';
export type TransactionType = string;
