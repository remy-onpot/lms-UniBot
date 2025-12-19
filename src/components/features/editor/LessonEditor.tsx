'use client';

// 1. Core Tiptap Imports (User Specified)
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'; // ✅ Added FloatingMenu here

// 2. Logic Extensions (Required for the menus to work)
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';

// 3. Other Extensions
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
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
import Highlight from '@tiptap/extension-highlight';

// 4. Icons & Utils
import { 
  Bold, Italic, List, ListOrdered, 
  Heading1, Heading2, Quote, Undo, Redo, Save, 
  Image as ImageIcon, Youtube as YoutubeIcon,
  Table as TableIcon, Code, CheckSquare, SplitSquareHorizontal, 
  Trash2, Plus, Minus, Highlighter, Scissors 
} from 'lucide-react';
import { cn } from '@/lib/utils'; 
import { useEffect, useCallback, useState } from 'react';

// Initialize Syntax Highlighting
const lowlight = createLowlight(common);

interface LessonEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  isSaving?: boolean;
}

// Helper Component for Toolbar Buttons
const ToolbarButton = ({ onClick, isActive = false, children, title, disabled = false }: any) => (
  <button
    type="button"
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
        codeBlock: false,
      }),
      
      // ✅ LOGIC: Register the Menus
      BubbleMenuExtension.configure({ pluginKey: 'bubbleMenu' }),
      FloatingMenuExtension.configure({ 
        pluginKey: 'floatingMenu'
      }),

      Highlight.configure({ multicolor: true }),
      Typography,
      Placeholder.configure({ placeholder: "Type '/' to insert content or split page..." }),
      
      Image.configure({ inline: true, allowBase64: true }),
      Youtube.configure({ controls: false }),
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
        // ✅ CSS FIXES: Full width, no squeezing, hide empty gaps
        class: 'prose prose-lg prose-slate w-full max-w-none focus:outline-none min-h-[500px] p-8 prose-img:rounded-xl prose-img:shadow-lg prose-p:my-2 prose-headings:mb-2 prose-headings:mt-6 [&_p:empty]:hidden',
      },
    },
    onSelectionUpdate: ({ editor }) => setIsTableMode(editor.isActive('table'))
  });

  // Sync content on load
  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  // --- Handlers ---

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

  // ✅ NEW: Add Page Break (Horizontal Rule)
  const addPageBreak = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full relative group">
      
      {/* 1. STICKY TOP TOOLBAR */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur-sm p-2 flex flex-wrap gap-1 items-center sticky top-0 z-40 shadow-sm transition-all">
        
        {/* Formatting */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Big Heading"><Heading1 className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Sub Heading"><Heading2 className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
        </div>

        {/* ✅ PAGE SPLITTER BUTTON */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
             <ToolbarButton onClick={addPageBreak} title="Insert Page Break (Split Lesson)">
                <div className="flex items-center gap-1 text-xs font-bold text-orange-600">
                    <Scissors className="w-4 h-4" />
                    <span className="hidden sm:inline">Split Page</span>
                </div>
             </ToolbarButton>
        </div>

        {/* Inserts */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-2">
            <ToolbarButton onClick={insertTable} title="Table"><TableIcon className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton onClick={addImage} title="Image"><ImageIcon className="w-4 h-4 text-emerald-600" /></ToolbarButton>
            <ToolbarButton onClick={addYoutube} title="Video"><YoutubeIcon className="w-4 h-4 text-red-600" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')}><Code className="w-4 h-4" /></ToolbarButton>
        </div>

        {/* Table Controls (Dynamic) */}
        {isTableMode && (
           <div className="flex items-center gap-0.5 bg-indigo-50 p-1 rounded-lg border border-indigo-100 mr-2 animate-in fade-in">
              <span className="text-[10px] font-bold text-indigo-400 px-1">TABLE</span>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Col"><SplitSquareHorizontal className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Del Col"><Minus className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row"><Plus className="w-3 h-3"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Del Row"><Minus className="w-3 h-3 rotate-90"/></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 className="w-3 h-3 text-red-500"/></ToolbarButton>
           </div>
        )}

        {/* Save & Actions */}
        <div className="flex items-center gap-1 ml-auto">
             <div className="text-xs text-slate-400 mr-2 font-medium hidden sm:block">
                {editor.storage.characterCount?.words()} words
             </div>
             <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><div className="rotate-180"><Undo className="w-4 h-4" /></div></ToolbarButton>
             <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><div className="rotate-180"><Redo className="w-4 h-4" /></div></ToolbarButton>
            
            <button 
                onClick={() => onSave(editor.getHTML())}
                disabled={isSaving}
                className="ml-2 flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-slate-800 transition text-xs disabled:opacity-50 shadow-sm"
            >
                {isSaving ? 'Saving...' : <><Save className="w-3 h-3" /> Save</>}
            </button>
        </div>
      </div>

      {/* 2. BUBBLE MENU (Appears on Selection) */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          className="flex items-center gap-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
           <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
           <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
           <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')}><Highlighter className="w-4 h-4" /></ToolbarButton>
           <div className="w-px h-4 bg-slate-200 mx-1" />
           <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></ToolbarButton>
        </BubbleMenu>
      )}

      {/* 3. FLOATING MENU (Appears on Empty Line - "Slash Command") */}
      {editor && (
        <FloatingMenu 
          editor={editor} 
          className="flex items-center gap-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-100"
        >
           <div className="flex items-center gap-1 px-2">
             <span className="text-[10px] uppercase font-bold text-slate-400 select-none">Add</span>
           </div>
           
           {/* Split Page Shortcut */}
           <ToolbarButton onClick={addPageBreak} title="Split Page Here"><Scissors className="w-4 h-4 text-orange-500" /></ToolbarButton>
           
           <div className="w-px h-4 bg-slate-200 mx-1" />
           
           <ToolbarButton onClick={insertTable} title="Table"><TableIcon className="w-4 h-4 text-slate-700" /></ToolbarButton>
           <ToolbarButton onClick={addImage} title="Image"><ImageIcon className="w-4 h-4 text-emerald-600" /></ToolbarButton>
           <ToolbarButton onClick={addYoutube} title="Video"><YoutubeIcon className="w-4 h-4 text-red-600" /></ToolbarButton>
           
           <div className="w-px h-4 bg-slate-200 mx-1" />
           
           <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading"><Heading2 className="w-4 h-4" /></ToolbarButton>
           <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} title="List"><List className="w-4 h-4" /></ToolbarButton>
        </FloatingMenu>
      )}

      {/* 4. MAIN EDITOR AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 cursor-text p-4 md:p-8" onClick={() => editor.chain().focus().run()}>
        <div className="max-w-none w-full mx-auto bg-white min-h-[800px] shadow-sm border border-slate-200 rounded-xl overflow-hidden">
             <EditorContent editor={editor} />
        </div>
      </div>

    </div>
  );
}