export type Department = {
    id: string
    name: string
    icon: string | null
    parent_ids: string[] | null
    color?: string | null
    created_at: string
}

export type Profile = {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    department_id: string | null
    role: string
    is_admin: boolean
    is_department_admin: boolean
    can_manage_global_messages: boolean
    can_manage_lists: boolean
}

export type Board = {
    id: string
    created_at: string
    department_id: string
    title: string
    background_color: string | null
    is_active: boolean
}

export type List = {
    id: string
    created_at: string
    board_id: string | null
    title: string
    order: number
    is_global: boolean
    target_department_id: string | null
    color?: string | null
}

export type Card = {
    id: string
    created_at: string
    updated_at: string
    list_id: string
    title: string
    description: string | null
    order: number
    due_date: string | null
    created_by: string | null
    card_type?: string
    source_department_id?: string | null
    status?: string
    cover_image_url?: string | null
    labels?: any[]
    author?: {
        id: string
        full_name: string | null
        role: string
    } | null
}

export type CardAssignee = {
    card_id: string
    user_id: string
}

// Helper types for UI
export type ListWithCards = List & { cards: Card[] }
export type BoardWithDetails = Board & { lists: ListWithCards[] }
