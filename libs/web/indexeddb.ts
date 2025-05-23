import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'notea-local-db';
const DB_VERSION = 1;
const NOTES_STORE_NAME = 'localNotes';

export interface LocalNote {
  id: string; // Can be temporary client-side ID or permanent server ID
  title: string;
  content: string;
  lastModified: number; // Timestamp of local save
  serverId?: string; // To store the permanent server ID if 'id' is temporary
  pid?: string;
  // Add any other fields from NoteModel you want to cache locally
  deleted?: number; // or boolean, consistent with NOTE_DELETED
  shared?: number; // or boolean
  pinned?: number; // or boolean
  editorsize?: string | null;
}

interface LocalNotesDBSchema extends DBSchema {
  [NOTES_STORE_NAME]: {
    key: string; // id
    value: LocalNote;
    indexes: { lastModified: number };
  };
}

let dbPromise: Promise<IDBPDatabase<LocalNotesDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<LocalNotesDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LocalNotesDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('Upgrading IndexedDB...', { oldVersion, newVersion });
        if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
          const store = db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
          store.createIndex('lastModified', 'lastModified');
        }
        // Handle other version upgrades if necessary
      },
    });
  }
  return dbPromise;
}

export async function saveLocalNote(note: LocalNote): Promise<void> {
  try {
    const db = await getDB();
    await db.put(NOTES_STORE_NAME, note);
    console.log('Note saved locally:', note.id);
  } catch (error) {
    console.error('Failed to save note to IndexedDB:', error);
    throw error; // Re-throw so UI can be aware
  }
}

export async function getLocalNote(id: string): Promise<LocalNote | undefined> {
  try {
    const db = await getDB();
    const note = await db.get(NOTES_STORE_NAME, id);
    if (note) {
      console.log('Note retrieved locally:', id, note);
    }
    return note;
  } catch (error) {
    console.error('Failed to get note from IndexedDB:', error);
    // Do not re-throw, as failure to get from cache is often non-critical
    return undefined;
  }
}

export async function deleteLocalNote(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(NOTES_STORE_NAME, id);
    console.log('Note deleted locally:', id);
  } catch (error) {
    console.error('Failed to delete note from IndexedDB:', error);
    throw error;
  }
}

// Utility to update a note's ID, e.g., from temporary to permanent
export async function updateLocalNoteId(oldId: string, newId: string, newServerData: Partial<LocalNote>): Promise<void> {
  try {
    const db = await getDB();
    const existingNote = await db.get(NOTES_STORE_NAME, oldId);
    if (existingNote) {
      const updatedNote: LocalNote = {
        ...existingNote,
        ...newServerData, // Apply new data from server (like correct dates, etc)
        id: newId,        // Update the ID itself
        serverId: newId,  // Ensure serverId is the new permanent ID
      };
      const tx = db.transaction(NOTES_STORE_NAME, 'readwrite');
      await Promise.all([
        tx.store.delete(oldId),
        tx.store.put(updatedNote),
        tx.done,
      ]);
      console.log(\`Local note ID updated from \${oldId} to \${newId}\`);
    } else {
      // If old note doesn't exist, just save the new one if serverData is complete enough
      // This case might indicate an issue, or it's a fresh save from server data
      const noteToSave: LocalNote = {
        id: newId,
        title: newServerData.title || '',
        content: newServerData.content || '',
        lastModified: newServerData.lastModified || Date.now(),
        serverId: newId,
        ...newServerData,
      };
      await saveLocalNote(noteToSave);
      console.warn(\`Original note with temp ID \${oldId} not found for ID update. Saved new record for \${newId}.\`);
    }
  } catch (error) {
    console.error('Failed to update note ID in IndexedDB:', error);
    throw error;
  }
}

// [end of libs/web/indexeddb.ts]
