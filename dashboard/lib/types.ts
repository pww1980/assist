export interface Todo {
  id: number
  title: string
  description?: string
  due_date?: string
  priority: 1 | 2 | 3
  completed: boolean
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: number
  title: string
  start_time: string
  end_time: string
  location?: string
  description?: string
  reminder_offset?: number
  created_at: string
  updated_at: string
}

export interface Idea {
  id: number
  title: string
  content: string
  tags?: string[]
  source?: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface ShoppingItem {
  id: number
  title: string
  category?: string
  quantity?: number
  unit?: string
  checked: boolean
  store_name?: string
  price?: number
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: number
  type: string
  target_ref: string
  remind_at: string
  channel: string
  sent: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface RefreshResponse {
  access_token: string
}

export type RealtimeEventType =
  | 'todo.created'
  | 'todo.updated'
  | 'todo.deleted'
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'idea.created'
  | 'idea.updated'
  | 'idea.deleted'
  | 'shopping.created'
  | 'shopping.updated'
  | 'shopping.deleted'
  | 'reminder.created'
  | 'reminder.updated'
  | 'reminder.deleted'

export interface RealtimeEvent {
  event: RealtimeEventType
  data: unknown
}
