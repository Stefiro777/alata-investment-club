export type Alumni = {
  id: string
  name: string
  role: string
  graduation_year: string | null
  linkedin_url: string | null
  current_company: string | null
  industry: string | null
  order_index?: number | null
  created_at?: string
}

export type FeaturedReport = {
  id: string
  title: string
  description: string
  image_url?: string | null
  pdf_url: string | null
  authors: string | null
  display_order: number
  created_at?: string
}

export type AlumniCompany = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  created_at: string
}

export type Partner = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  order_index: number | null
  click_count: number
  created_at: string
}

export type Resource = {
  id: string
  title: string
  description: string | null
  url: string
  category: string
  subcategory: string | null
  subcategory_order: number | null
  is_folder: boolean
  order_index: number | null
  created_at: string
}

export type UpcomingEvent = {
  id: string
  date: string
  title: string
  description: string | null
  status: 'open' | 'coming_soon' | 'completed'
  action_type: 'form' | 'link' | null
  action_link: string | null
  display_order: number | null
  created_at: string
}

export type EventRegistration = {
  id: string
  event_id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  anno_di_studio: string
  motivazione: string
  created_at: string
}

export type Review = {
  id: string
  type: 'alumni' | 'events'
  author_name: string
  author_role?: string | null
  content: string
  rating?: number | null
  visible: boolean
  created_at: string
}

