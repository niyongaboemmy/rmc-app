'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Unlink, Undo2, Redo2, ImagePlus, Loader2,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { generateImageVersions, uploadGalleryVersions } from '@/lib/galleryApi';
import { fileUrl } from '@/lib/api';
import { markdownFromDoc } from '@/lib/markdown/fromProseMirror';

/**
 * Image + size/alignment, carried as `data-size` / `data-align`.
 *
 * data-* rather than a width attribute or an inline style on purpose: DOMPurify
 * keeps data-attributes by default, so the sizing survives the public
 * sanitiser. Both values are styled once in globals.css, which means the editor
 * and the public page agree by construction.
 */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'full',
        parseHTML: (el) => el.getAttribute('data-size') ?? 'full',
        renderHTML: (attrs) => ({ 'data-size': attrs.size }),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') ?? 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
    };
  },
});

const SIZES = [
  { key: 'sm', label: 'Small image' },
  { key: 'md', label: 'Medium image' },
  { key: 'full', label: 'Full-width image' },
] as const;

const ALIGNS = [
  { key: 'left', label: 'Align image left', Icon: AlignLeft },
  { key: 'center', label: 'Align image centre', Icon: AlignCenter },
  { key: 'right', label: 'Align image right', Icon: AlignRight },
] as const;

/**
 * Reusable rich-text editor (TipTap). Outputs HTML via `onChange`, and markdown via
 * the optional `onChangeMarkdown`. The body is
 * UNCONTROLLED after mount — `value` only seeds the initial content, so callers
 * should remount with a `key` (e.g. the language) to load different content.
 * This keeps the cursor stable while typing.
 */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /**
   * Also receive the edit as MARKDOWN, serialised from the editor's own document.
   *
   * For the callers that must STORE markdown rather than HTML — Dawah Q&A answers,
   * where inert source is a deliberate defence (see the DawahQuestion entity). They
   * still pass HTML in through `value`; only what comes back out differs.
   *
   * Additive on purpose: `onChange` keeps firing with HTML for the fifteen callers
   * that want it, so this cannot change what any of them stores.
   */
  onChangeMarkdown?: (markdown: string) => void;
  dir?: 'ltr' | 'rtl';
  fontClassName?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onChangeMarkdown,
  dir = 'ltr',
  fontClassName = '',
}: RichTextEditorProps) {
  // The editor instance persists across language switches, so its onUpdate
  // closure must always call the LATEST onChange (which targets the current
  // language) — route it through a ref to avoid writing to the wrong language.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const onChangeMarkdownRef = useRef(onChangeMarkdown);
  useEffect(() => { onChangeMarkdownRef.current = onChangeMarkdown; }, [onChangeMarkdown]);

  const editor = useEditor({
    immediatelyRender: false, // avoids Next.js SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      // Images are uploaded to the file server and inserted as a plain <img src>
      // pointing at the PUBLIC prefix — never inlined as a base64 data URI, which
      // would bloat the HTML body straight past the request size limit.
      SizedImage.configure({
        inline: false,
        HTMLAttributes: { loading: 'lazy', class: 'rounded-xl' },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
      // From getJSON(), not by converting the HTML back: the document is the
      // structured source of truth, so there is nothing to parse and no guessing
      // at what a tag meant.
      onChangeMarkdownRef.current?.(markdownFromDoc(editor.getJSON()));
    },
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgErr, setImgErr] = useState('');

  // Recomputed on every transaction (the force-render above), so the contextual
  // image controls follow the selection.
  const imageSelected = editor.isActive('image');
  const imgAttrs = editor.getAttributes('image') as { size?: string; align?: string; alt?: string };
  const selectedAlt = imgAttrs.alt?.slice(0, 24) ?? '';

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  /**
   * Upload the picked image, then insert it at the cursor. Reuses the same
   * resize+upload pipeline as ImageUploadField (covers/photos), so an inline
   * image lands on the public prefix and is served like any other cover.
   */
  const pickImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImgErr('Please choose an image file.'); return; }
    setUploading(true);
    setImgErr('');
    try {
      const versions = await generateImageVersions(file);
      const { fileKey } = await uploadGalleryVersions({ versions });
      editor.chain().focus().setImage({ src: fileUrl(fileKey), alt: file.name.replace(/\.[^.]+$/, '') }).run();
    } catch {
      setImgErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickImage(e.target.files?.[0])}
      />
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
      <Btn onClick={() => fileRef.current?.click()} disabled={uploading} label={uploading ? 'Uploading image…' : 'Insert image'}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo"><Undo2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo"><Redo2 className="w-4 h-4" /></Btn>
      {imgErr && <span className="ms-2 text-xs text-red-600">{imgErr}</span>}

      {/* Size + alignment appear only while an image is selected — they are
          meaningless otherwise, and a permanently-visible row of dead buttons
          reads as broken. */}
      {imageSelected && (
        <>
          <Divider />
          <span className="me-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {selectedAlt || 'Image'}
          </span>
          {SIZES.map(({ key, label }) => (
            <Btn
              key={key}
              onClick={() => editor.chain().focus().updateAttributes('image', { size: key }).run()}
              active={imgAttrs.size === key}
              label={label}
            >
              <span className="text-[11px] font-bold uppercase">{key === 'full' ? 'L' : key.charAt(0)}</span>
            </Btn>
          ))}
          {ALIGNS.map(({ key, label, Icon }) => (
            <Btn
              key={key}
              onClick={() => editor.chain().focus().updateAttributes('image', { align: key }).run()}
              active={imgAttrs.align === key}
              label={label}
            >
              <Icon className="w-4 h-4" />
            </Btn>
          ))}
        </>
      )}
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
