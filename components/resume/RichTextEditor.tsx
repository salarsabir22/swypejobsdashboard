"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, List, ListOrdered, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toEditorHtml } from "@/lib/resume/html"
import { cn } from "@/lib/utils"

function Tool({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 rounded-lg", active && "bg-secondary text-primary")}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || "Write here" }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: "tiptap px-3 py-2.5 text-[14px] leading-relaxed text-foreground focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.isEmpty && !value) return
    if (value === editor.getHTML()) return
    const next = toEditorHtml(value)
    if (next === editor.getHTML()) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return <div className="min-h-[120px] rounded-2xl border border-input bg-background" style={{ minHeight }} />
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-hidden rounded-2xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
        <div className="flex flex-wrap gap-0.5 border-b border-border bg-secondary/40 px-1.5 py-1">
          <Tool label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Tool>
          <Tool label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Tool>
          <Tool label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </Tool>
          <Tool
            label="Bullets"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Tool>
          <Tool
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Tool>
          <Tool label="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </Tool>
          <Tool label="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </Tool>
        </div>
        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  )
}
