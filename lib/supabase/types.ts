export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          phone?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      delivery_proof: {
        Row: {
          id: string
          order_id: string
          driver_id: string
          photo_urls: string[]
          signature_url: string | null
          notes: string | null
          recipient_name: string | null
          delivered_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          driver_id: string
          photo_urls?: string[]
          signature_url?: string | null
          notes?: string | null
          recipient_name?: string | null
          delivered_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          driver_id?: string
          photo_urls?: string[]
          signature_url?: string | null
          notes?: string | null
          recipient_name?: string | null
          delivered_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proof_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_proof_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      dispatch_events: {
        Row: {
          id: string
          order_id: string | null
          actor: string
          event_type: string
          payload: Json
          source: string | null
          event_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          actor: string
          event_type: string
          payload: Json
          source?: string | null
          event_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          actor?: string
          event_type?: string
          payload?: Json
          source?: string | null
          event_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      drivers: {
        Row: {
          id: string
          name: string
          phone: string
          vehicle_details: string | null
          user_id: string | null
          push_subscription: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone: string
          vehicle_details?: string | null
          user_id?: string | null
          push_subscription?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          vehicle_details?: string | null
          user_id?: string | null
          push_subscription?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          quote_id: string | null
          customer_id: string | null
          driver_id: string | null
          price_total: number
          currency: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          quote_id?: string | null
          customer_id?: string | null
          driver_id?: string | null
          price_total: number
          currency?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          quote_id?: string | null
          customer_id?: string | null
          driver_id?: string | null
          price_total?: number
          currency?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          }
        ]
      }
      quotes: {
        Row: {
          id: string
          customer_id: string | null
          pickup_address: string
          dropoff_address: string
          distance_mi: number
          weight_lb: number | null
          pricing: Json
          expires_at: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          pickup_address: string
          dropoff_address: string
          distance_mi: number
          weight_lb?: number | null
          pricing: Json
          expires_at?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          pickup_address?: string
          dropoff_address?: string
          distance_mi?: number
          weight_lb?: number | null
          pricing?: Json
          expires_at?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          email: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          auth_id?: string | null
          email?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          auth_id?: string | null
          email?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          processed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          processed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: 
        | "Draft" 
        | "AwaitingPayment" 
        | "ReadyForDispatch" 
        | "Assigned" 
        | "Accepted" 
        | "PickedUp" 
        | "InTransit" 
        | "Delivered" 
        | "Canceled"
      user_role: "admin" | "dispatcher" | "driver" | "recipient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never
