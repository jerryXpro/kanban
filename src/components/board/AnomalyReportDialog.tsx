'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { reportAnomaly } from '@/app/actions/cards'
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
interface AnomalyReportDialogProps {
    currentDepartmentId: string
    currentDepartmentName: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function AnomalyReportDialog({ currentDepartmentId, currentDepartmentName, isOpen, onOpenChange }: AnomalyReportDialogProps) {
    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        const fetchDepartments = async () => {
            const supabase = createClient()

            // Fetch all departments
            const { data } = await supabase
                .from('departments')
                .select('id, name')
                .order('name')

            if (data) {
                // Exclude current department from the list
                const otherDepts = data.filter(d => d.id !== currentDepartmentId)
                setDepartments(otherDepts)
            } else {
                setDepartments([])
            }
        }

        fetchDepartments()
    }, [isOpen, currentDepartmentId])

    const handleSubmit = async () => {
        if (!title.trim() || selectedTargetIds.length === 0) return

        setIsSubmitting(true)
        const res = await reportAnomaly(currentDepartmentId, selectedTargetIds, title.trim(), description.trim())
        setIsSubmitting(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(dict.anomaly_reported || 'Anomaly reported successfully')
            onOpenChange(false)
            setTitle('')
            setDescription('')
            setSelectedTargetIds([])
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] border-red-200">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <AlertTriangle size={18} />
                        </div>
                        <DialogTitle className="text-red-700">{dict.report_anomaly}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {dict.report_anomaly_desc || 'Report a production anomaly to a parent department.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="grid gap-2">
                        <Label className="text-slate-700">{dict.target_department || 'Target Department'}</Label>
                        {departments.length === 0 ? (
                            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                {dict.no_parent_dept || 'This department has no parent department to report to.'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto p-3 border border-slate-200 rounded-md bg-white">
                                {departments.map(dept => (
                                    <label key={dept.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                                        <Checkbox
                                            checked={selectedTargetIds.includes(dept.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedTargetIds(prev => [...prev, dept.id])
                                                } else {
                                                    setSelectedTargetIds(prev => prev.filter(id => id !== dept.id))
                                                }
                                            }}
                                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                                            {dept.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-slate-700">{dict.anomaly_title || 'Anomaly Title'}</Label>
                        <Input
                            placeholder={dict.enter_card_title}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-slate-200 focus-visible:ring-red-400"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-slate-700">{dict.description || 'Description'}</Label>
                        <textarea
                            placeholder={dict.enter_description || 'Detailed description of the anomaly...'}
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                            className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {dict.cancel || 'Cancel'}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || selectedTargetIds.length === 0}
                    >
                        {isSubmitting ? '...' : dict.submit_report || 'Submit Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
