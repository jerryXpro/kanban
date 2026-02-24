'use client'

import { useState } from 'react'
import { Department } from '@/types/kanban'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
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

export default function DepartmentManager({ initialDepartments, isAdmin }: { initialDepartments: Department[], isAdmin: boolean }) {
    const router = useRouter()
    const [departments, setDepartments] = useState<Department[]>(initialDepartments)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createName, setCreateName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [editName, setEditName] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    const [deletingDept, setDeletingDept] = useState<Department | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleCreate = async () => {
        if (!createName.trim()) return
        setIsCreating(true)
        const res = await createDepartment(createName.trim())
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
        const res = await updateDepartment(editingDept.id, editName.trim())
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
                {departments.map((dept) => (
                    <div key={dept.id} className="relative group">
                        <Link href={`/department/${dept.id}`}>
                            <div className="h-40 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col items-start justify-between p-5">
                                <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 pr-8 line-clamp-2">{dept.name}</h3>
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
                                        }}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Rename
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
                ))}

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
