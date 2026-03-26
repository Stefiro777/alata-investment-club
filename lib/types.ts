export type Alumni = {
  id: string
  name: string
  role: string
  graduation_year: string | null
  linkedin_url: string | null
  current_company: string | null
  order_index?: number | null
  created_at?: string
}

export type AlumniCompany = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
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

