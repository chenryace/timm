import { NoteModel } from 'libs/shared/note';
import { genId } from 'libs/shared/id';
// Removed import of jsonToMeta
import { getPathNoteById } from 'libs/server/note-path';
import { ServerState } from './connect';

export const createNote = async (note: NoteModel, state: ServerState): Promise<NoteModel> => {
    const content = note.content === undefined || note.content === null ? '\n' : note.content;
    
    let noteId = note.id || genId();

    // Ensure ID uniqueness
    while (await state.store.hasObject(getPathNoteById(noteId))) {
        noteId = genId();
    }

    // Prepare metadata for StorePostgreSQL
    // This object will be passed to putObject's options.meta
    // It includes all fields from NoteModel except content, and ensures id and date are set.
    const noteMetaDataForStore: Omit<NoteModel, 'content'> & { id: string; date: string } = {
        id: noteId,
        title: note.title || '', // Ensure title is at least an empty string
        pid: note.pid,
        pic: note.pic, // Assuming pic is still relevant
        deleted: note.deleted || false,
        shared: note.shared || false,
        pinned: note.pinned || false,
        editorsize: note.editorsize,
        date: note.date ?? new Date().toISOString(),
        // Include any other NoteModel fields that should be stored in the meta JSONB column
        // For example, if NoteModel has 'tags' or 'customProperties':
        // tags: note.tags, 
        // customProperties: note.customProperties,
    };

    await state.store.putObject(
        getPathNoteById(noteId),
        content,
        {
            contentType: 'text/markdown',
            meta: noteMetaDataForStore as any, // Type cast as 'any' or a broader type for meta
        }
    );

    // Return the full note object, consistent with NoteModel, including content and the (potentially new) id
    return {
        ...noteMetaDataForStore,
        content: content,
    };
};
