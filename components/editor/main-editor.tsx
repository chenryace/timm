import { NoteModel } from 'libs/shared/note';
import dynamic from 'next/dynamic';
import { HTMLAttributes, useEffect, useMemo } from 'react';
import EditTitle from './edit-title';
import NoteState, { useNoteState } from 'libs/web/state/note';
import PortalState from 'libs/web/state/portal';
import UIState from 'libs/web/state/ui';
import { EditorState, useEditor } from 'libs/web/state/editor';
import Backlinks from './backlinks';
import { useRouter } from 'next/router';
import { NOTE_ID_REGEXP } from 'libs/shared/note';
import { get } from 'lodash';
import { Skeleton, Button } from '@mui/material'; // Added Button for Save
import Box from '@mui/material/Box'; // Added Box for layout

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
  const { नोट: noteFromNoteState, loading: noteStateLoading } = useNoteState(); // Typo in original?
  const noteToUse = props.note || noteFromNoteState;
  const { settings } = UIState.useContainer();
  const { modal } = PortalState.useContainer();
  const editorState = useEditor(); // Use our new editor state hook
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
    // Initialize editor with note content when note is loaded or ID changes
    // This is now largely handled within useEditor's useEffect
    if (editorState.editor && !editorState.isLoading && noteToUse) {
      if (editorState.editor.isDestroyed) return;
      // Content setting is managed by effectiveContent in useEditor
    }
  }, [editorState.editor, noteToUse?.id, editorState.isLoading, editorState.effectiveContent]);

  const showBacklinks = useMemo(() => {
    return (
      !isNewNoteFlow &&
      noteToUse &&
      settings. backlinks &&
      !noteToUse.shared
    );
  }, [noteToUse, settings.backlinks, isNewNoteFlow]);

  if (editorState.isLoading || noteStateLoading) {
    return (
      <div className="px-4 pb-4">
        <Skeleton variant="text" width={200} height={40} className="mb-2" /> {/* Title placeholder */}
        <Skeleton variant="rectangular" height={300} className="mt-4" />
      </div>
    );
  }

  // If no note is active (e.g. on / a new session, or after a note is deleted and not redirected yet)
  // and not in the new note flow, show some placeholder or guide.
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
          id={noteToUse?.id || (isNewNoteFlow ? 'new-note-editor' : undefined)} // Ensure editor has a key to re-mount on note change
          value={editorState.effectiveContent}
          onChange={(v) => editorState.onEditorContentChange(v)}
          editable={!noteToUse?.shared}
        />
        {showBacklinks && <Backlinks note={noteToUse} />}
      </div>
    </section>
  );
};

// Helper to check if an object has a property, useful for router.query
function has(obj: any, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}


export default MainEditor;
// [end of components/editor/main-editor.tsx]
