'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Palette, Check } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateBoardTheme } from '@/app/actions/boards'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const AVAILABLE_COLORS = [
    { name: 'Indigo', value: '#4F46E5' },
    { name: 'Rose', value: '#E11D48' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Slate', value: '#64748B' },
]

interface ThemeSelectorProps {
    boardId: string
    departmentId: string
    currentThemeColor?: string
}

export default function ThemeSelector({ boardId, departmentId, currentThemeColor }: ThemeSelectorProps) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [open, setOpen] = useState(false)

    // Normalize color value for comparison (handle undefined or different cases)
    const normalizedCurrentColor = (currentThemeColor || '#4F46E5').toUpperCase()

    const handleColorSelect = async (colorHex: string) => {
        if (colorHex.toUpperCase() === normalizedCurrentColor) {
            setOpen(false)
            return
        }

        setIsUpdating(true)
        try {
            const res = await updateBoardTheme(boardId, departmentId, colorHex)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('看板顏色已更新')
                setOpen(false)
                router.refresh()
            }
        } catch (error: any) {
            toast.error("伺服器發生非預期錯誤：" + error.message)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white transition-colors"
                    title="設定看板顏色"
                    disabled={isUpdating}
                >
                    <Palette className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
                <div className="text-xs font-semibold text-slate-500 mb-2 px-1">選擇看板顏色</div>
                <div className="grid grid-cols-4 gap-2">
                    {AVAILABLE_COLORS.map(color => {
                        const isSelected = color.value.toUpperCase() === normalizedCurrentColor
                        return (
                            <button
                                key={color.value}
                                onClick={() => handleColorSelect(color.value)}
                                className={`h-10 w-full rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'border-indigo-600 scale-105 shadow-sm relative' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                                type="button"
                            >
                                {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
                                        <Check className="h-4 w-4 text-white drop-shadow-md" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
