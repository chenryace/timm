import { api } from 'libs/server/connect';
// Removed metaToJson
import { useAuth } from 'libs/server/middlewares/auth';
import { useStore } from 'libs/server/middlewares/store';
import { getPathNoteById } from 'libs/server/note-path';
import { NoteModel } from 'libs/shared/note';
import { StoreProvider } from 'libs/server/store';
import { API } from 'libs/server/middlewares/error';
// Removed strCompress
import { ROOT_ID } from 'libs/shared/tree';

export async function getNote(
    store: StoreProvider,
    id: string
): Promise<NoteModel> {
    // meta from getObjectAndMeta is already a JS object with StorePostgreSQL
    const { content, meta: directMeta } = await store.getObjectAndMeta(getPathNoteById(id));

    if (!content && !directMeta) {
        throw API.NOT_FOUND.throw();
    }

    // directMeta should contain title, created_at, updated_at, and other fields from the JSONB meta column
    // The NoteModel expects fields like 'title', 'pid', 'pic', 'deleted', 'shared', 'pinned', 'editorsize', 'date'.
    // We assume directMeta provides these or they are mapped correctly by StorePostgreSQL's getObjectAndMeta.
    // Specifically, StorePostgreSQL's getObjectAndMeta for a note returns:
    // { content, meta: { ...metaFromDbJsonb, title, created_at, updated_at }, contentType }
    // So, directMeta here is { ...metaFromDbJsonb, title, created_at, updated_at }
    return {
        id,
        content: content || '\n',
        ...(directMeta || {}), // Spread the directMeta object
    } as NoteModel; // Cast as NoteModel, assuming the structure matches
}

export default api()
    .use(useAuth)
    .use(useStore)
    .delete(async (req, res) => {
        const id = req.query.id as string;
        const notePath = getPathNoteById(id);

        await Promise.all([
            req.state.store.deleteObject(notePath),
            req.state.treeStore.removeItem(id),
        ]);

        res.end();
    })
    .get(async (req, res) => {
        const id = req.query.id as string;

        if (id === ROOT_ID) {
            return res.json({
                id,
            });
        }

        const note = await getNote(req.state.store, id);

        res.json(note);
    })
    .post(async (req, res) => {
        const id = req.query.id as string;
        const { content } = req.body;
        const notePath = getPathNoteById(id);
        // oldMeta from getObjectMeta is already a JS object with StorePostgreSQL
        const oldMeta = await req.state.store.getObjectMeta(notePath);

        const updatedMeta = { ...(oldMeta || {}) };

        // Update the 'date' field directly.
        // Assuming 'date' is a field within the metadata object (potentially from JSONB).
        // If 'date' is meant to be the general update timestamp, StorePostgreSQL's putObject
        // should handle updating 'updated_at' column automatically.
        // For consistency with original S3 logic of explicit 'date' field in meta:
        updatedMeta.date = new Date().toISOString();


        // Empty content may be a misoperation, create a backup
        if (!content || content.trim() === '\\') {
            await req.state.store.copyObject(notePath, notePath + '.bak', {
                meta: updatedMeta, // Pass the updated JS object
                contentType: 'text/markdown',
            });
        }

        await req.state.store.putObject(notePath, content, {
            contentType: 'text/markdown',
            meta: updatedMeta, // Pass the updated JS object
        });

        res.status(204).end();
    });
