'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { initializeBoard } from '@/app/actions/department'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function InitializeBoardButton({ departmentId, departmentName }: { departmentId: string, departmentName: string }) {
    const [isInitializing, setIsInitializing] = useState(false)
    const router = useRouter()

    const handleInitialize = async () => {
        setIsInitializing(true)
        const res = await initializeBoard(departmentId, departmentName)
        setIsInitializing(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Board initialized successfully. Refreshing...')
            router.refresh()
        }
    }

    return (
        <Button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="bg-white text-indigo-900 hover:bg-indigo-50"
        >
            {isInitializing ? 'Initializing...' : 'Initialize Board'}
        </Button>
    )
}
