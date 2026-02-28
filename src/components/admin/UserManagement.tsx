'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/kanban'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Save, Trash2, UserPlus } from 'lucide-react'
import { createUser, deleteUser } from '@/lib/api/users'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Using an extended type because we join with departments for display
type AdminProfile = Profile & { department: { name: string } | null }

export default function UserManagement({ initialUsers, departments }: { initialUsers: AdminProfile[], departments: { id: string, name: string }[] }) {
    const [users, setUsers] = useState<AdminProfile[]>(initialUsers)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    // Sync if server prop changes
    useEffect(() => {
        setUsers(initialUsers)
    }, [initialUsers])

    // Create User Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        departmentId: 'none',
        role: '',
        isDepartmentAdmin: false
    })

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
            toast.success('使用者權限已更新')
        }
        setSavingId(null)
    }

    const handleDelete = async (userId: string, targetName: string) => {
        if (!confirm(`確定要刪除使用者 ${targetName || 'Unknown'} 嗎？這個操作無法復原。`)) {
            return
        }

        setDeletingId(userId)
        const result = await deleteUser(userId)

        if (!result.success) {
            toast.error('刪除失敗: ' + result.error)
        } else {
            toast.success('使用者已徹底刪除')
            setUsers(users.filter(u => u.id !== userId))
        }
        setDeletingId(null)
    }

    const handleCreateUser = async () => {
        if (!formData.email || !formData.fullName) {
            toast.error('請填寫信箱與姓名')
            return
        }

        setIsCreating(true)
        try {
            const result = await createUser({
                email: formData.email,
                password: formData.password || undefined,
                fullName: formData.fullName,
                departmentId: formData.departmentId === 'none' ? null : (formData.departmentId || null),
                role: formData.role,
                isDepartmentAdmin: formData.isDepartmentAdmin
            })

            if (!result.success) {
                toast.error('建立失敗: ' + result.error)
            } else {
                toast.success('建立成功')
                setIsCreateOpen(false)
                setFormData({
                    email: '', password: '', fullName: '', departmentId: 'none', role: '', isDepartmentAdmin: false
                })
                // Refresh to fetch joined department data for the new user row
                router.refresh()
            }
        } catch (error: any) {
            console.error('Create User Error:', error)
            toast.error('系統發生預期外的錯誤，請稍後再試或檢查日誌。' + (error.message || ''))
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                    <UserPlus size={16} />
                    新增使用者
                </Button>
            </div>

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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(user.id)}
                                                disabled={savingId === user.id}
                                                className="h-8 w-24 shadow-none bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                            >
                                                {savingId === user.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(user.id, user.full_name || '')}
                                                disabled={deletingId === user.id}
                                                title="刪除此帳號"
                                                className="h-8 w-8 p-0"
                                            >
                                                {deletingId === user.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && (
                    <div className="p-8 text-center text-slate-500">不存在任何使用者</div>
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>新增系統使用者</DialogTitle>
                        <DialogDescription>
                            透過此表單直接建立新帳號，並分配其初始部門與管理者權限。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">信箱 (Email)</Label>
                            <Input id="email" className="col-span-3" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="user@example.com" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pwd" className="text-right">密碼</Label>
                            <Input id="pwd" type="password" className="col-span-3" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="留空則預設為 kanban1234" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fname" className="text-right">真實姓名</Label>
                            <Input id="fname" className="col-span-3" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="例如: 陳小明" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">職稱</Label>
                            <Input id="role" className="col-span-3" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="例如: 工程師" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">所屬部門</Label>
                            <div className="col-span-3">
                                <Select value={formData.departmentId} onValueChange={(val) => setFormData({ ...formData, departmentId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="請選擇部門 (可留空)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- 無 --</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4 mt-2">
                            <div className="col-start-2 col-span-3 flex items-center space-x-2">
                                <Checkbox
                                    id="isDeptAdmin"
                                    checked={formData.isDepartmentAdmin}
                                    onCheckedChange={(c) => setFormData({ ...formData, isDepartmentAdmin: c as boolean })}
                                />
                                <Label htmlFor="isDeptAdmin" className="cursor-pointer font-medium text-slate-700">賦予管理權限 (包含主管/副主管/行政等)</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                        <Button onClick={handleCreateUser} disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-700">
                            {isCreating ? '建立中...' : '確認新增'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
