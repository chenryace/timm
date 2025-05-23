// [start of pages/api/notes/save.ts]
import { api, ApiRequest } from 'libs/server/connect';
import { useAuth } from 'libs/server/middlewares/auth';
import { useStore } from 'libs/server/middlewares/store';
import { genId } from 'libs/shared/id';
import { NoteModel } from 'libs/shared/note';
import { NOTE_DELETED } from 'libs/shared/meta';
import { ROOT_ID } from 'libs/shared/tree';

export default api()
  .use(useAuth)
  .use(useStore)
  .post(async (req: ApiRequest, res) => {
    const {
      id: clientId, // ID from client, could be temporary
      title,
      content,
      pid, // parentId
      deleted,
      ...otherMetaInput
    } = req.body as Partial<NoteModel> & { id?: string };

    if (!title && !content && typeof deleted === 'undefined') {
      return res.APIError.INVALID_REQUEST.throw(
        'Title, content, or deleted status must be provided.'
      );
    }

    const { store, treeStore } = req.state;
    let noteId = clientId;
    let isNewNote = false;
    let existingNoteMeta;

    try {
      if (clientId) {
        try {
          existingNoteMeta = await store.getObjectMeta(
            store.getPath('notes', 'data', clientId) // Corrected: Assuming getPath is on store instance
          );
        } catch (e) {
          console.warn(`Error fetching meta for note ${clientId}, likely a new note with temp ID.`, e);
        }
      }

      if (!existingNoteMeta) {
        isNewNote = true;
        noteId = genId();
      } else if (!noteId) { // Should ideally not be hit if existingNoteMeta is found
        isNewNote = true;
        noteId = genId();
      }
      // If noteId was provided and exists, it remains the same (update scenario)

      if (deleted === NOTE_DELETED.DELETED && noteId && !isNewNote) { // only delete if it's an existing note
        await store.deleteObject(store.getPath('notes', 'data', noteId));
        await treeStore.removeItem(noteId);
        return res.status(200).json({ id: noteId, status: 'deleted' });
      }

      const noteMetaForStore: any = {
        ...(existingNoteMeta || {}), // Start with existing meta if any
        ...otherMetaInput,
        title: title || (existingNoteMeta?.title as string) || '',
        pid: pid || (existingNoteMeta?.pid as string) || ROOT_ID,
      };
      // Ensure 'deleted' is handled correctly for putObject to clear deleted_at if not a delete op
      noteMetaForStore.deleted = deleted; // Pass it to putObject, which should handle deleted_at


      await store.putObject(
        store.getPath('notes', 'data', noteId!),
        content || (existingNoteMeta?.content as string) || '\n',
        {
          meta: noteMetaForStore,
          contentType: 'text/markdown',
        }
      );

      const finalParentId = noteMetaForStore.pid || ROOT_ID;
      if (isNewNote) {
        await treeStore.addItem(noteId!, finalParentId);
      } else if (clientId && existingNoteMeta && existingNoteMeta.pid !== finalParentId) {
        const currentTree = await treeStore.get();
        if (currentTree.items[clientId]) {
          await treeStore.moveItem({ id: clientId, parentId: existingNoteMeta.pid as string || ROOT_ID }, { parentId: finalParentId, index: 0 });
        } else {
          await treeStore.addItem(clientId, finalParentId);
        }
      } else {
        const currentTree = await treeStore.get();
        if(currentTree.items[noteId!]){
            await treeStore.mutateItem(noteId!, { title: noteMetaForStore.title });
        }
      }

      const finalNoteData = await store.getObjectAndMeta(
        store.getPath('notes', 'data', noteId!)
      );

      const responseNote: NoteModel = {
        id: noteId!,
        title: (finalNoteData.meta?.title as string) || '',
        content: finalNoteData.content || '',
        date: (finalNoteData.meta?.updated_at as string) || new Date().toISOString(),
        pid: (finalNoteData.meta?.pid as string) || ROOT_ID,
        deleted: (finalNoteData.meta?.deleted as NOTE_DELETED) || NOTE_DELETED.NORMAL,
        shared: (finalNoteData.meta?.shared as any) || false, // Ensure defaults
        pinned: (finalNoteData.meta?.pinned as any) || false,
        editorsize: (finalNoteData.meta?.editorsize as string) || null,
        ...(finalNoteData.meta || {}),
      };

      res.status(isNewNote ? 201 : 200).json(responseNote);

    } catch (error) {
      console.error('Error in /api/notes/save:', error);
      if (!res.headersSent) {
        res.APIError.INTERNAL_SERVER_ERROR.throw(
          error instanceof Error ? error.message : 'Failed to save note'
        );
      }
    }
  });
// [end of pages/api/notes/save.ts]
