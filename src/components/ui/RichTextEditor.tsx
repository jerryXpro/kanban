'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Strikethrough, Heading2, Heading3, Quote, Code } from 'lucide-react'
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
                placeholder: placeholder || '輸入內容...',
                emptyEditorClass: 'is-editor-empty',
            })
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm w-full max-w-none focus:outline-none min-h-[100px] p-3 text-slate-700',
            },
        },
    })

    useEffect(() => {
        if (editor && value === '' && editor.getHTML() !== '<p></p>') {
            editor.commands.setContent('')
        }
    }, [value, editor])

    if (!editor) return null

    const ToolButton = ({ onClick, isActive, title, children }: {
        onClick: () => void
        isActive?: boolean
        title: string
        children: React.ReactNode
    }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick() }}
            className={`p-1.5 rounded transition-colors ${isActive
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
            title={title}
        >
            {children}
        </button>
    )

    const Divider = () => <div className="w-px h-4 bg-slate-300 mx-0.5 self-center" />

    return (
        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white mb-3 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
                {/* Text style */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="粗體 (Ctrl+B)"
                >
                    <Bold size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="斜體 (Ctrl+I)"
                >
                    <Italic size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="刪除線"
                >
                    <Strikethrough size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    title="行內程式碼"
                >
                    <Code size={14} />
                </ToolButton>

                <Divider />

                {/* Headings */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="標題 H2"
                >
                    <Heading2 size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="標題 H3"
                >
                    <Heading3 size={14} />
                </ToolButton>

                <Divider />

                {/* Lists */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="項目清單"
                >
                    <List size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="編號清單"
                >
                    <ListOrdered size={14} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="引言"
                >
                    <Quote size={14} />
                </ToolButton>
            </div>

            {/* Editor content */}
            <EditorContent editor={editor} className="cursor-text bg-white" />
        </div>
    )
}
