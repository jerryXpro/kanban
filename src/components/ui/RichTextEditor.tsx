'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (val: string) => void
    placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
                emptyEditorClass: 'is-editor-empty',
            })
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm w-full max-w-none focus:outline-none min-h-[80px] p-2 text-slate-700 bg-white hover:bg-slate-50 transition-colors',
            },
        },
    })

    // Update if external value changes unexpectedly (less likely in this dialog pattern but good practice)
    useEffect(() => {
        if (editor && editor.getHTML() !== value && value !== '') {
            // Uncomment to sync external changes, but usually not needed for a simple dialog edit:
            // editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) {
        return null
    }

    return (
        <div className="flex flex-col border border-slate-200 rounded-md overflow-hidden bg-white mb-3 shadow-inner">
            <div className="flex items-center gap-1 p-1 bg-slate-100 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    title="Bold"
                >
                    <Bold size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    title="Italic"
                >
                    <Italic size={14} />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    title="Bullet List"
                >
                    <List size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    title="Numbered List"
                >
                    <ListOrdered size={14} />
                </button>
            </div>
            <EditorContent editor={editor} className="cursor-text bg-white" />
        </div>
    )
}
