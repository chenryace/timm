import { NoteModel } from 'libs/shared/note';
import dynamic from 'next/dynamic';
import { HTMLAttributes, useEffect, useMemo } from 'react';
import EditTitle from './edit-title';
import { useNoteState } from 'libs/web/state/note'; // Removed direct import of NoteState
import PortalState from 'libs/web/state/portal';
import UIState from 'libs/web/state/ui';
import { useEditor } from 'libs/web/state/editor'; // Removed direct import of EditorState
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

const MainEditor = (
  props: HTMLAttributes<HTMLDivElement> & {
    note?: NoteModel;
    padding?: boolean;
  }
) => {
  const { note: noteFromNoteState, loading: noteStateLoading } = useNoteState();
  const noteToUse = props.note || noteFromNoteState;
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

  useEffect(() => {
    // Logic related to editor content initialization is now primarily within useEditor hook
  }, [noteToUse?.id]); // Simplified dependencies, as useEditor handles its own effects based on ID

  const showBacklinks = useMemo(() => {
    return (
      !isNewNoteFlow &&
      noteToUse &&
      settings.backlinks &&
      !noteToUse.shared
    );
  }, [noteToUse, settings.backlinks, isNewNoteFlow]);

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
              Please select a note from the left or create a new one.
          </div>
      );
  }

  return (
    <section {...props}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingX: props.padding ? 4 : 0, paddingTop: 2 }}>
        <EditTitle 
          value={editorState.effectiveTitle} 
          onChange={(e) => editorState.handleTitleChange(e.target.value)} 
          isLoading={editorState.isLoading} // Pass isLoading to EditTitle
        />
        <Button 
          variant="contained" 
          onClick={editorState.saveNoteToServer}
          disabled={editorState.isSaving || (!editorState.hasLocalChanges && !isNewNoteFlow) || editorState.isLoading}
          size="small"
        >
          {editorState.isSaving ? 'Saving...' : 'Save to Server'}
        </Button>
      </Box>
      
      {modal}
      <div className={props.padding ? 'px-4 pb-4' : 'pb-4'}>
        <Editor
          _id={noteToUse?.id || (isNewNoteFlow ? 'new-note-editor' : undefined)} // Pass _id prop
          value={editorState.effectiveContent}
          onChange={(v) => editorState.onEditorContentChange(v)}
          editable={!noteToUse?.shared}
          isLoading={editorState.isLoading} // Pass isLoading to Editor component
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
