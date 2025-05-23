import { NoteModel } from 'libs/shared/note';
import dynamic from 'next/dynamic';
import { HTMLAttributes, useEffect, useMemo } from 'react';
import EditTitle from './edit-title';
import { useNoteState } from 'libs/web/state/note';
import PortalState from 'libs/web/state/portal';
import UIState from 'libs/web/state/ui';
import { useEditor } from 'libs/web/state/editor';
import Backlinks from './backlinks';
import { useRouter } from 'next/router';
import { NOTE_ID_REGEXP } from 'libs/shared/note';
import { get } from 'lodash';
import { Skeleton, Button } from '@mui/material';
import Box from '@mui/material/Box';

const Editor = dynamic(() => import('./editor'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={300} className="mt-4" />,
});

// Define the props for MainEditor
interface MainEditorProps extends HTMLAttributes<HTMLDivElement> {
  note?: NoteModel;
  padding?: boolean;
  readOnly?: boolean; // Added readOnly prop
  isPreview?: boolean; // Added isPreview prop (optional, if MainEditor needs to behave differently)
}

const MainEditor = (
  props: MainEditorProps
) => {
  const { 
    note: noteFromProps, 
    padding, 
    readOnly = false, // Default to false if not provided
    isPreview = false, 
    ...restHtmlProps 
  } = props;

  const { note: noteFromNoteState, loading: noteStateLoading } = useNoteState();
  const noteToUse = noteFromProps || noteFromNoteState;
  const { settings } = UIState.useContainer();
  const { modal } = PortalState.useContainer();
  const editorState = useEditor();
  const router = useRouter();

  const noteIdFromRouter = useMemo(() => {
    const id = get(router.query, 'id') as string;
    if (id && NOTE_ID_REGEXP.test(id)) {
      return id;
    }
    return null;
  }, [router.query.id]);
  
  const isNewNoteFlow = useMemo(() => has(router.query, 'new'), [router.query.new]);

  // useEffect for editor content initialization is primarily handled within useEditor hook

  const showBacklinks = useMemo(() => {
    return (
      !isNewNoteFlow &&
      noteToUse &&
      settings.backlinks &&
      !noteToUse.shared &&
      !isPreview // Do not show backlinks in preview mode, for example
    );
  }, [noteToUse, settings.backlinks, isNewNoteFlow, isPreview]);

  const effectiveReadOnly = readOnly || isPreview; // Preview mode should also be read-only for editor

  if (editorState.isLoading || noteStateLoading) {
    return (
      <div className="px-4 pb-4">
        <Skeleton variant="text" width={200} height={40} className="mb-2" />
        <Skeleton variant="rectangular" height={300} className="mt-4" />
      </div>
    );
  }

  if (!noteToUse && !isNewNoteFlow && !noteIdFromRouter) {
      return (
          <div className="p-4 text-center text-gray-500">
              请从左侧选择一篇笔记或创建新笔记。
          </div>
      );
  }

  return (
    <section {...restHtmlProps}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingX: padding ? 4 : 0, paddingTop: 2 }}>
        <EditTitle 
          value={editorState.effectiveTitle} 
          onChange={(e) => editorState.handleTitleChange(e.target.value)} 
          isLoading={editorState.isLoading}
          readOnly={effectiveReadOnly} // Pass readOnly status to EditTitle if it supports it
        />
        {/* Hide Save button in readOnly or preview mode, or if it's a shared note being viewed */}
        {!(effectiveReadOnly || noteToUse?.shared) && (
          <Button 
            variant="contained" 
            onClick={editorState.saveNoteToServer}
            disabled={editorState.isSaving || (!editorState.hasLocalChanges && !isNewNoteFlow) || editorState.isLoading}
            size="small"
          >
            {editorState.isSaving ? '保存中...' : '保存到服务器'}
          </Button>
        )}
      </Box>
      
      {modal}
      <div className={padding ? 'px-4 pb-4' : 'pb-4'}>
        <Editor
          _id={noteToUse?.id || (isNewNoteFlow ? 'new-note-editor' : undefined)}
          value={editorState.effectiveContent}
          onChange={(v) => editorState.onEditorContentChange(v)}
          editable={!effectiveReadOnly && !noteToUse?.shared} // Editor is not editable if in readOnly/preview or shared
          isLoading={editorState.isLoading}
        />
        {showBacklinks && <Backlinks note={noteToUse} />} 
      </div>
    </section>
  );
};

function has(obj: any, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

export default MainEditor;
