import { api, ApiRequest } from 'libs/server/connect';
// Removed jsonToMeta
import { useAuth } from 'libs/server/middlewares/auth';
import { useStore } from 'libs/server/middlewares/store';
import { getPathNoteById } from 'libs/server/note-path';
import { NOTE_DELETED } from 'libs/shared/meta'; // Assuming NOTE_DELETED.NORMAL is a boolean/number
import { ROOT_ID } from 'libs/shared/tree';

export default api()
    .use(useAuth)
    .use(useStore)
    .post(async (req, res) => {
        const { action, data } = req.body as {
            action: 'delete' | 'restore';
            data: {
                id: string;
                parentId?: string;
            };
        };

        switch (action) {
            case 'delete':
                await deleteNote(req, data.id);
                break;

            case 'restore':
                await restoreNote(req, data.id, data.parentId);
                break;

            default:
                return res.APIError.NOT_SUPPORTED.throw('action not found');
        }

        res.status(204).end();
    });

async function deleteNote(req: ApiRequest, id: string) {
    const notePath = getPathNoteById(id);

    // For StorePostgreSQL, deleteObject should mark the note as deleted (soft delete)
    // and treeStore.deleteItem should handle removing it from the tree structure.
    await req.state.store.deleteObject(notePath);
    await req.state.treeStore.deleteItem(id);
}

async function restoreNote(req: ApiRequest, id: string, parentId = ROOT_ID) {
    const notePath = getPathNoteById(id);
    // oldMeta from getObjectMeta is already a JS object with StorePostgreSQL
    const oldMeta = await req.state.store.getObjectMeta(notePath);

    const newRestoredMeta = {
        ...(oldMeta || {}), // Spread existing metadata
        deleted: NOTE_DELETED.NORMAL, // Set to non-deleted state (e.g., false or 0)
        // Optionally, update the date to reflect restoration time, if desired.
        // date: new Date().toISOString(), 
    };
    // StorePostgreSQL's copyObject (or putObject) should interpret 
    // `deleted: NOTE_DELETED.NORMAL` as needing to set `deleted_at = NULL`.

    // copyObject is used to update metadata by copying over itself.
    // For PostgreSQL, putObject might be more direct if we only want to update metadata.
    // However, to maintain consistency with S3 provider's interface for this call:
    await req.state.store.copyObject(notePath, notePath, {
        meta: newRestoredMeta, // Pass the direct JS object
        contentType: 'text/markdown', // contentType might be ignored by StorePostgreSQL for meta-only updates
    });
    await req.state.treeStore.restoreItem(id, parentId);
}
