'use client';

import { useEffect, useReducer, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Unlink, Undo2, Redo2,
} from 'lucide-react';

/**
 * Reusable rich-text editor (TipTap). Outputs HTML via `onChange`. The body is
 * UNCONTROLLED after mount — `value` only seeds the initial content, so callers
 * should remount with a `key` (e.g. the language) to load different content.
 * This keeps the cursor stable while typing.
 */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  dir?: 'ltr' | 'rtl';
  fontClassName?: string;
}

export function RichTextEditor({ value, onChange, dir = 'ltr', fontClassName = '' }: RichTextEditorProps) {
  // The editor instance persists across language switches, so its onUpdate
  // closure must always call the LATEST onChange (which targets the current
  // language) — route it through a ref to avoid writing to the wrong language.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false, // avoids Next.js SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
    editorProps: {
      attributes: {
        // Font is applied on the wrapper and inherited, so it stays reactive.
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  // Keep the editor in sync when `value` changes from the outside — e.g. the
  // admin switches the EN/RW/AR language tab, which swaps in another language's
  // body. We skip when the value already matches the editor's own HTML so our
  // own onChange round-trips don't reset the cursor.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="min-h-[200px] px-4 py-3 text-sm text-gray-300">Loading editor…</div>;

  return (
    <div
      dir={dir}
      className={`rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent ${fontClassName}`}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // TipTap mutates the editor in place; force a re-render on each transaction so
  // the active-state highlighting on the buttons stays in sync.
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const update = () => force();
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold"><Bold className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic"><Italic className="w-4 h-4" /></Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading 2"><Heading2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="Heading 3"><Heading3 className="w-4 h-4" /></Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list"><List className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Quote"><Quote className="w-4 h-4" /></Btn>
      <Divider />
      <Btn onClick={setLink} active={editor.isActive('link')} label="Add link"><Link2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} label="Remove link"><Unlink className="w-4 h-4" /></Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo"><Undo2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo"><Redo2 className="w-4 h-4" /></Btn>
    </div>
  );
}

function Btn({
  onClick, active, disabled, label, children,
}: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-cyan-100 text-cyan-700' : 'text-gray-500 hover:bg-gray-200/70 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />;
}
