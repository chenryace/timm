import { api } from 'libs/server/connect';
// Removed jsonToMeta, metaToJson
import { useAuth } from 'libs/server/middlewares/auth';
import { useStore } from 'libs/server/middlewares/store';
import { getPathNoteById } from 'libs/server/note-path';
import { NOTE_DELETED } from 'libs/shared/meta'; // Assuming NOTE_DELETED.DELETED is a boolean/number

export default api()
    .use(useAuth)
    .use(useStore)
    .post(async (req, res) => {
        const id = req.body.id || (req.query.id as string);
        const notePath = getPathNoteById(id);
        // oldMeta from getObjectMeta is already a JS object with StorePostgreSQL
        const oldMeta = await req.state.store.getObjectMeta(notePath) || {};

        // Merge old metadata with new metadata from request body
        // req.body might contain fields like 'title', 'pid', 'pic', 'deleted', 'shared', 'pinned', 'editorsize'
        const newMeta = {
            ...oldMeta,
            ...req.body,
            date: new Date().toISOString(), // Update date
        };

        // Ensure id from path parameter is authoritative if present in body
        if (req.query.id) {
            newMeta.id = req.query.id as string;
        } else if (req.body.id) {
             newMeta.id = req.body.id;
        }


        // Handle tree update if 'deleted' status changes to deleted
        const previousDeletedStatus = oldMeta.deleted; // Assuming 'deleted' is a field in the meta object
        const currentDeletedStatus = newMeta.deleted;

        if (
            previousDeletedStatus !== currentDeletedStatus &&
            currentDeletedStatus === NOTE_DELETED.DELETED // e.g. true or 1
        ) {
            await req.state.treeStore.removeItem(id);
        }
        // Note: StorePostgreSQL's putObject/copyObject should handle setting 'deleted_at'
        // based on the 'deleted' field in the metadata.

        // copyObject is used to update metadata in S3 by copying over itself.
        // For PostgreSQL, putObject might be more direct if we only want to update metadata.
        // However, to maintain consistency with S3 provider's interface for this call:
        await req.state.store.copyObject(notePath, notePath, {
            meta: newMeta, // Pass the direct JS object
            contentType: 'text/markdown', // contentType might be ignored by StorePostgreSQL for meta-only updates
        });

        res.status(204).end();
    })
    .get(async (req, res) => {
        const id = req.query.id as string;
        const notePath = getPathNoteById(id);
        // meta from getObjectMeta is already a JS object
        const meta = await req.state.store.getObjectMeta(notePath);

        if (!meta) {
            // Consistent with previous behavior of metaToJson returning {} for undefined meta
            return res.json({});
        }
        // Return the direct JS object
        res.json(meta);
    });
