'use client';

import { useId, useLayoutEffect } from 'react';
import type { PositioningEmail } from '@/lib/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
    >
      {children}
    </Button>
  );
}

/**
 * Un e-mail (objet + corps TipTap). C'est un document : la carte est justifiée
 * (`bg-card border rounded-xl`), sans verre.
 */
export function EmailEditor({
  email,
  onChange,
  readOnly,
  title = 'E-mail de positionnement',
}: EmailEditorProps) {
  const uid = useId();
  const subjectId = `${uid}-subject`;
  const bodyId = `${uid}-body`;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Corps de l’e-mail…',
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
          'prose prose-sm max-w-none min-h-[300px] px-3 py-2 text-foreground focus:outline-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
      },
    },
  });

  // Sync editable state
  useLayoutEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync external content changes (streaming)
  useLayoutEffect(() => {
    if (!editor) return;
    const incoming = email?.body ?? '';
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, email?.body]);

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label={title}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={subjectId} className="text-xs text-muted-foreground">
            Objet
          </FieldLabel>
          <Input
            id={subjectId}
            value={email?.subject ?? ''}
            onChange={(e) => onChange({ ...email, subject: e.target.value })}
            disabled={readOnly}
            placeholder="Objet de l’e-mail"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={bodyId} className="text-xs text-muted-foreground">
            Corps
          </FieldLabel>
          <div id={bodyId} className="overflow-hidden rounded-md border border-input bg-background">
            {!readOnly && editor && (
              <div
                role="toolbar"
                aria-label="Mise en forme"
                className="flex items-center gap-0.5 border-b border-border px-2 py-1.5"
              >
                <ToolbarButton
                  label="Gras"
                  active={editor.isActive('bold')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Italique"
                  active={editor.isActive('italic')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Souligné"
                  active={editor.isActive('underline')}
                  disabled={readOnly}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <div className="mx-1 h-4 w-px bg-border" aria-hidden />
                <ToolbarButton
                  label="Liste à puces"
                  active={editor.isActive('bulletList')}
                  disabled={readOnly}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Liste numérotée"
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
        </Field>
      </FieldGroup>
    </section>
  );
}
