'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/kanban'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Save } from 'lucide-react'

// Using an extended type because we join with departments for display
type AdminProfile = Profile & { department: { name: string } | null }

export default function UserManagement({ initialUsers }: { initialUsers: AdminProfile[] }) {
    const [users, setUsers] = useState<AdminProfile[]>(initialUsers)
    const [savingId, setSavingId] = useState<string | null>(null)
    const supabase = createClient()

    const handleToggle = (userId: string, field: keyof Profile, checked: boolean) => {
        setUsers(users.map(u => u.id === userId ? { ...u, [field]: checked } : u))
    }

    const handleRoleChange = (userId: string, newRole: string) => {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }

    const handleSave = async (userId: string) => {
        setSavingId(userId)
        const userToSave = users.find(u => u.id === userId)
        if (!userToSave) return

        const { error } = await supabase
            .from('profiles')
            .update({
                role: userToSave.role,
                is_admin: userToSave.is_admin,
                is_department_admin: userToSave.is_department_admin,
                can_manage_global_messages: userToSave.can_manage_global_messages,
                can_manage_lists: userToSave.can_manage_lists,
            })
            .eq('id', userId)

        if (error) {
            toast.error('Failed to update user: ' + error.message)
        } else {
            toast.success('User updated successfully')
        }
        setSavingId(null)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Display Title (Role)</th>
                            <th className="px-6 py-4 text-center">Global Admin</th>
                            <th className="px-6 py-4 text-center">Dept Admin</th>
                            <th className="px-6 py-4 text-center">Manage Global Msgs</th>
                            <th className="px-6 py-4 text-center">Manage Lists</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{user.full_name || 'No Name'}</div>
                                    <div className="text-slate-500 text-xs">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {user.department?.name || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <Input
                                        value={user.role || ''}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="h-8 max-w-[150px]"
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Checkbox
                                        checked={user.is_admin}
                                        onCheckedChange={(c) => handleToggle(user.id, 'is_admin', c as boolean)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Checkbox
                                        checked={user.is_department_admin}
                                        onCheckedChange={(c) => handleToggle(user.id, 'is_department_admin', c as boolean)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Checkbox
                                        checked={user.can_manage_global_messages}
                                        onCheckedChange={(c) => handleToggle(user.id, 'can_manage_global_messages', c as boolean)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Checkbox
                                        checked={user.can_manage_lists}
                                        onCheckedChange={(c) => handleToggle(user.id, 'can_manage_lists', c as boolean)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Button
                                        size="sm"
                                        onClick={() => handleSave(user.id)}
                                        disabled={savingId === user.id}
                                        className="h-8 shadow-none"
                                    >
                                        {savingId === user.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                        Save
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {users.length === 0 && (
                <div className="p-8 text-center text-slate-500">No users found.</div>
            )}
        </div>
    )
}
