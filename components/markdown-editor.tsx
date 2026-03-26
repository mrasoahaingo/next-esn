'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Table,
} from 'lucide-react';
import { markdownDisplay, markdownEditorContentClass } from '@/lib/markdown-display-classes';
import { cn } from '@/lib/utils';

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? 'bg-overlay/15 text-foreground'
          : 'text-muted-foreground hover:bg-overlay/10 hover:text-foreground'
      }
    >
      {children}
    </Button>
  );
}

export type MarkdownEditorProps = {
  /** Valeur Markdown contrôlée */
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Classes Prose / hauteur sur la zone d’édition */
  editorClassName?: string;
};

/**
 * Éditeur riche avec persistance **Markdown** (Tiptap + @tiptap/markdown).
 * Gras, italique, titres ##, listes, citation, tableaux GFM.
 */
export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Rédigez le résumé…',
  id,
  className,
  editorClassName,
}: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TableKit.configure({
        table: {
          // Table non redimensionnable : pas de TableView → pas de .tableWrapper par défaut ; requis pour le même cadre arrondi que la fiche.
          renderWrapper: true,
          HTMLAttributes: {
            class: markdownDisplay.table,
          },
        },
        tableCell: {
          HTMLAttributes: {
            class: cn(markdownDisplay.td, '[&_p]:my-0'),
          },
        },
        tableHeader: {
          HTMLAttributes: {
            class: cn(markdownDisplay.th, '[&_p]:my-0'),
          },
        },
        tableRow: {
          HTMLAttributes: {
            class: '',
          },
        },
      }),
      Markdown.configure({
        markedOptions: { gfm: true, breaks: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    contentType: 'markdown',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(markdownEditorContentClass, editorClassName),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getMarkdown());
    },
  });

  useLayoutEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useLayoutEffect(() => {
    if (!editor) return;
    const incoming = value ?? '';
    const current = editor.getMarkdown();
    if (incoming !== current) {
      editor.commands.setContent(incoming, { contentType: 'markdown', emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div
      id={id}
      className={cn('overflow-hidden rounded-md border border-input bg-background', className)}
      data-slot="markdown-editor"
    >
      {!disabled && editor ? (
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-overlay/10 bg-overlay/4 px-2 py-1.5"
          role="toolbar"
          aria-label="Mise en forme"
        >
          <ToolbarButton
            active={editor.isActive('bold')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive('table')}
            disabled={disabled}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <Table className="h-4 w-4" />
          </ToolbarButton>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
