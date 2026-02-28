import { redirect } from 'next/navigation'

export const metadata = {
    title: 'User Management - Kanban Admin',
}

export const dynamic = 'force-dynamic'

export default function AdminUsersRedirectPage() {
    redirect('/admin/settings')
}
