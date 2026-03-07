'use client'

import { useState, useRef } from 'react'
import { Department } from '@/types/kanban'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2, Lock, KeyRound } from 'lucide-react'
import { createDepartment, updateDepartment, deleteDepartment, updateDepartmentOrder, uploadDepartmentIcon } from '@/app/actions/department'
import { updateDepartmentPassword } from '@/app/actions/departmentPassword'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import * as Switch from '@radix-ui/react-switch'

const AVAILABLE_ICONS = ['Briefcase', 'Building2', 'Factory', 'Monitor', 'Cpu', 'Users', 'Wrench', 'Truck', 'Zap', 'Shield']

const AVAILABLE_COLORS = [
    { name: 'Indigo', value: '#4F46E5', bg: 'bg-[#4F46E5]' },
    { name: 'Rose', value: '#E11D48', bg: 'bg-[#E11D48]' },
    { name: 'Emerald', value: '#10B981', bg: 'bg-[#10B981]' },
    { name: 'Amber', value: '#F59E0B', bg: 'bg-[#F59E0B]' },
    { name: 'Blue', value: '#3B82F6', bg: 'bg-[#3B82F6]' },
    { name: 'Purple', value: '#8B5CF6', bg: 'bg-[#8B5CF6]' },
    { name: 'Slate', value: '#64748B', bg: 'bg-[#64748B]' },
]

