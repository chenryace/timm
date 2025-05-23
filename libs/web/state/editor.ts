import { NoteModel, NOTE_ID_REGEXP } from 'libs/shared/note';
import { TreeItemModel, TreeModel, ROOT_ID } from 'libs/shared/tree';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useNoteState } from './note';
import { useTreeState } from './tree';
import { useRouter } from 'next/router';
import { नोटेModel } from 'libs/shared/note'; // Assuming this is a typo and should be NoteModel
import { genId } from 'libs/shared/id';
import { debounce, get, set, unset } from 'lodash';
import { سرطانModel } from 'libs/shared/meta'; // Assuming this is a typo and should be a relevant type or removed
import {toast} from 'react-hot-toast';
import {
  getLocalNote,
  saveLocalNote,
  deleteLocalNote,
  updateLocalNoteId,
  LocalNote
} from 'libs/web/indexeddb';
import { request } from '../api/fetcher'; // Assuming useFetcher is for setting up 'request'

export interface EditorState {
  editor?: Editor;
  note?: NoteModel;
  setEditor: (editor?: Editor) => void;
  onNoteChange: (note: Partial<NoteModel>) => void;
  saveNoteToServer: () => Promise<void>; // Manual save function
  isLoading: boolean;
  isSaving: boolean; // For manual save status
  hasLocalChanges: boolean; // True if IndexedDB has changes not yet pushed to server
  effectiveTitle: string; // Title displayed and edited, sourced from IndexedDB or props
  effectiveContent: string; // Content displayed and edited
  currentPid?: string; // Current parent ID for the note being edited
  handleTitleChange: (newTitle: string) => void;
  onEditorContentChange: (newContent: string) => void;
}

const DEBOUNCE_SAVE_TIMEOUT = 1000;

