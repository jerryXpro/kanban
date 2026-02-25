'use client'

import { useState } from 'react'
import { Department } from '@/types/kanban'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department'
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
    const [createParentIds, setCreateParentIds] = useState<string[]>([])
    const [createColor, setCreateColor] = useState('#4F46E5')
    const [isCreating, setIsCreating] = useState(false)

    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [editName, setEditName] = useState('')
    const [editIcon, setEditIcon] = useState('Briefcase')
    const [editParentIds, setEditParentIds] = useState<string[]>([])
    const [editColor, setEditColor] = useState('#4F46E5')
    const [isEditing, setIsEditing] = useState(false)

    const [deletingDept, setDeletingDept] = useState<Department | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleCreate = async () => {
        if (!createName.trim()) return
        setIsCreating(true)
        const res = await createDepartment(createName.trim(), createIcon, createParentIds, createColor)
        setIsCreating(false)
        if (res.error) {
            toast.error(res.error)
        } else if (res.data) {
            toast.success(dict.saving)
            setDepartments([...departments, res.data as Department])
            setIsCreateOpen(false)
            setCreateName('')
            router.refresh()
        }
    }

    const handleEdit = async () => {
        if (!editingDept || !editName.trim()) return
        setIsEditing(true)
        const res = await updateDepartment(editingDept.id, editName.trim(), editIcon, editParentIds, editColor)
        setIsEditing(false)
        if (res.error) {
            console.error('Update Dept Error:', res.error)
            toast.error(res.error)
        } else {
            toast.success(dict.saving)
            setDepartments(departments.map(d => d.id === editingDept.id ? { ...d, name: editName.trim(), icon: editIcon, parent_ids: editParentIds, color: editColor } : d))
            setEditingDept(null)
            setEditName('')
            router.refresh()
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
                {departments.map((dept) => {
                    const IconComponent = (LucideIcons as any)[dept.icon || 'Briefcase'] as LucideIcon || LucideIcons.Briefcase;
                    const isManager = isAdmin || (manageableDepartmentIds && manageableDepartmentIds.includes(dept.id));

                    return (
                        <div key={dept.id} className="relative group">
                            <Link href={`/department/${dept.id}`}>
                                <div
                                    className="h-40 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-start justify-between p-5 overflow-hidden"
                                    style={{ borderTopWidth: '4px', borderTopColor: dept.color || '#4F46E5' }}
                                >
                                    <div className="flex justify-between w-full items-start">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: `${dept.color || '#4F46E5'}15`, color: dept.color || '#4F46E5' }}
                                        >
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        {dept.parent_ids && dept.parent_ids.length > 0 && (
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
                                    <h3 className="text-lg font-semibold text-slate-800 pr-8 line-clamp-2 mt-4">{dept.name}</h3>
                                </div>
                            </Link>

                            {/* Admin Controls overlay */}
                            {isManager && (
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-white backdrop-blur-sm shadow-sm">
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
                                            }}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                {dict.edit_dept}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => setDeletingDept(dept)}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                {dict.delete_dept}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    )
                })}

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

            {/* Delete Dialog */}
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
        </div>
    )
}
