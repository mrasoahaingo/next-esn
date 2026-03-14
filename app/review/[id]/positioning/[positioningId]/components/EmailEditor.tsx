'use client';

import { useEffect } from 'react';
import type { PositioningEmail } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from 'lucide-react';

interface EmailEditorProps {
  email: Partial<PositioningEmail> | null;
  onChange: (email: Partial<PositioningEmail>) => void;
  readOnly?: boolean;
  title?: string;
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-white/15 text-white'
          : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function EmailEditor({
  email,
  onChange,
  readOnly,
  title = 'Email de positionnement',
}: EmailEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Corps de l\'email...',
      }),
    ],
    content: email?.body ?? '',
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      onChange({ ...email, body: ed.getHTML() });
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none min-h-[300px] px-3 py-2 focus:outline-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5',
      },
    },
  });

  // Sync editable state
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync external content changes (streaming)
  useEffect(() => {
    if (!editor) return;
    const incoming = email?.body ?? '';
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, email?.body]);

  return (
    <section className="glass-panel p-6 rounded-2xl">
      <h2 className="text-lg font-semibold mb-4 text-white border-b border-white/10 pb-2">
        {title}
      </h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Objet
          </Label>
          <Input
            value={email?.subject ?? ''}
            onChange={(e) => onChange({ ...email, subject: e.target.value })}
            disabled={readOnly}
            placeholder="Objet de l'email..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Corps
          </Label>
          <div className="rounded-md border border-input bg-background overflow-hidden">
            {!readOnly && editor && (
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.02]">
                <ToolbarButton
                  active={editor.isActive('bold')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive('italic')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive('underline')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <ToolbarButton
                  active={editor.isActive('bulletList')}
                  disabled={readOnly}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive('orderedList')}
                  disabled={readOnly}
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </section>
  );
}
