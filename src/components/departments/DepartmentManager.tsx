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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const AVAILABLE_ICONS = ['Briefcase', 'Building2', 'Factory', 'Monitor', 'Cpu', 'Users', 'Wrench', 'Truck', 'Zap', 'Shield']

export default function DepartmentManager({ initialDepartments, isAdmin }: { initialDepartments: Department[], isAdmin: boolean }) {
    const router = useRouter()
    const [departments, setDepartments] = useState<Department[]>(initialDepartments)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createName, setCreateName] = useState('')
    const [createIcon, setCreateIcon] = useState('Briefcase')
    const [createParentIds, setCreateParentIds] = useState<string[]>([])
    const [isCreating, setIsCreating] = useState(false)

    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [editName, setEditName] = useState('')
    const [editIcon, setEditIcon] = useState('Briefcase')
    const [editParentIds, setEditParentIds] = useState<string[]>([])
    const [isEditing, setIsEditing] = useState(false)

    const [deletingDept, setDeletingDept] = useState<Department | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleCreate = async () => {
        if (!createName.trim()) return
        setIsCreating(true)
        const res = await createDepartment(createName.trim(), createIcon, createParentIds)
        setIsCreating(false)
        if (res.error) {
            toast.error(res.error)
        } else if (res.data) {
            toast.success('Department created successfully.')
            // Optimistically update local state
            setDepartments([...departments, res.data as Department])
            setIsCreateOpen(false)
            setCreateName('')
            router.refresh()
        }
    }

    const handleEdit = async () => {
        if (!editingDept || !editName.trim()) return
        setIsEditing(true)
        const res = await updateDepartment(editingDept.id, editName.trim(), editIcon, editParentIds)
        setIsEditing(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Department renamed successfully.')
            // Optimistically update local state
            setDepartments(departments.map(d => d.id === editingDept.id ? { ...d, name: editName.trim() } : d))
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
            toast.success('Department deleted successfully.')
            // Optimistically update local state
            setDepartments(departments.filter(d => d.id !== deletingDept.id))
            setDeletingDept(null)
            router.refresh()
        }
    }

    return (
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Departments</h2>
                    <p className="text-slate-500 mt-1">Select a department to view its Kanban board.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white">Create Department</Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {departments.map((dept) => {
                    const IconComponent = (LucideIcons as any)[dept.icon || 'Briefcase'] as LucideIcon || LucideIcons.Briefcase;
                    return (
                        <div key={dept.id} className="relative group">
                            <Link href={`/department/${dept.id}`}>
                                <div className="h-40 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col items-start justify-between p-5">
                                    <div className="flex justify-between w-full items-start">
                                        <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                            {isAdmin && (
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
                                            }}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Rename / Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => setDeletingDept(dept)}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
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
                        Add Department
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Department</DialogTitle>
                        <DialogDescription>
                            Add a new department workspace. A new Kanban board will be created automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Department Name</Label>
                            <Input
                                id="name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="e.g. 生產二課"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate()
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Icon</Label>
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
                            <Label>Parent Departments (Optional)</Label>
                            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
                                {departments.length === 0 && <span className="text-sm text-slate-400">No other departments available</span>}
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
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!createName.trim() || isCreating}>
                            {isCreating ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Department</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Department Name</Label>
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
                            <Label>Icon</Label>
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
                            <Label>Parent Departments</Label>
                            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
                                {departments.filter(d => d.id !== editingDept?.id).length === 0 && <span className="text-sm text-slate-400">No other departments available</span>}
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
                        <Button variant="outline" onClick={() => setEditingDept(null)} disabled={isEditing}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={!editName.trim() || isEditing}>
                            {isEditing ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Department</DialogTitle>
                        <DialogDescription>
                            Are you absolutely sure you want to delete <span className="font-bold text-slate-800">{deletingDept?.name}</span>?
                            <br /><br />
                            This action cannot be undone. This will permanently delete the department and <span className="font-bold">ALL</span> associated Kanban boards, lists, and cards.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeletingDept(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Yes, delete department'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
