'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

const FONT_SIZES = [
  { label: 'Small (10pt)', value: '10pt' },
  { label: 'Normal (12pt)', value: '12pt' },
  { label: 'Large (16pt)', value: '16pt' },
  { label: 'Huge (20pt)', value: '20pt' },
]

const selectCls =
  'rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-500'

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs font-medium ${
      active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
    }`

  const currentFont = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? ''
  const currentSize = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-2 py-1.5">
      <select
        value={currentFont}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontFamily(e.target.value).run()
            : editor.chain().focus().unsetFontFamily().run()
        }
        className={selectCls}
        title="Font"
      >
        <option value="">Default font</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        value={currentSize}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontSize(e.target.value).run()
            : editor.chain().focus().unsetFontSize().run()
        }
        className={selectCls}
        title="Size"
      >
        <option value="">Default size</option>
        {FONT_SIZES.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <span className="mx-1 h-4 w-px bg-zinc-200" />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic">
        <em>I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline">
        <u>U</u>
      </button>

      <span className="mx-1 h-4 w-px bg-zinc-200" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Bullet list">
        • List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Numbered list">
        1. List
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt('Link URL (leave empty to remove):')
          if (url === null) return
          if (url === '') {
            editor.chain().focus().unsetLink().run()
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }
        }}
        className={btn(editor.isActive('link'))}
        title="Insert link"
      >
        Link
      </button>

      <span className="flex-1" />

      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btn(false)} disabled:opacity-40`} title="Undo">
        Undo
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btn(false)} disabled:opacity-40`} title="Redo">
        Redo
      </button>
    </div>
  )
}

export function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string
  onChange: (html: string, text: string) => void
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: initialHtml,
    onUpdate: ({ editor: e }) => onChange(e.getHTML(), e.getText()),
    editorProps: {
      attributes: {
        class: 'min-h-56 px-3 py-2 text-sm outline-none',
        style: "font-family:'Times New Roman',serif;font-size:12pt;",
      },
    },
  })

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
