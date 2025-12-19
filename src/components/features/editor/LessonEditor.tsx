'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
// ✅ FIXED: Using Named Imports for extensions
import { Image } from '@tiptap/extension-image';
import { Youtube } from '@tiptap/extension-youtube';
import { Typography } from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

import { 
  Bold, Italic, List, ListOrdered, 
  Heading1, Heading2, Quote, Undo, Redo, Save, 
  Image as ImageIcon, Youtube as YoutubeIcon,
  Table as TableIcon, Code, CheckSquare, SplitSquareHorizontal, 
  Trash2, Plus, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils'; 
import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

// Initialize Syntax Highlighting
const lowlight = createLowlight(common);

interface LessonEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  isSaving?: boolean;
}

const ToolbarButton = ({ 
  onClick, 
  isActive = false, 
  children, 
  disabled = false,
  title = "" 
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600 disabled:opacity-30",
      isActive && "bg-indigo-50 text-indigo-600 font-bold ring-1 ring-indigo-200"
    )}
  >
    {children}
  </button>
);

export default function LessonEditor({ initialContent = '', onSave, isSaving }: LessonEditorProps) {
  const [isTableMode, setIsTableMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use the advanced 'lowlight' version instead
      }),
      Typography,
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      Image.configure({ inline: true, allowBase64: true }),
      Youtube.configure({ controls: false }),
      
      // 🏗️ NEW FEATURES
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-8 prose-img:rounded-xl prose-img:shadow-lg prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-2 prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:p-2',
      },
    },
    immediatelyRender: false, // Fixes SSR Error
    onSelectionUpdate: ({ editor }) => {
       setIsTableMode(editor.isActive('table'));
    }
  });

  // Sync content
  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('URL of the image:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) editor?.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* 1. TOOLBAR */}
      <div className="border-b border-gray-100 bg-white p-2 flex flex-wrap gap-1 items-center sticky top-0 z-20 backdrop-blur-sm shadow-sm">
        
        {/* Text Style */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Big Heading">
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Sub Heading">
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
              <Italic className="w-4 h-4" />
            </ToolbarButton>
        </div>

        {/* Lists & Tasks */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>
        </div>

        {/* Inserts */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Snippet">
              <Code className="w-4 h-4" />
            </ToolbarButton>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolbarButton onClick={insertTable} title="Insert Table">
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Image">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
            </ToolbarButton>
            <ToolbarButton onClick={addYoutube} title="Video">
              <YoutubeIcon className="w-4 h-4 text-red-600" />
            </ToolbarButton>
        </div>

        {/* TABLE CONTROLS (Only visible when a table is selected) */}
        {isTableMode && (
           <div className="flex items-center gap-0.5 bg-indigo-50 p-1 rounded-lg border border-indigo-100 mr-2 animate-in fade-in">
              <span className="text-[10px] font-bold text-indigo-400 px-1">TABLE</span>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Col"><SplitSquareHorizontal className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Del Col"><Minus className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row"><Plus className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Del Row"><Minus className="w-3 h-3 rotate-90"/></ToolbarButton>
              <div className="w-px h-3 bg-indigo-200 mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 className="w-3 h-3 text-red-500"/></ToolbarButton>
           </div>
        )}

        {/* Save Actions */}
        <div className="flex items-center gap-1 ml-auto">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo className="w-4 h-4" />
            </ToolbarButton>
            
            <button 
                onClick={() => onSave(editor.getHTML())}
                disabled={isSaving}
                className="ml-2 flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-slate-800 transition text-xs disabled:opacity-50"
            >
                {isSaving ? 'Saving...' : <><Save className="w-3 h-3" /> Save Changes</>}
            </button>
        </div>
      </div>

      {/* 2. WRITING AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 cursor-text p-4 md:p-8" onClick={() => editor.chain().focus().run()}>
        <div className="max-w-4xl mx-auto bg-white min-h-[800px] shadow-sm border border-slate-200 rounded-xl overflow-hidden">
             <EditorContent editor={editor} />
        </div>
      </div>

    </div>
  );
}