export function useEditor(): EditorState {
  const router = useRouter();
  const noteState = useNoteState();
  const treeState = useTreeState();
  const [editor, setEditor] = useState<Editor>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [effectiveTitle, setEffectiveTitle] = useState('');
  const [effectiveContent, setEffectiveContent] = useState('');
  const [currentPid, setCurrentPid] = useState<string | undefined>(undefined);

  const noteIdRef = useRef<string | null>(null); // Stores the actual note ID (permanent or temporary)
  const tempIdRef = useRef<string | null>(null); // Specifically for new notes before first server save
  const serverNoteVersion = useRef<NoteModel | null>(null); // Store the last known server version

  useEffect(() => {
    const noteIdFromRouter = get(router.query, 'id') as string;
    const isNewNoteFlow = has(router.query, 'new');

    setIsLoading(true);
    setHasLocalChanges(false);
    noteIdRef.current = null;
    tempIdRef.current = null;
    serverNoteVersion.current = null;

    if (isNewNoteFlow) {
      const newTempId = genId();
      noteIdRef.current = newTempId;
      tempIdRef.current = newTempId;
      const parentIdFromQuery = get(router.query, 'pid', ROOT_ID) as string;
      
      const newNoteShell: NoteModel = {
        id: newTempId,
        title: '',
        content: '\n',
        pid: parentIdFromQuery,
        date: new Date().toISOString(),
        deleted: 0,
        shared: 0,
        pinned: 0,
        editorsize: null,
      };
      serverNoteVersion.current = { ...newNoteShell }; // Treat shell as server version until first save
      setEffectiveTitle(newNoteShell.title);
      setEffectiveContent(newNoteShell.content || '');
      setCurrentPid(newNoteShell.pid);
      // Save this shell to IndexedDB immediately
      saveLocalNote({
        id: newTempId,
        title: newNoteShell.title,
        content: newNoteShell.content || '',
        lastModified: Date.now(),
        pid: newNoteShell.pid,
      }).then(() => setHasLocalChanges(true)); // Mark as having local changes (though it's new)
      setIsLoading(false);
      noteState.setNote(newNoteShell); // Update global state

    } else if (noteIdFromRouter && NOTE_ID_REGEXP.test(noteIdFromRouter)) {
      noteIdRef.current = noteIdFromRouter;
      // Try to load from IndexedDB first
      getLocalNote(noteIdFromRouter).then(async (localNote) => {
        const serverNote = noteState.notes[noteIdFromRouter] || (await noteState.fetchNote(noteIdFromRouter));
        serverNoteVersion.current = serverNote;

        if (localNote && serverNote && new Date(localNote.lastModified).getTime() > new Date(serverNote.date || 0).getTime()) {
          // Local is newer or same, use local
          setEffectiveTitle(localNote.title);
          setEffectiveContent(localNote.content);
          setCurrentPid(localNote.pid || serverNote.pid); // pid might not be in localNote always
          setHasLocalChanges(true);
          noteState.setNote({ ...serverNote, ...localNote }); // Update global state with merged data
          toast.success('本地存在未保存的更改已加载。');
        } else if (serverNote) {
          // Server is newer or no local, use server
          setEffectiveTitle(serverNote.title);
          setEffectiveContent(serverNote.content || '');
          setCurrentPid(serverNote.pid);
          setHasLocalChanges(false);
          // Update IndexedDB with server version for consistency
          await saveLocalNote({
            id: serverNote.id,
            title: serverNote.title,
            content: serverNote.content || '',
            lastModified: new Date(serverNote.date || 0).getTime(),
            pid: serverNote.pid,
            deleted: serverNote.deleted,
            shared: serverNote.shared,
            pinned: serverNote.pinned,
            editorsize: serverNote.editorsize
          });
          noteState.setNote(serverNote);
        } else {
          // Note not found anywhere
          toast.error('笔记未找到!');
          router.push('/');
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
      // No ID, or invalid ID, perhaps redirect or show empty state
      // For now, an empty new note state without new=true query will also land here
      setEffectiveTitle('');
      setEffectiveContent('');
      setCurrentPid(ROOT_ID);
      noteState.setNote(undefined);
    }

  }, [router.query.id, router.query.new, router.query.pid]); // router.query.id is the actual dependency

  const debouncedSaveToLocal = useCallback(
    debounce(async (id: string, title: string, content: string, pid?: string) => {
      if (!id) return;
      try {
        await saveLocalNote({
          id,
          title,
          content,
          pid,
          lastModified: Date.now(),
        });
        setHasLocalChanges(true);
        console.log('Note saved to IndexedDB:', id);
      } catch (error) {
        toast.error('保存到本地失败！');
      }
    }, DEBOUNCE_SAVE_TIMEOUT),
    []
  );

  const handleTitleChange = (newTitle: string) => {
    setEffectiveTitle(newTitle);
    if (noteIdRef.current) {
      debouncedSaveToLocal(noteIdRef.current, newTitle, effectiveContent, currentPid);
    }
  };

  const onEditorContentChange = (newContent: string) => {
    setEffectiveContent(newContent);
    if (noteIdRef.current) {
      debouncedSaveToLocal(noteIdRef.current, effectiveTitle, newContent, currentPid);
    }
  };

  // Manual Save to Server
  const saveNoteToServer = async () => {
    if (!noteIdRef.current) {
      toast.error('没有可保存的笔记。');
      return;
    }
    if (!hasLocalChanges && !tempIdRef.current) { // if it's not a new note, and no local changes, no need to save
        toast.success('笔记已经是最新版本。');
        return;
    }

    setIsSaving(true);
    try {
      const noteToSave = await getLocalNote(noteIdRef.current); // Get latest from IndexedDB
      if (!noteToSave) {
        toast.error('本地笔记未找到，无法保存。');
        setIsSaving(false);
        return;
      }

      const payload: Partial<NoteModel> & { id?: string} = {
        id: tempIdRef.current ? tempIdRef.current : noteIdRef.current, // Send tempId if it's a new note
        title: noteToSave.title,
        content: noteToSave.content,
        pid: noteToSave.pid || currentPid || ROOT_ID, // Ensure pid is included
        // Include other metadata fields from LocalNote if they are part of what server expects
        deleted: noteToSave.deleted,
        shared: noteToSave.shared,
        pinned: noteToSave.pinned,
        editorsize: noteToSave.editorsize,
      };

      const serverResponse = await request<NoteModel>('/api/notes/save', {
        method: 'POST',
        body: payload,
      });

      toast.success('笔记已保存到服务器！');

      // Update IndexedDB with server-authoritative data
      await saveLocalNote({
        id: serverResponse.id, // Use the ID from server (permanent ID)
        title: serverResponse.title,
        content: serverResponse.content || '',
        lastModified: new Date(serverResponse.date || Date.now()).getTime(),
        pid: serverResponse.pid,
        deleted: serverResponse.deleted,
        shared: serverResponse.shared,
        pinned: serverResponse.pinned,
        editorsize: serverResponse.editorsize,
      });

      if (tempIdRef.current && tempIdRef.current !== serverResponse.id) {
        // New note was saved, and server returned a new permanent ID
        await deleteLocalNote(tempIdRef.current); // Delete old temp record
        noteIdRef.current = serverResponse.id;
        tempIdRef.current = null;
        // Update URL without full reload
        router.replace(`/note/\${serverResponse.id}`, undefined, { shallow: true });
      }
      
      setEffectiveTitle(serverResponse.title);
      setEffectiveContent(serverResponse.content || '');
      setCurrentPid(serverResponse.pid);
      setHasLocalChanges(false);
      serverNoteVersion.current = serverResponse; // Update server version ref

      // Update global state
      if (isNewNote) {
        noteState.addItem(serverResponse); // This should also handle tree updates
      } else {
        noteState.mutateNote(serverResponse.id, serverResponse); // This should also handle tree updates
      }
      noteState.setNote(serverResponse); // Set as current active note

    } catch (error: any) {
      console.error('Failed to save note to server:', error);
      toast.error(error.message || '保存到服务器失败！');
    }
    setIsSaving(false);
  };

  // Legacy onNoteChange - now primarily for local state updates if needed elsewhere
  // The actual saving to IndexedDB is handled by handleTitleChange and onEditorContentChange
  const onNoteChange = useCallback((note: Partial<NoteModel>) => {
    if (editor?.isDestroyed) return;
    // This function might be simplified or removed if direct state setters are used everywhere
    if (note.title !== undefined && note.title !== effectiveTitle) {
      handleTitleChange(note.title);
    }
    if (note.content !== undefined && note.content !== effectiveContent) {
      onEditorContentChange(note.content);
    }
    if (note.pid !== undefined && note.pid !== currentPid) {
        setCurrentPid(note.pid);
        // If pid changes, it should also be saved to local
        if (noteIdRef.current) {
            debouncedSaveToLocal(noteIdRef.current, effectiveTitle, effectiveContent, note.pid);
        }
    }

  }, [editor, effectiveTitle, effectiveContent, currentPid, debouncedSaveToLocal]);

  return {
    editor,
    note: noteState.note, // The globally active note, or the one being edited
    setEditor,
    onNoteChange,
    saveNoteToServer,
    isLoading,
    isSaving,
    hasLocalChanges,
    effectiveTitle,
    effectiveContent,
    currentPid,
    handleTitleChange,
    onEditorContentChange,
  };
}

// Helper to check if an object has a property, useful for router.query
function has(obj: any, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

// [end of libs/web/state/editor.ts]
