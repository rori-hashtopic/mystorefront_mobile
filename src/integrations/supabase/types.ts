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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          anonymous_session_id: string | null
          brand_id: string | null
          click_id: string
          created_at: string
          creator_id: string
          id: string
          link_id: string
          source_page: string
          viewer_user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          brand_id?: string | null
          click_id: string
          created_at?: string
          creator_id: string
          id?: string
          link_id: string
          source_page?: string
          viewer_user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          brand_id?: string | null
          click_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          link_id?: string
          source_page?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_orders: {
        Row: {
          brand_id: string
          click_id: string
          commission_amount: number
          created_at: string
          creator_id: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          order_total: number
          original_commission_amount: number
          original_order_total: number
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          click_id: string
          commission_amount?: number
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          order_total?: number
          original_commission_amount?: number
          original_order_total?: number
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          click_id?: string
          commission_amount?: number
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          order_total?: number
          original_commission_amount?: number
          original_order_total?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_orders_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["click_id"]
          },
        ]
      }
      affiliate_refunds: {
        Row: {
          affiliate_order_id: string | null
          brand_id: string | null
          click_id: string
          commission_clawback_amount: number
          created_at: string
          creator_id: string | null
          currency: string
          id: string
          items_count: number | null
          line_items: Json | null
          link_id: string | null
          metadata: Json | null
          order_id: string
          order_total: number
          processed_at: string
          refund_amount_abs: number
          refund_id: string
          refund_note: string | null
          refund_ratio: number
          refund_reference: string | null
        }
        Insert: {
          affiliate_order_id?: string | null
          brand_id?: string | null
          click_id: string
          commission_clawback_amount?: number
          created_at?: string
          creator_id?: string | null
          currency?: string
          id?: string
          items_count?: number | null
          line_items?: Json | null
          link_id?: string | null
          metadata?: Json | null
          order_id: string
          order_total?: number
          processed_at?: string
          refund_amount_abs?: number
          refund_id: string
          refund_note?: string | null
          refund_ratio?: number
          refund_reference?: string | null
        }
        Update: {
          affiliate_order_id?: string | null
          brand_id?: string | null
          click_id?: string
          commission_clawback_amount?: number
          created_at?: string
          creator_id?: string | null
          currency?: string
          id?: string
          items_count?: number | null
          line_items?: Json | null
          link_id?: string | null
          metadata?: Json | null
          order_id?: string
          order_total?: number
          processed_at?: string
          refund_amount_abs?: number
          refund_id?: string
          refund_note?: string | null
          refund_ratio?: number
          refund_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_refunds_affiliate_order_id_fkey"
            columns: ["affiliate_order_id"]
            isOneToOne: false
            referencedRelation: "affiliate_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_accounts: {
        Row: {
          category: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_partner: boolean | null
          is_trending: boolean | null
          last_postback_at: string | null
          logo_upload_url: string | null
          logo_url: string | null
          mystorefront_api_key: string | null
          name: string
          owner_user_id: string
          plan_tier: string
          refund_buffer_days: number
          shopify_last_postback_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["brand_account_status"]
          store_url: string | null
          tiktok_url: string | null
          tracking_status: string | null
          updated_at: string
          webhook_secret: string | null
          website_url: string | null
          woocommerce_last_postback_at: string | null
        }
        Insert: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_partner?: boolean | null
          is_trending?: boolean | null
          last_postback_at?: string | null
          logo_upload_url?: string | null
          logo_url?: string | null
          mystorefront_api_key?: string | null
          name: string
          owner_user_id: string
          plan_tier?: string
          refund_buffer_days?: number
          shopify_last_postback_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["brand_account_status"]
          store_url?: string | null
          tiktok_url?: string | null
          tracking_status?: string | null
          updated_at?: string
          webhook_secret?: string | null
          website_url?: string | null
          woocommerce_last_postback_at?: string | null
        }
        Update: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_partner?: boolean | null
          is_trending?: boolean | null
          last_postback_at?: string | null
          logo_upload_url?: string | null
          logo_url?: string | null
          mystorefront_api_key?: string | null
          name?: string
          owner_user_id?: string
          plan_tier?: string
          refund_buffer_days?: number
          shopify_last_postback_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["brand_account_status"]
          store_url?: string | null
          tiktok_url?: string | null
          tracking_status?: string | null
          updated_at?: string
          webhook_secret?: string | null
          website_url?: string | null
          woocommerce_last_postback_at?: string | null
        }
        Relationships: []
      }
      brand_commission_settings: {
        Row: {
          brand_id: string
          created_at: string
          creator_payout_percent: number
          id: string
          platform_fee_percent: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_payout_percent?: number
          id?: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_payout_percent?: number
          id?: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_commission_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_creator_invites: {
        Row: {
          brand_id: string
          created_at: string
          created_by_user_id: string
          email_sent_at: string | null
          expires_at: string
          id: string
          invited_email: string | null
          invited_name: string | null
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          status: Database["public"]["Enums"]["brand_invite_status"]
          token_hash: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by_user_id: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["brand_invite_status"]
          token_hash: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by_user_id?: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["brand_invite_status"]
          token_hash?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_creator_invites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_payments: {
        Row: {
          admin_note: string | null
          amount: number
          brand_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          proof_of_payment_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["brand_payment_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          brand_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          proof_of_payment_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["brand_payment_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          brand_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          proof_of_payment_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["brand_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_payments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_report_snapshots: {
        Row: {
          created_at: string
          data_json: Json
          id: string
          report_id: string
        }
        Insert: {
          created_at?: string
          data_json: Json
          id?: string
          report_id: string
        }
        Update: {
          created_at?: string
          data_json?: Json
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "brand_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_reports: {
        Row: {
          brand_id: string
          created_at: string
          date_range_end: string
          date_range_start: string
          filters_json: Json | null
          id: string
          name: string
          status: string
          type: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          date_range_end: string
          date_range_start: string
          filters_json?: Json | null
          id?: string
          name: string
          status?: string
          type: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          filters_json?: Json | null
          id?: string
          name?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_reports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_saved_list_items: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          list_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          list_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_saved_list_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_saved_list_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_saved_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "brand_saved_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_saved_lists: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_saved_lists_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_shopify_settings: {
        Row: {
          brand_id: string
          created_at: string
          is_verified: boolean
          mystorefront_api_key: string
          plugin_base_url: string
          shop_domain: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          is_verified?: boolean
          mystorefront_api_key: string
          plugin_base_url?: string
          shop_domain: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          is_verified?: boolean
          mystorefront_api_key?: string
          plugin_base_url?: string
          shop_domain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_shopify_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_waitlist: {
        Row: {
          biggest_challenge: string | null
          brand_name: string
          created_at: string
          email: string
          full_name: string
          goals: string | null
          id: string
          partnership_types: string | null
          store_platform: string | null
          website_url: string | null
        }
        Insert: {
          biggest_challenge?: string | null
          brand_name: string
          created_at?: string
          email: string
          full_name: string
          goals?: string | null
          id?: string
          partnership_types?: string | null
          store_platform?: string | null
          website_url?: string | null
        }
        Update: {
          biggest_challenge?: string | null
          brand_name?: string
          created_at?: string
          email?: string
          full_name?: string
          goals?: string | null
          id?: string
          partnership_types?: string | null
          store_platform?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      brand_woocommerce_settings: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          is_verified: boolean
          last_verified_at: string | null
          updated_at: string | null
          woocommerce_api_key: string
          woocommerce_site_url: string
          woocommerce_webhook_url: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string | null
          woocommerce_api_key: string
          woocommerce_site_url: string
          woocommerce_webhook_url: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string | null
          woocommerce_api_key?: string
          woocommerce_site_url?: string
          woocommerce_webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_woocommerce_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          commission_percent: number | null
          created_at: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          is_partner: boolean | null
          is_trending: boolean | null
          logo_url: string | null
          name: string
          slug: string
          website_url: string | null
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_partner?: boolean | null
          is_trending?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          website_url?: string | null
        }
        Update: {
          commission_percent?: number | null
          created_at?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_partner?: boolean | null
          is_trending?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean | null
          product_ids: string[] | null
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          product_ids?: string[] | null
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          product_ids?: string[] | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participant_state: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_nudged_at: string | null
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_nudged_at?: string | null
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_nudged_at?: string | null
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participant_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_by_brand: boolean
          brand_id: string
          created_at: string
          creator_id: string
          id: string
          updated_at: string
        }
        Insert: {
          archived_by_brand?: boolean
          brand_id: string
          created_at?: string
          creator_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          archived_by_brand?: boolean
          brand_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_applications: {
        Row: {
          about_content: string | null
          admin_notes: string | null
          decline_reason: string | null
          email: string
          first_name: string
          follower_range: string
          id: string
          instagram_handle: string | null
          last_name: string
          other_link: string | null
          primary_platform: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["creator_application_status"]
          submitted_at: string
          tiktok_handle: string | null
          user_id: string | null
          whatsapp_number: string | null
          youtube_handle: string | null
        }
        Insert: {
          about_content?: string | null
          admin_notes?: string | null
          decline_reason?: string | null
          email: string
          first_name: string
          follower_range: string
          id?: string
          instagram_handle?: string | null
          last_name: string
          other_link?: string | null
          primary_platform: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["creator_application_status"]
          submitted_at?: string
          tiktok_handle?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
          youtube_handle?: string | null
        }
        Update: {
          about_content?: string | null
          admin_notes?: string | null
          decline_reason?: string | null
          email?: string
          first_name?: string
          follower_range?: string
          id?: string
          instagram_handle?: string | null
          last_name?: string
          other_link?: string | null
          primary_platform?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["creator_application_status"]
          submitted_at?: string
          tiktok_handle?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
      creator_kpi_snapshots: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          created_at: string
          creator_id: string
          engagement_rate: number | null
          id: string
          period_end: string
          period_start: string
          post_count: number | null
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          created_at?: string
          creator_id: string
          engagement_rate?: number | null
          id?: string
          period_end: string
          period_start: string
          post_count?: number | null
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          created_at?: string
          creator_id?: string
          engagement_rate?: number | null
          id?: string
          period_end?: string
          period_start?: string
          post_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_kpi_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_kpi_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_referrals: {
        Row: {
          accepted_at: string | null
          account_created_at: string | null
          application_id: string | null
          created_at: string
          id: string
          referred_email: string
          referred_name: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          account_created_at?: string | null
          application_id?: string | null
          created_at?: string
          id?: string
          referred_email: string
          referred_name?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          account_created_at?: string | null
          application_id?: string | null
          created_at?: string
          id?: string
          referred_email?: string
          referred_name?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_socials: {
        Row: {
          created_at: string | null
          id: string
          instagram_connected: boolean | null
          instagram_handle: string | null
          other_urls: string[] | null
          tiktok_connected: boolean | null
          tiktok_handle: string | null
          updated_at: string | null
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          other_urls?: string[] | null
          tiktok_connected?: boolean | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          other_urls?: string[] | null
          tiktok_connected?: boolean | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      creator_tags: {
        Row: {
          attributes: string[] | null
          created_at: string | null
          id: string
          locations: string[] | null
          niches: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attributes?: string[] | null
          created_at?: string | null
          id?: string
          locations?: string[] | null
          niches?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attributes?: string[] | null
          created_at?: string | null
          id?: string
          locations?: string[] | null
          niches?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creator_waitlist: {
        Row: {
          admin_notes: string | null
          biggest_challenge: string | null
          created_at: string
          email: string
          follower_range: string
          full_name: string
          id: string
          invite_expires_at: string | null
          invite_token_hash: string | null
          invite_used_at: string | null
          invited_user_id: string | null
          last_invite_sent_at: string | null
          niche: string
          primary_platform: string
          referral_source: string
          regret_email_sent_at: string | null
          social_handle: string
          status: Database["public"]["Enums"]["creator_waitlist_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          biggest_challenge?: string | null
          created_at?: string
          email: string
          follower_range: string
          full_name: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invite_used_at?: string | null
          invited_user_id?: string | null
          last_invite_sent_at?: string | null
          niche: string
          primary_platform: string
          referral_source: string
          regret_email_sent_at?: string | null
          social_handle: string
          status?: Database["public"]["Enums"]["creator_waitlist_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          biggest_challenge?: string | null
          created_at?: string
          email?: string
          follower_range?: string
          full_name?: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invite_used_at?: string | null
          invited_user_id?: string | null
          last_invite_sent_at?: string | null
          niche?: string
          primary_platform?: string
          referral_source?: string
          regret_email_sent_at?: string | null
          social_handle?: string
          status?: Database["public"]["Enums"]["creator_waitlist_status"]
          updated_at?: string
        }
        Relationships: []
      }
      creator_wishlist_items: {
        Row: {
          id: string
          link_id: string
          saved_at: string
          wishlist_id: string
        }
        Insert: {
          id?: string
          link_id: string
          saved_at?: string
          wishlist_id: string
        }
        Update: {
          id?: string
          link_id?: string
          saved_at?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_wishlist_items_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "creator_wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_wishlists: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          creator_id: string | null
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          minimum_order_value: number | null
          needs_sync: boolean
          notes: string | null
          shopify_price_rule_id: string | null
          shopify_sync_attempts: number
          shopify_sync_error: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
          wc_coupon_id: string | null
          woocommerce_sync_error: string | null
          woocommerce_synced: boolean
          woocommerce_synced_at: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          creator_id?: string | null
          discount_type?: string
          discount_value: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          minimum_order_value?: number | null
          needs_sync?: boolean
          notes?: string | null
          shopify_price_rule_id?: string | null
          shopify_sync_attempts?: number
          shopify_sync_error?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          wc_coupon_id?: string | null
          woocommerce_sync_error?: string | null
          woocommerce_synced?: boolean
          woocommerce_synced_at?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          creator_id?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          minimum_order_value?: number | null
          needs_sync?: boolean
          notes?: string | null
          shopify_price_rule_id?: string | null
          shopify_sync_attempts?: number
          shopify_sync_error?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          wc_coupon_id?: string | null
          woocommerce_sync_error?: string | null
          woocommerce_synced?: boolean
          woocommerce_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      explore_clicks: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          link_id: string
          source: string
          viewer_user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          link_id: string
          source?: string
          viewer_user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          link_id?: string
          source?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "explore_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_campaigns: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          product_image_url: string | null
          product_images: string[] | null
          product_name: string
          product_value: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          product_image_url?: string | null
          product_images?: string[] | null
          product_name: string
          product_value?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          product_image_url?: string | null
          product_images?: string[] | null
          product_name?: string
          product_value?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_requests: {
        Row: {
          brand_id: string
          campaign_id: string
          created_at: string
          creator_id: string
          creator_post_url: string | null
          id: string
          notes: string | null
          shipping_address: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          campaign_id: string
          created_at?: string
          creator_id: string
          creator_post_url?: string | null
          id?: string
          notes?: string | null
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          created_at?: string
          creator_id?: string
          creator_post_url?: string | null
          id?: string
          notes?: string | null
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "gift_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_audience_demographics: {
        Row: {
          audience_type: string
          created_at: string
          creator_id: string
          demographic_key: string
          demographic_type: string
          id: string
          value: number
        }
        Insert: {
          audience_type?: string
          created_at?: string
          creator_id: string
          demographic_key: string
          demographic_type: string
          id?: string
          value: number
        }
        Update: {
          audience_type?: string
          created_at?: string
          creator_id?: string
          demographic_key?: string
          demographic_type?: string
          id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "instagram_audience_demographics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_audience_demographics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_connections: {
        Row: {
          access_token_encrypted: string | null
          bio_description: string | null
          connected_at: string
          creator_id: string
          engagement_rate: number | null
          follower_count: number | null
          following_count: number | null
          id: string
          ig_user_id: string
          impressions: number | null
          last_sync_at: string | null
          media_count: number | null
          profile_picture_url: string | null
          reach: number | null
          status: Database["public"]["Enums"]["instagram_connection_status"]
          sync_error: string | null
          token_expires_at: string | null
          username: string
        }
        Insert: {
          access_token_encrypted?: string | null
          bio_description?: string | null
          connected_at?: string
          creator_id: string
          engagement_rate?: number | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id: string
          impressions?: number | null
          last_sync_at?: string | null
          media_count?: number | null
          profile_picture_url?: string | null
          reach?: number | null
          status?: Database["public"]["Enums"]["instagram_connection_status"]
          sync_error?: string | null
          token_expires_at?: string | null
          username: string
        }
        Update: {
          access_token_encrypted?: string | null
          bio_description?: string | null
          connected_at?: string
          creator_id?: string
          engagement_rate?: number | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id?: string
          impressions?: number | null
          last_sync_at?: string | null
          media_count?: number | null
          profile_picture_url?: string | null
          reach?: number | null
          status?: Database["public"]["Enums"]["instagram_connection_status"]
          sync_error?: string | null
          token_expires_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_growth_snapshots: {
        Row: {
          created_at: string
          creator_id: string
          follower_count: number
          following_count: number
          id: string
          month: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          follower_count: number
          following_count: number
          id?: string
          month: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          follower_count?: number
          following_count?: number
          id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_growth_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_growth_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_hashtags: {
        Row: {
          created_at: string
          creator_id: string
          hashtag: string
          id: string
          usage_count: number | null
          usage_percent: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          hashtag: string
          id?: string
          usage_count?: number | null
          usage_percent?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          hashtag?: string
          id?: string
          usage_count?: number | null
          usage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_hashtags_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_hashtags_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_mentions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          mention: string
          usage_count: number | null
          usage_percent: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          mention: string
          usage_count?: number | null
          usage_percent?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          mention?: string
          usage_count?: number | null
          usage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_mentions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_mentions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          cached_media_path: string | null
          caption_snippet: string | null
          comment_count: number | null
          created_at: string
          creator_id: string
          id: string
          ig_media_id: string
          is_sponsored: boolean | null
          like_count: number | null
          media_type: string | null
          media_url: string | null
          permalink: string | null
          thumbnail_url: string | null
          timestamp: string
        }
        Insert: {
          cached_media_path?: string | null
          caption_snippet?: string | null
          comment_count?: number | null
          created_at?: string
          creator_id: string
          id?: string
          ig_media_id: string
          is_sponsored?: boolean | null
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          thumbnail_url?: string | null
          timestamp: string
        }
        Update: {
          cached_media_path?: string | null
          caption_snippet?: string | null
          comment_count?: number | null
          created_at?: string
          creator_id?: string
          id?: string
          ig_media_id?: string
          is_sponsored?: boolean | null
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          thumbnail_url?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_sync_diagnostics: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          ig_user_id: string | null
          payload: Json
          scope: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          ig_user_id?: string | null
          payload?: Json
          scope: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          ig_user_id?: string | null
          payload?: Json
          scope?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          affiliate_url: string
          clicks: number | null
          content_url: string | null
          created_at: string | null
          description: string | null
          earned: number | null
          id: string
          is_deleted: boolean | null
          orders: number | null
          platform: string | null
          product_id: string | null
          product_image_url: string | null
          product_title: string
          retailer: string | null
          sort_order: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_url: string
          clicks?: number | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          earned?: number | null
          id?: string
          is_deleted?: boolean | null
          orders?: number | null
          platform?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_title: string
          retailer?: string | null
          sort_order?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_url?: string
          clicks?: number | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          earned?: number | null
          id?: string
          is_deleted?: boolean | null
          orders?: number | null
          platform?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_title?: string
          retailer?: string | null
          sort_order?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mention_campaigns: {
        Row: {
          brand_id: string
          content_deadline: string | null
          created_at: string | null
          deliverable_description: string | null
          deliverable_type: string
          description: string | null
          exclusivity_required: boolean
          fee_amount: number
          id: string
          max_creators: number | null
          payment_terms: string | null
          required_hashtags: string | null
          required_mentions: string | null
          revision_rounds: number
          status: string
          submission_deadline: string | null
          title: string
          updated_at: string | null
          usage_rights: string | null
        }
        Insert: {
          brand_id: string
          content_deadline?: string | null
          created_at?: string | null
          deliverable_description?: string | null
          deliverable_type: string
          description?: string | null
          exclusivity_required?: boolean
          fee_amount: number
          id?: string
          max_creators?: number | null
          payment_terms?: string | null
          required_hashtags?: string | null
          required_mentions?: string | null
          revision_rounds?: number
          status?: string
          submission_deadline?: string | null
          title: string
          updated_at?: string | null
          usage_rights?: string | null
        }
        Update: {
          brand_id?: string
          content_deadline?: string | null
          created_at?: string | null
          deliverable_description?: string | null
          deliverable_type?: string
          description?: string | null
          exclusivity_required?: boolean
          fee_amount?: number
          id?: string
          max_creators?: number | null
          payment_terms?: string | null
          required_hashtags?: string | null
          required_mentions?: string | null
          revision_rounds?: number
          status?: string
          submission_deadline?: string | null
          title?: string
          updated_at?: string | null
          usage_rights?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mention_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mention_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          brand_id: string
          brand_note: string | null
          campaign_id: string
          created_at: string | null
          creator_id: string
          creator_note: string | null
          fee_amount: number
          id: string
          post_submitted_at: string | null
          post_url: string | null
          revision_count: number
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          brand_id: string
          brand_note?: string | null
          campaign_id: string
          created_at?: string | null
          creator_id: string
          creator_note?: string | null
          fee_amount: number
          id?: string
          post_submitted_at?: string | null
          post_url?: string | null
          revision_count?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string
          brand_note?: string | null
          campaign_id?: string
          created_at?: string | null
          creator_id?: string
          creator_note?: string | null
          fee_amount?: number
          id?: string
          post_submitted_at?: string | null
          post_url?: string | null
          revision_count?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mention_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mention_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mention_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_moderation_flags: {
        Row: {
          content: string
          context: string
          conversation_id: string | null
          created_at: string
          id: string
          matched_phrase: string
          user_id: string
        }
        Insert: {
          content: string
          context?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_phrase: string
          user_id: string
        }
        Update: {
          content?: string
          context?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          matched_phrase?: string
          user_id?: string
        }
        Relationships: []
      }
      message_requests: {
        Row: {
          brand_id: string
          created_at: string
          creator_id: string
          id: string
          message: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creator_id: string
          id?: string
          message: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          brief_data: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
        }
        Insert: {
          brief_data?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
        }
        Update: {
          brief_data?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_clicks: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          creator_id: string
          id: string
          link_id: string
          source_page: string
          viewer_user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          creator_id: string
          id?: string
          link_id: string
          source_page?: string
          viewer_user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          link_id?: string
          source_page?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_collab_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          kind: string
          participant_id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          participant_id: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          participant_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "paid_collab_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "paid_collab_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_collab_participants: {
        Row: {
          collab_id: string
          created_at: string
          creator_id: string
          delivered_at: string | null
          draft_caption: string | null
          draft_planned_date: string | null
          id: string
          live_post_urls: string[]
          notes: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_status: string
          revision_count: number
          revision_note: string | null
          shipped_at: string | null
          shipping_address: string | null
          sizing_answer: string | null
          status: string
          tracking_carrier: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          verified_live_at: string | null
        }
        Insert: {
          collab_id: string
          created_at?: string
          creator_id: string
          delivered_at?: string | null
          draft_caption?: string | null
          draft_planned_date?: string | null
          id?: string
          live_post_urls?: string[]
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          revision_count?: number
          revision_note?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          sizing_answer?: string | null
          status?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          verified_live_at?: string | null
        }
        Update: {
          collab_id?: string
          created_at?: string
          creator_id?: string
          delivered_at?: string | null
          draft_caption?: string | null
          draft_planned_date?: string | null
          id?: string
          live_post_urls?: string[]
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          revision_count?: number
          revision_note?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          sizing_answer?: string | null
          status?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          verified_live_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paid_collab_participants_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "paid_collabs"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_collab_submissions: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          participant_id: string
          platform: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string | null
          updated_at: string
          version: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          participant_id: string
          platform?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          participant_id?: string
          platform?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "paid_collab_submissions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "paid_collab_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_collabs: {
        Row: {
          additional_notes: string | null
          attachment_name: string | null
          attachment_url: string | null
          brand_id: string
          compensation_type: string
          created_at: string
          creator_ids: string[] | null
          deliverables: string | null
          description: string | null
          dos_and_donts: string | null
          exclusivity_required: boolean
          fee_amount: number | null
          gift_campaign_id: string | null
          go_live_date: string | null
          id: string
          max_drafts: number | null
          other_platform: string | null
          payment_terms: string | null
          platforms: string[]
          product_image_url: string | null
          product_name: string | null
          product_value: number | null
          request_shipping_address: boolean
          required_hashtags: string | null
          required_mentions: string | null
          sizing_question: string | null
          status: string
          submission_deadline: string | null
          title: string
          updated_at: string
          usage_rights: string | null
        }
        Insert: {
          additional_notes?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          brand_id: string
          compensation_type: string
          created_at?: string
          creator_ids?: string[] | null
          deliverables?: string | null
          description?: string | null
          dos_and_donts?: string | null
          exclusivity_required?: boolean
          fee_amount?: number | null
          gift_campaign_id?: string | null
          go_live_date?: string | null
          id?: string
          max_drafts?: number | null
          other_platform?: string | null
          payment_terms?: string | null
          platforms?: string[]
          product_image_url?: string | null
          product_name?: string | null
          product_value?: number | null
          request_shipping_address?: boolean
          required_hashtags?: string | null
          required_mentions?: string | null
          sizing_question?: string | null
          status?: string
          submission_deadline?: string | null
          title: string
          updated_at?: string
          usage_rights?: string | null
        }
        Update: {
          additional_notes?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          brand_id?: string
          compensation_type?: string
          created_at?: string
          creator_ids?: string[] | null
          deliverables?: string | null
          description?: string | null
          dos_and_donts?: string | null
          exclusivity_required?: boolean
          fee_amount?: number | null
          gift_campaign_id?: string | null
          go_live_date?: string | null
          id?: string
          max_drafts?: number | null
          other_platform?: string | null
          payment_terms?: string | null
          platforms?: string[]
          product_image_url?: string | null
          product_name?: string | null
          product_value?: number | null
          request_shipping_address?: boolean
          required_hashtags?: string | null
          required_mentions?: string | null
          sizing_question?: string | null
          status?: string
          submission_deadline?: string | null
          title?: string
          updated_at?: string
          usage_rights?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paid_collabs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_collabs_gift_campaign_id_fkey"
            columns: ["gift_campaign_id"]
            isOneToOne: false
            referencedRelation: "gift_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_prompts: {
        Row: {
          amount_due: number
          brand_id: string
          created_at: string
          id: string
          is_dismissed: boolean
          message: string
          period_end: string | null
          period_start: string | null
          sent_by: string
        }
        Insert: {
          amount_due?: number
          brand_id: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          message?: string
          period_end?: string | null
          period_start?: string | null
          sent_by: string
        }
        Update: {
          amount_due?: number
          brand_id?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          message?: string
          period_end?: string | null
          period_start?: string | null
          sent_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_prompts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          account_holder: string | null
          account_number_encrypted: string | null
          account_number_masked: string | null
          account_type: string | null
          bank_name: string | null
          branch_code: string | null
          created_at: string
          id: string
          merchant_id: string | null
          merchant_key_encrypted: string | null
          passphrase_set: boolean | null
          signature_enabled: boolean | null
          status: Database["public"]["Enums"]["payout_account_status"]
          type: Database["public"]["Enums"]["payout_account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number_encrypted?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          merchant_key_encrypted?: string | null
          passphrase_set?: boolean | null
          signature_enabled?: boolean | null
          status?: Database["public"]["Enums"]["payout_account_status"]
          type: Database["public"]["Enums"]["payout_account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number_encrypted?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          merchant_key_encrypted?: string | null
          passphrase_set?: boolean | null
          signature_enabled?: boolean | null
          status?: Database["public"]["Enums"]["payout_account_status"]
          type?: Database["public"]["Enums"]["payout_account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          brand_payment_id: string | null
          created_at: string
          creator_id: string
          currency: string
          id: string
          payout_account_id: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["payout_request_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          brand_payment_id?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          payout_account_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_request_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          brand_payment_id?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          payout_account_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_brand_payment_id_fkey"
            columns: ["brand_payment_id"]
            isOneToOne: false
            referencedRelation: "brand_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      placeholder_analytics: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          json_value: Json | null
          key: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          json_value?: Json | null
          key: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          json_value?: Json | null
          key?: string
        }
        Relationships: [
          {
            foreignKeyName: "placeholder_analytics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_analytics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          commission_percent: number | null
          created_at: string | null
          external_url: string | null
          id: string
          image_url: string | null
          price: number | null
          retailer: string | null
          title: string
          variations: string[] | null
        }
        Insert: {
          brand_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          retailer?: string | null
          title: string
          variations?: string[] | null
        }
        Update: {
          brand_id?: string | null
          commission_percent?: number | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          retailer?: string | null
          title?: string
          variations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          instagram_connected: boolean | null
          is_discoverable: boolean
          last_activity_at: string | null
          location_tags: string[] | null
          marketing_consent: boolean
          marketing_consent_updated_at: string | null
          niche_tags: string[] | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          photo_url: string | null
          tier: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          instagram_connected?: boolean | null
          is_discoverable?: boolean
          last_activity_at?: string | null
          location_tags?: string[] | null
          marketing_consent?: boolean
          marketing_consent_updated_at?: string | null
          niche_tags?: string[] | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          photo_url?: string | null
          tier?: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          instagram_connected?: boolean | null
          is_discoverable?: boolean
          last_activity_at?: string | null
          location_tags?: string[] | null
          marketing_consent?: boolean
          marketing_consent_updated_at?: string | null
          niche_tags?: string[] | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          photo_url?: string | null
          tier?: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      shopper_activity: {
        Row: {
          activity_type: string
          created_at: string
          creator_id: string | null
          id: string
          link_id: string | null
          metadata: Json | null
          shopper_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          creator_id?: string | null
          id?: string
          link_id?: string | null
          metadata?: Json | null
          shopper_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          link_id?: string | null
          metadata?: Json | null
          shopper_id?: string
        }
        Relationships: []
      }
      shopper_follows: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          shopper_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          shopper_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          shopper_id?: string
        }
        Relationships: []
      }
      shopper_profiles: {
        Row: {
          created_at: string
          id: string
          marketing_consent: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_consent?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_consent?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopper_wishlists: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          link_id: string
          shopper_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          link_id: string
          shopper_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          link_id?: string
          shopper_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tiktok_connections: {
        Row: {
          access_token_encrypted: string
          bio_description: string | null
          connected_at: string
          created_at: string
          creator_id: string
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          last_sync_at: string | null
          likes_count: number | null
          profile_picture_url: string | null
          refresh_token_encrypted: string | null
          status: Database["public"]["Enums"]["tiktok_connection_status"]
          sync_error: string | null
          tiktok_user_id: string
          token_expires_at: string | null
          updated_at: string
          username: string
          video_count: number | null
        }
        Insert: {
          access_token_encrypted: string
          bio_description?: string | null
          connected_at?: string
          created_at?: string
          creator_id: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          last_sync_at?: string | null
          likes_count?: number | null
          profile_picture_url?: string | null
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["tiktok_connection_status"]
          sync_error?: string | null
          tiktok_user_id: string
          token_expires_at?: string | null
          updated_at?: string
          username: string
          video_count?: number | null
        }
        Update: {
          access_token_encrypted?: string
          bio_description?: string | null
          connected_at?: string
          created_at?: string
          creator_id?: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          last_sync_at?: string | null
          likes_count?: number | null
          profile_picture_url?: string | null
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["tiktok_connection_status"]
          sync_error?: string | null
          tiktok_user_id?: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      public_profiles: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          instagram_connected: boolean | null
          is_discoverable: boolean | null
          location_tags: string[] | null
          niche_tags: string[] | null
          photo_url: string | null
          tier: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected: boolean | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          instagram_connected?: boolean | null
          is_discoverable?: boolean | null
          location_tags?: string[] | null
          niche_tags?: string[] | null
          photo_url?: string | null
          tier?: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected?: boolean | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          instagram_connected?: boolean | null
          is_discoverable?: boolean | null
          location_tags?: string[] | null
          niche_tags?: string[] | null
          photo_url?: string | null
          tier?: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_brand: {
        Args: {
          p_category?: string
          p_commission_percent?: number
          p_description?: string
          p_name: string
          p_owner_user_id: string
          p_refund_buffer_days?: number
          p_status?: string
          p_website_url?: string
        }
        Returns: Json
      }
      admin_delete_brand: { Args: { p_brand_id: string }; Returns: undefined }
      admin_find_auth_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          id: string
          raw_user_meta_data: Json
        }[]
      }
      admin_get_instagram_diagnostics: {
        Args: { p_creator_id: string }
        Returns: {
          created_at: string
          creator_id: string
          id: string
          ig_user_id: string | null
          payload: Json
          scope: string
        }[]
        SetofOptions: {
          from: "*"
          to: "instagram_sync_diagnostics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      brand_can_view_creator: {
        Args: { p_creator_id: string }
        Returns: boolean
      }
      brand_has_creator_relationship: {
        Args: { p_creator_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_creator_waitlist_invites: { Args: never; Returns: number }
      generate_brand_api_key: { Args: { p_brand_id: string }; Returns: string }
      generate_brand_slug: { Args: { brand_name: string }; Returns: string }
      generate_unique_username: {
        Args: { p_display_name: string; p_email: string; p_user_id: string }
        Returns: string
      }
      get_all_brand_accounts: {
        Args: never
        Returns: {
          category: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_partner: boolean | null
          is_trending: boolean | null
          last_postback_at: string | null
          logo_upload_url: string | null
          logo_url: string | null
          mystorefront_api_key: string | null
          name: string
          owner_user_id: string
          plan_tier: string
          refund_buffer_days: number
          shopify_last_postback_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["brand_account_status"]
          store_url: string | null
          tiktok_url: string | null
          tracking_status: string | null
          updated_at: string
          webhook_secret: string | null
          website_url: string | null
          woocommerce_last_postback_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "brand_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_links_admin: {
        Args: never
        Returns: {
          affiliate_url: string
          clicks: number | null
          content_url: string | null
          created_at: string | null
          description: string | null
          earned: number | null
          id: string
          is_deleted: boolean | null
          orders: number | null
          platform: string | null
          product_id: string | null
          product_image_url: string | null
          product_title: string
          retailer: string | null
          sort_order: number
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_profiles_admin: {
        Args: never
        Returns: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          instagram_connected: boolean | null
          is_discoverable: boolean
          last_activity_at: string | null
          location_tags: string[] | null
          marketing_consent: boolean
          marketing_consent_updated_at: string | null
          niche_tags: string[] | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          photo_url: string | null
          tier: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected: boolean | null
          updated_at: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_brand_invite_by_email: {
        Args: { p_brand_id: string; p_email: string }
        Returns: {
          created_at: string
          email_sent_at: string
          expires_at: string
          id: string
          invited_name: string
          redeemed_by_user_id: string
          status: Database["public"]["Enums"]["brand_invite_status"]
          welcome_message: string
        }[]
      }
      get_brand_invite_by_hash: {
        Args: { p_token_hash: string }
        Returns: {
          brand_id: string
          brand_logo_url: string
          brand_name: string
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["brand_invite_status"]
          welcome_message: string
        }[]
      }
      get_brand_owner_user_id: { Args: { p_brand_id: string }; Returns: string }
      get_creator_balance: {
        Args: { p_creator_id: string }
        Returns: {
          available_balance: number
          locked_amount: number
          paid_amount: number
          total_earned: number
        }[]
      }
      get_creator_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          accepted_count: number
          account_created_count: number
          declined_count: number
          pending_count: number
          total_count: number
        }[]
      }
      get_creator_waitlist_invite_by_hash: {
        Args: { p_token_hash: string }
        Returns: {
          email: string
          full_name: string
          id: string
          invite_expires_at: string
          invite_used_at: string
          status: Database["public"]["Enums"]["creator_waitlist_status"]
        }[]
      }
      get_discoverable_creators_with_instagram: {
        Args: never
        Returns: {
          bio: string
          cover_image_url: string
          created_at: string
          display_name: string
          id: string
          niche_tags: string[]
          photo_url: string
          tier: string
          username: string
        }[]
      }
      get_email_queue_service_key: { Args: never; Returns: string }
      get_own_brand_account: {
        Args: never
        Returns: {
          category: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_partner: boolean | null
          is_trending: boolean | null
          last_postback_at: string | null
          logo_upload_url: string | null
          logo_url: string | null
          mystorefront_api_key: string | null
          name: string
          owner_user_id: string
          plan_tier: string
          refund_buffer_days: number
          shopify_last_postback_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["brand_account_status"]
          store_url: string | null
          tiktok_url: string | null
          tracking_status: string | null
          updated_at: string
          webhook_secret: string | null
          website_url: string | null
          woocommerce_last_postback_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "brand_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_own_links: {
        Args: never
        Returns: {
          affiliate_url: string
          clicks: number | null
          content_url: string | null
          created_at: string | null
          description: string | null
          earned: number | null
          id: string
          is_deleted: boolean | null
          orders: number | null
          platform: string | null
          product_id: string | null
          product_image_url: string | null
          product_title: string
          retailer: string | null
          sort_order: number
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_own_links_full: {
        Args: { p_include_archived?: boolean }
        Returns: {
          affiliate_url: string
          clicks: number | null
          content_url: string | null
          created_at: string | null
          description: string | null
          earned: number | null
          id: string
          is_deleted: boolean | null
          orders: number | null
          platform: string | null
          product_id: string | null
          product_image_url: string | null
          product_title: string
          retailer: string | null
          sort_order: number
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_own_profile: {
        Args: never
        Returns: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          instagram_connected: boolean | null
          is_discoverable: boolean
          last_activity_at: string | null
          location_tags: string[] | null
          marketing_consent: boolean
          marketing_consent_updated_at: string | null
          niche_tags: string[] | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          photo_url: string | null
          tier: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected: boolean | null
          updated_at: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_paid_collab_allowlisted_creator: {
        Args: never
        Returns: {
          display_name: string
          id: string
          photo_url: string
          username: string
        }[]
      }
      get_payout_account_number: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_profile_admin: {
        Args: { _user_id: string }
        Returns: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          instagram_connected: boolean | null
          is_discoverable: boolean
          last_activity_at: string | null
          location_tags: string[] | null
          marketing_consent: boolean
          marketing_consent_updated_at: string | null
          niche_tags: string[] | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          photo_url: string | null
          tier: Database["public"]["Enums"]["creator_tier"] | null
          tiktok_connected: boolean | null
          updated_at: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_brand_logos: {
        Args: never
        Returns: {
          logo_url: string
          name: string
        }[]
      }
      get_public_creator_links: {
        Args: { p_user_id: string }
        Returns: {
          affiliate_url: string
          created_at: string
          description: string
          id: string
          product_image_url: string
          product_title: string
          retailer: string
          sort_order: number
        }[]
      }
      get_public_creator_profile: {
        Args: { p_username: string }
        Returns: {
          attribute_tags: string[]
          bio: string
          display_name: string
          id: string
          location_tags: string[]
          niche_tags: string[]
          photo_url: string
          tier: string
          username: string
        }[]
      }
      get_trending_links: {
        Args: {
          p_exclude_user?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          affiliate_url: string
          created_at: string
          id: string
          product_image_url: string
          product_title: string
          retailer: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_owner_of_collab: {
        Args: { p_collab_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_brand_id_for_link: {
        Args: { p_link_id: string }
        Returns: string
      }
      resolve_creator_referrer: {
        Args: { p_ref: string }
        Returns: {
          display_name: string
          id: string
          username: string
        }[]
      }
      save_eft_payout_account: {
        Args: {
          p_account_holder: string
          p_account_number: string
          p_account_type: string
          p_bank_name: string
          p_branch_code: string
        }
        Returns: undefined
      }
      slugify_username: { Args: { input: string }; Returns: string }
      verify_push_discount_token: {
        Args: { p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "creator" | "brand" | "admin" | "shopper"
      brand_account_status: "pending" | "approved" | "rejected" | "suspended"
      brand_invite_status: "active" | "redeemed" | "revoked" | "expired"
      brand_payment_status: "pending" | "under_review" | "verified" | "rejected"
      creator_application_status:
        | "pending"
        | "approved"
        | "declined"
        | "more_info_needed"
      creator_tier: "enthusiast" | "ambassador" | "trendsetter" | "icon"
      creator_waitlist_status:
        | "pending_review"
        | "invite_sent"
        | "account_created"
        | "expired"
        | "not_accepting"
      instagram_connection_status:
        | "connected"
        | "disconnected"
        | "error"
        | "token_expired"
      payout_account_status: "inactive" | "active"
      payout_account_type: "EFT" | "PAYFAST"
      payout_request_status: "pending" | "approved" | "paid" | "rejected"
      tiktok_connection_status:
        | "connected"
        | "disconnected"
        | "error"
        | "token_expired"
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
      app_role: ["creator", "brand", "admin", "shopper"],
      brand_account_status: ["pending", "approved", "rejected", "suspended"],
      brand_invite_status: ["active", "redeemed", "revoked", "expired"],
      brand_payment_status: ["pending", "under_review", "verified", "rejected"],
      creator_application_status: [
        "pending",
        "approved",
        "declined",
        "more_info_needed",
      ],
      creator_tier: ["enthusiast", "ambassador", "trendsetter", "icon"],
      creator_waitlist_status: [
        "pending_review",
        "invite_sent",
        "account_created",
        "expired",
        "not_accepting",
      ],
      instagram_connection_status: [
        "connected",
        "disconnected",
        "error",
        "token_expired",
      ],
      payout_account_status: ["inactive", "active"],
      payout_account_type: ["EFT", "PAYFAST"],
      payout_request_status: ["pending", "approved", "paid", "rejected"],
      tiktok_connection_status: [
        "connected",
        "disconnected",
        "error",
        "token_expired",
      ],
    },
  },
} as const
