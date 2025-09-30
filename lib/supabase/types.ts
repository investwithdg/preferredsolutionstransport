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
          created_at: string | null
          stripe_checkout_session_id?: string | null
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
          created_at?: string | null
          stripe_checkout_session_id?: string | null
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
          created_at?: string | null
          stripe_checkout_session_id?: string | null
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
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
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
          created_at: string | null
          source?: string | null
          event_id?: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          actor: string
          event_type: string
          payload: Json
          created_at?: string | null
          source?: string | null
          event_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          actor?: string
          event_type?: string
          payload?: Json
          created_at?: string | null
          source?: string | null
          event_id?: string | null
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
      drivers: {
        Row: {
          id: string
          name: string
          phone: string
          vehicle_details: string | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone: string
          vehicle_details?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          vehicle_details?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: "Draft" | "AwaitingPayment" | "ReadyForDispatch" | "Assigned" | "Accepted" | "PickedUp" | "InTransit" | "Delivered" | "Canceled"
      user_role: "admin" | "dispatcher" | "driver" | "recipient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