export default function DepartmentManager({
    initialDepartments,
    isAdmin,
    manageableDepartmentIds
}: {
    initialDepartments: Department[],
    isAdmin: boolean,
    manageableDepartmentIds?: string[]
}) {
    const router = useRouter()
    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].departments

    const [departments, setDepartments] = useState<Department[]>(initialDepartments)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createName, setCreateName] = useState('')
    const [createIcon, setCreateIcon] = useState('Briefcase')
    const [createCustomIconUrl, setCreateCustomIconUrl] = useState('')
    const [createIsGroup, setCreateIsGroup] = useState(false)
    const [createParentIds, setCreateParentIds] = useState<string[]>([])
    const [createColor, setCreateColor] = useState('#4F46E5')
    const [isCreating, setIsCreating] = useState(false)

    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [editName, setEditName] = useState('')
    const [editIcon, setEditIcon] = useState('Briefcase')
    const [editCustomIconUrl, setEditCustomIconUrl] = useState('')
    const [editIsGroup, setEditIsGroup] = useState(false)
    const [editParentIds, setEditParentIds] = useState<string[]>([])
    const [editColor, setEditColor] = useState('#4F46E5')
    const [isEditing, setIsEditing] = useState(false)

    const [deletingDept, setDeletingDept] = useState<Department | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [passwordDept, setPasswordDept] = useState<Department | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    // Drag-and-drop state
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    const handleDragStart = (index: number) => {
        dragItem.current = index
    }

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index
        setDragOverIndex(index)
    }

    const handleDragEnd = async () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            setDragOverIndex(null)
            return
        }

        const reordered = [...departments]
        const [draggedItem] = reordered.splice(dragItem.current, 1)
        reordered.splice(dragOverItem.current, 0, draggedItem)

        setDepartments(reordered)
        setDragOverIndex(null)
        dragItem.current = null
        dragOverItem.current = null

        // Save new order to database
        const orderedIds = reordered.map((dept, i) => ({
            id: dept.id,
            display_order: (i + 1) * 1000,
        }))

        const result = await updateDepartmentOrder(orderedIds)
        if (result.error) {
            toast.error(result.error)
            setDepartments(initialDepartments) // revert on error
        }
    }

    const handleCreate = async () => {
        if (!createName.trim()) return
        setIsCreating(true)
        try {
            let finalIconUrl = createCustomIconUrl
            // If they selected a file, upload it here
            const fileInput = document.getElementById('create-icon-upload') as HTMLInputElement
            if (fileInput?.files?.[0]) {
                const formData = new FormData()
                formData.append('file', fileInput.files[0])
                const { data, error } = await uploadDepartmentIcon(formData)
                if (data) finalIconUrl = data
                else if (error) toast.error("上傳失敗: " + error)
            }

            const res = await createDepartment(createName.trim(), createIcon, createParentIds, createColor, finalIconUrl, createIsGroup)
            if (res?.error) {
                toast.error(res.error)
            } else if (res?.data) {
                toast.success(dict.saving)
                setDepartments([...departments, res.data as Department])
                setIsCreateOpen(false)
                setCreateName('')
                setCreateCustomIconUrl('')
                setCreateIsGroup(false)
                router.refresh()
            }
        } catch (error: any) {
            console.error("handleCreate Error:", error)
            toast.error("伺服器發生非預期錯誤：" + error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleEdit = async () => {
        if (!editingDept || !editName.trim()) return
        setIsEditing(true)
        try {
            let finalIconUrl = editCustomIconUrl
            const fileInput = document.getElementById('edit-icon-upload') as HTMLInputElement
            if (fileInput?.files?.[0]) {
                const formData = new FormData()
                formData.append('file', fileInput.files[0])
                const { data, error } = await uploadDepartmentIcon(formData)
                if (data) finalIconUrl = data
                else if (error) toast.error("上傳失敗: " + error)
            }

            const res = await updateDepartment(editingDept.id, editName.trim(), editIcon, editParentIds, editColor, finalIconUrl, editIsGroup)
            if (res?.error) {
                console.error('Update Dept Error:', res.error)
                toast.error(res.error)
            } else {
                toast.success(dict.saving)
                setDepartments(departments.map(d => d.id === editingDept.id ? { ...d, name: editName.trim(), icon: editIcon, parent_ids: editParentIds, color: editColor, custom_icon_url: finalIconUrl, is_group: editIsGroup } : d))
                setEditingDept(null)
                setEditName('')
                router.refresh()
            }
        } catch (error: any) {
            console.error("handleEdit Error:", error)
            toast.error("伺服器發生非預期錯誤：" + error.message)
        } finally {
            setIsEditing(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingDept) return
        setIsDeleting(true)
        const res = await deleteDepartment(deletingDept.id)
        setIsDeleting(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(dict.saving)
            setDepartments(departments.filter(d => d.id !== deletingDept.id))
            setDeletingDept(null)
            router.refresh()
        }
    }

    const handleUpdatePassword = async () => {
        if (!passwordDept) return
        setIsUpdatingPassword(true)
        try {
            const res = await updateDepartmentPassword(passwordDept.id, newPassword || null)
            if (res?.error) {
                toast.error(res.error)
            } else {
                toast.success(newPassword ? '密碼已設定' : '密碼已清除')
                setPasswordDept(null)
                setNewPassword('')
                setDepartments(departments.map(d => d.id === passwordDept.id ? { ...d, has_password: !!newPassword } : d))
                router.refresh()
            }
        } catch (error: any) {
            toast.error("伺服器發生非預期錯誤：" + error.message)
        } finally {
            setIsUpdatingPassword(false)
        }
    }



    const renderDepartmentCard = (dept: Department, index: number, isManager: boolean, isChild: boolean = false) => {
        const IconComponent = (LucideIcons as any)[dept.icon || 'Briefcase'] || LucideIcons.Briefcase

        return (
            <div key={dept.id} className="relative group"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
            >
                <Link href={dept.is_group ? '#' : `/department/${dept.id}`}>
                    <div
                        className={`rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-start justify-between p-5 overflow-hidden ${isChild ? 'h-32' : 'h-40'} ${dept.is_group ? 'bg-slate-50 border-dashed border-2' : ''}`}
                        style={{ borderTopWidth: '4px', borderTopColor: dept.color || '#4F46E5' }}
                        onClick={(e) => {
                            if (dept.is_group) e.preventDefault();
                        }}
                    >
                        <div className="flex justify-between w-full items-start">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: `${dept.color || '#4F46E5'}15`, color: dept.color || '#4F46E5' }}
                            >
                                {dept.custom_icon_url ? (
                                    <img src={dept.custom_icon_url} alt={dept.name} className="w-8 h-8 object-contain" />
                                ) : (
                                    <IconComponent className="w-6 h-6" />
                                )}
                            </div>
                            {dept.is_group && (
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">Group</span>
                            )}
                            {!dept.is_group && dept.parent_ids && dept.parent_ids.length > 0 && !isChild && (
                                <div className="flex flex-col gap-1 items-end max-w-[120px]">
                                    {dept.parent_ids.map(pid => {
                                        const pDept = departments.find(d => d.id === pid)
                                        if (!pDept) return null
                                        return (
                                            <span key={pid} className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full" title={`Child of ${pDept.name}`}>
                                                ↳ {pDept.name}
                                            </span>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <h3 className={`font-semibold text-slate-800 pr-8 line-clamp-2 mt-4 ${isChild ? 'text-base' : 'text-lg'}`}>{dept.name}</h3>
                    </div>
                </Link >
                {/* Admin Controls overlay */}
                {
                    isManager && (
                        <div className="absolute top-3 right-3 text-slate-400">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 bg-white shadow-sm border border-slate-200">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                        setEditingDept(dept)
                                        setEditName(dept.name)
                                        setEditIcon(dept.icon || 'Briefcase')
                                        setEditParentIds(dept.parent_ids || [])
                                        setEditColor(dept.color || '#4F46E5')
                                        setEditIsGroup(dept.is_group || false)
                                        setEditCustomIconUrl(dept.custom_icon_url || '')
                                    }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {dict.edit_dept}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        setPasswordDept(dept)
                                        setNewPassword('')
                                    }}>
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        設定密碼
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => setDeletingDept(dept)}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {dict.delete_dept}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                }
            </div >
        )
    }

    return (
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{dict.title}</h2>
                    <p className="text-slate-500 mt-1">{dict.subtitle}</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white">
                        {dict.create_dept}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {departments.filter(d => d.is_group).map((group, index) => (
                    <div key={group.id} className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="mb-4">
                            {renderDepartmentCard(group, index, isAdmin || (manageableDepartmentIds && manageableDepartmentIds.includes(group.id)) || false, false)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4 border-l-2 border-slate-200">
                            {departments.filter(d => !d.is_group && d.parent_ids?.includes(group.id)).map((child, childIdx) => (
                                renderDepartmentCard(child, 1000 + childIdx, isAdmin || (manageableDepartmentIds && manageableDepartmentIds.includes(child.id)) || false, true)
                            ))}
                            {departments.filter(d => !d.is_group && d.parent_ids?.includes(group.id)).length === 0 && (
                                <div className="text-slate-400 text-sm italic py-4">No child departments</div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Render root level departments that are not in any group */}
                {departments.filter(d => !d.is_group && (!d.parent_ids || d.parent_ids.length === 0 || !d.parent_ids.some(pid => departments.find(g => g.id === pid)?.is_group))).map((dept, index) => (
                    renderDepartmentCard(dept, index + 2000, isAdmin || (manageableDepartmentIds && manageableDepartmentIds.includes(dept.id)) || false, false)
                ))}

                {/* New Department Placeholder */}
                {isAdmin && (
                    <div onClick={() => setIsCreateOpen(true)} className="h-40 rounded-xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-500 font-medium hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer">
                        <span className="text-2xl mb-2">+</span>
                        {dict.add_dept}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dict.create_dept}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{dict.dept_name}</Label>
                            <Input
                                id="name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate()
                                }}
                            />
                        </div>
                        <div className="flex items-center space-x-2 my-2">
                            <Switch.Root
                                className="w-[42px] h-[25px] bg-slate-200 rounded-full relative shadow-[0_2px_10px] shadow-blackA4 focus:shadow-[0_0_0_2px] focus:shadow-black data-[state=checked]:bg-indigo-600 outline-none cursor-default"
                                id="create-is-group"
                                checked={createIsGroup}
                                onCheckedChange={setCreateIsGroup}
                            >
                                <Switch.Thumb className="block w-[21px] h-[21px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA4 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
                            </Switch.Root>
                            <Label htmlFor="create-is-group" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {dict.is_group}
                            </Label>
                        </div>
                        {createIsGroup && (
                            <p className="text-xs text-slate-500 mt-[-10px]">{dict.is_group_desc}</p>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="create-icon-upload">{dict.upload_icon}</Label>
                            <Input
                                id="create-icon-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const file = e.target.files[0];
                                        const url = URL.createObjectURL(file);
                                        setCreateCustomIconUrl(url); // Temporary preview
                                    }
                                }}
                            />
                            {createCustomIconUrl && (
                                <img src={createCustomIconUrl} alt="Preview" className="w-8 h-8 object-contain my-2 border rounded" />
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.color}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {AVAILABLE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setCreateColor(c.value)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${createColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: c.value }}
                                        type="button"
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.icon}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {AVAILABLE_ICONS.map(iconName => {
                                    const IconComp = (LucideIcons as any)[iconName] as LucideIcon
                                    return (
                                        <button
                                            key={iconName}
                                            onClick={() => setCreateIcon(iconName)}
                                            className={`p-2 rounded-md border ${createIcon === iconName ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            type="button"
                                        >
                                            <IconComp className="w-5 h-5" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.parent_dept}</Label>
                            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
                                {departments.length === 0 && <span className="text-sm text-slate-400">Not available</span>}
                                {departments.map(d => (
                                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4"
                                            checked={createParentIds.includes(d.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setCreateParentIds([...createParentIds, d.id])
                                                else setCreateParentIds(createParentIds.filter(id => id !== d.id))
                                            }}
                                        />
                                        {d.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>{dict.cancel}</Button>
                        <Button onClick={handleCreate} disabled={!createName.trim() || isCreating}>
                            {isCreating ? dict.creating : dict.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dict.edit_dept}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">{dict.dept_name}</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEdit()
                                }}
                            />
                        </div>
                        <div className="flex items-center space-x-2 my-2">
                            <Switch.Root
                                className="w-[42px] h-[25px] bg-slate-200 rounded-full relative shadow-[0_2px_10px] shadow-blackA4 focus:shadow-[0_0_0_2px] focus:shadow-black data-[state=checked]:bg-indigo-600 outline-none cursor-default"
                                id="edit-is-group"
                                checked={editIsGroup}
                                onCheckedChange={setEditIsGroup}
                            >
                                <Switch.Thumb className="block w-[21px] h-[21px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA4 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
                            </Switch.Root>
                            <Label htmlFor="edit-is-group" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {dict.is_group}
                            </Label>
                        </div>
                        {editIsGroup && (
                            <p className="text-xs text-slate-500 mt-[-10px]">{dict.is_group_desc}</p>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="edit-icon-upload">{dict.upload_icon}</Label>
                            <Input
                                id="edit-icon-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const file = e.target.files[0];
                                        const url = URL.createObjectURL(file);
                                        setEditCustomIconUrl(url); // Temporary preview
                                    }
                                }}
                            />
                            {editCustomIconUrl && (
                                <img src={editCustomIconUrl} alt="Preview" className="w-8 h-8 object-contain my-2 border rounded" />
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.color}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {AVAILABLE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setEditColor(c.value)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${editColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: c.value }}
                                        type="button"
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.icon}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {AVAILABLE_ICONS.map(iconName => {
                                    const IconComp = (LucideIcons as any)[iconName] as LucideIcon
                                    return (
                                        <button
                                            key={iconName}
                                            onClick={() => setEditIcon(iconName)}
                                            className={`p-2 rounded-md border ${editIcon === iconName ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            type="button"
                                        >
                                            <IconComp className="w-5 h-5" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.parent_dept}</Label>
                            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
                                {departments.filter(d => d.id !== editingDept?.id).length === 0 && <span className="text-sm text-slate-400">Not available</span>}
                                {departments.filter(d => d.id !== editingDept?.id).map(d => (
                                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 h-4 w-4"
                                            checked={editParentIds.includes(d.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setEditParentIds([...editParentIds, d.id])
                                                else setEditParentIds(editParentIds.filter(id => id !== d.id))
                                            }}
                                        />
                                        {d.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDept(null)} disabled={isEditing}>{dict.cancel}</Button>
                        <Button onClick={handleEdit} disabled={!editName.trim() || isEditing}>
                            {isEditing ? dict.saving : dict.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">{dict.delete_dept}</DialogTitle>
                        <DialogDescription>
                            {dict.delete_confirm}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeletingDept(null)} disabled={isDeleting}>{dict.cancel}</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? '...' : dict.delete_dept}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Dialog */}
            <Dialog open={!!passwordDept} onOpenChange={(open) => !open && setPasswordDept(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>設定密碼 - {passwordDept?.name}</DialogTitle>
                        <DialogDescription>
                            輸入新密碼以保護此部門看板，若留白則為清除密碼。目前狀態：
                            <span className={passwordDept?.has_password ? "text-green-600 ml-1 font-medium" : "text-amber-600 ml-1 font-medium"}>
                                {passwordDept?.has_password ? '已設定密碼' : '無密碼 (公開)'}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">新密碼</Label>
                            <Input
                                id="new-password"
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="輸入密碼..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdatePassword()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setPasswordDept(null)} disabled={isUpdatingPassword}>{dict.cancel}</Button>
                        <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? dict.saving : dict.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
