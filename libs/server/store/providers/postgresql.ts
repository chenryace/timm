import { Pool, QueryResultRow } from 'pg';
import {
  StoreProvider,
  StoreProviderConfig,
  ObjectOptions,
} from './base';

interface ParsedNotePath {
  type: 'note';
  id: string;
}

interface ParsedTreePath {
  type: 'tree';
}

type ParsedPath = ParsedNotePath | ParsedTreePath | null;

export class StorePostgreSQL extends StoreProvider {
  private pool: Pool;
  private prefix: string; // Currently not used in table names, but kept for consistency

  constructor(config: StoreProviderConfig & { connectionString: string }) {
    super(config);
    this.prefix = config.prefix || '';
    this.pool = new Pool({ connectionString: config.connectionString });
    console.log('StorePostgreSQL initialized with prefix:', this.prefix);
  }

  private parsePath(path: string): ParsedPath {
    const unprefixedPath = path.startsWith(this.prefix)
      ? path.substring(this.prefix.length)
      : path;

    if (unprefixedPath === 'tree.json') {
      return { type: 'tree' };
    }

    const noteDataMatch = unprefixedPath.match(/^notes\/data\/([a-zA-Z0-9_-]+)$/);
    if (noteDataMatch) {
      return { type: 'note', id: noteDataMatch[1] };
    }
    return null;
  }

  getPath(...paths: string[]): string {
    // Prefix is handled by parsePath if needed for routing, not directly in SQL queries here.
    return [this.prefix, ...paths].join('/').replace(/\/+/g, '/');
  }

  async getSignUrl(path: string, expires: number): Promise<string | null> {
    path; // unused
    expires; // unused
    return Promise.resolve(null); // S3-specific, not applicable to PostgreSQL
  }

  async hasObject(path: string): Promise<boolean> {
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`hasObject: Invalid path format: ${path}`);
      return false;
    }

    try {
      if (parsedPath.type === 'note') {
        const query = 'SELECT EXISTS (SELECT 1 FROM notes WHERE id = $1 AND deleted_at IS NULL)';
        const result = await this.pool.query(query, [parsedPath.id]);
        return result.rows[0]?.exists || false;
      } else if (parsedPath.type === 'tree') {
        const query = "SELECT EXISTS (SELECT 1 FROM tree_state WHERE singleton_key = 'main_tree')";
        const result = await this.pool.query(query);
        return result.rows[0]?.exists || false;
      }
    } catch (error) {
      console.error(`hasObject: Error querying for path ${path}`, error);
    }
    return false;
  }

  async getObject(path: string, isCompressed?: boolean): Promise<string | undefined> {
    isCompressed; // unused
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`getObject: Invalid path format: ${path}`);
      return undefined;
    }

    try {
      if (parsedPath.type === 'note') {
        const query = 'SELECT content FROM notes WHERE id = $1 AND deleted_at IS NULL';
        const result = await this.pool.query(query, [parsedPath.id]);
        return result.rows[0]?.content;
      } else if (parsedPath.type === 'tree') {
        const query = "SELECT items, roots FROM tree_state WHERE singleton_key = 'main_tree'";
        const result = await this.pool.query(query);
        if (result.rows[0]) {
          return JSON.stringify({ items: result.rows[0].items, roots: result.rows[0].roots });
        }
      }
    } catch (error) {
      console.error(`getObject: Error querying for path ${path}`, error);
    }
    return undefined;
  }

  async getObjectMeta(path: string): Promise<{ [key: string]: any } | undefined> {
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`getObjectMeta: Invalid path format: ${path}`);
      return undefined;
    }

    try {
      if (parsedPath.type === 'note') {
        const query = 'SELECT id, title, created_at, updated_at, meta FROM notes WHERE id = $1 AND deleted_at IS NULL';
        const result = await this.pool.query(query, [parsedPath.id]);
        if (result.rows[0]) {
          const { id, title, created_at, updated_at, meta } = result.rows[0];
          return {
            ...(meta || {}), // Spread JSONB meta field, ensure it's an object
            id,
            title,
            created_at: created_at ? new Date(created_at).toISOString() : undefined,
            updated_at: updated_at ? new Date(updated_at).toISOString() : undefined,
          };
        }
      } else if (parsedPath.type === 'tree') {
        const query = "SELECT updated_at FROM tree_state WHERE singleton_key = 'main_tree'";
        const result = await this.pool.query(query);
        if (result.rows[0] && result.rows[0].updated_at) {
          return { updated_at: new Date(result.rows[0].updated_at).toISOString() };
        }
      }
    } catch (error) {
      console.error(`getObjectMeta: Error querying for path ${path}`, error);
    }
    return undefined;
  }

  async getObjectAndMeta(path: string, isCompressed?: boolean): Promise<{ content?: string; meta?: { [key: string]: any }; contentType?: string; buffer?: Buffer }> {
    isCompressed; // unused
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`getObjectAndMeta: Invalid path format: ${path}`);
      return {};
    }

    try {
      if (parsedPath.type === 'note') {
        const query = 'SELECT id, content, title, created_at, updated_at, meta FROM notes WHERE id = $1 AND deleted_at IS NULL';
        const result = await this.pool.query(query, [parsedPath.id]);
        if (result.rows[0]) {
          const { id, content, title, created_at, updated_at, meta } = result.rows[0];
          const metaObj = {
            ...(meta || {}),
            id,
            title,
            created_at: created_at ? new Date(created_at).toISOString() : undefined,
            updated_at: updated_at ? new Date(updated_at).toISOString() : undefined,
          };
          return { content, meta: metaObj, contentType: 'text/markdown' };
        }
      } else if (parsedPath.type === 'tree') {
        const treeQuery = "SELECT items, roots, updated_at FROM tree_state WHERE singleton_key = 'main_tree'";
        const result = await this.pool.query(treeQuery);
        if (result.rows[0]) {
          const { items, roots, updated_at } = result.rows[0];
          const content = JSON.stringify({ items, roots });
          const meta = updated_at ? { updated_at: new Date(updated_at).toISOString() } : {};
          return { content, meta, contentType: 'application/json' };
        }
      }
    } catch (error) {
      console.error(`getObjectAndMeta: Error querying for path ${path}`, error);
    }
    return {};
  }

  async putObject(path: string, raw: string | Buffer, options?: ObjectOptions, isCompressed?: boolean): Promise<void> {
    isCompressed; // unused
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`putObject: Invalid path format: ${path}`);
      return;
    }

    const content = typeof raw === 'string' ? raw : raw.toString('utf-8');

    try {
      if (parsedPath.type === 'note') {
        const noteId = parsedPath.id;
        const providedMeta = options?.meta || {};
        const title = providedMeta.title || 'Untitled';
        
        const { id: metaId, title: metaTitle, ...otherMetaFields } = providedMeta;
        // metaId and metaTitle are deliberately destructured and not included in otherMetaFields
        // 'id' comes from noteId (path), 'title' is a dedicated column.

        // Determine deleted_at status
        // If options.meta.deleted is true (or whatever NOTE_DELETED.DELETED maps to),
        // it means a soft delete is intended through metadata update.
        // However, standard putObject for notes implies an active note, so deleted_at should be NULL.
        // If a soft delete is intended via putObject, options.meta.deleted should be checked.
        // For now, aligning with "ensure `deleted_at` is cleared on update":
        const deletedAt = null; // Or based on options.meta.deleted if that's a feature

        const query = `
          INSERT INTO notes (id, title, content, meta, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            meta = EXCLUDED.meta,
            updated_at = NOW(),
            deleted_at = EXCLUDED.deleted_at
        `;
        await this.pool.query(query, [noteId, title, content, otherMetaFields, deletedAt]);
      } else if (parsedPath.type === 'tree') {
        const treeData = JSON.parse(content); // Expects { items, roots }
        const query = `
          INSERT INTO tree_state (singleton_key, items, roots, updated_at)
          VALUES ('main_tree', $1, $2, NOW())
          ON CONFLICT (singleton_key) DO UPDATE SET
            items = EXCLUDED.items,
            roots = EXCLUDED.roots,
            updated_at = NOW()
        `;
        await this.pool.query(query, [treeData.items, treeData.roots]);
      }
    } catch (error) {
      console.error(`putObject: Error processing path ${path}`, error);
      // Optionally re-throw or handle more gracefully
    }
  }

  async deleteObject(path: string): Promise<void> {
    const parsedPath = this.parsePath(path);

    if (!parsedPath) {
      console.error(`deleteObject: Invalid path format: ${path}`);
      return;
    }

    try {
      if (parsedPath.type === 'note') {
        const query = 'UPDATE notes SET deleted_at = NOW() WHERE id = $1';
        await this.pool.query(query, [parsedPath.id]);
      } else if (parsedPath.type === 'tree') {
        console.warn('deleteObject: Deleting the tree is not a supported operation for StorePostgreSQL.');
        // Or throw new Error('Deleting the tree is not a supported operation.');
      }
    } catch (error) {
      console.error(`deleteObject: Error processing path ${path}`, error);
    }
  }

  async copyObject(fromPath: string, toPath: string, options?: ObjectOptions): Promise<void> {
    const parsedFromPath = this.parsePath(fromPath);
    const parsedToPath = this.parsePath(toPath);

    if (!parsedFromPath || parsedFromPath.type !== 'note' || !parsedToPath || parsedToPath.type !== 'note') {
      console.error(`copyObject: Invalid path formats. Both must be note paths. From: ${fromPath}, To: ${toPath}`);
      // Consider throwing an error for critical failures
      return;
    }

    const sourceNoteId = parsedFromPath.id;
    const targetNoteId = parsedToPath.id;

    try {
      const selectQuery = 'SELECT title, content, meta FROM notes WHERE id = $1 AND deleted_at IS NULL';
      const selectResult = await this.pool.query(selectQuery, [sourceNoteId]);

      if (!selectResult.rows[0]) {
        console.error(`copyObject: Source note not found or deleted: ${sourceNoteId}`);
        throw new Error(`Source note not found: ${sourceNoteId}`);
      }

      const { title: sourceTitle, content: sourceContent, meta: sourceMetaDb } = selectResult.rows[0];
      const sourceMeta = sourceMetaDb || {}; // Ensure sourceMeta is an object

      const optionsMeta = options?.meta || {};
      const newTitle = optionsMeta.title || sourceTitle;
      
      // Merge sourceMeta and optionsMeta, with optionsMeta taking precedence.
      // Exclude 'id' and 'title' from being directly inserted into the newMeta JSONB.
      const { id: optsMetaId, title: optsMetaTitle, ...relevantOptionsMeta } = optionsMeta;
      const newJsonBMeta = { ...sourceMeta, ...relevantOptionsMeta };


      // When copying, the new note should be active (not deleted)
      const insertQuery = `
        INSERT INTO notes (id, title, content, meta, created_at, updated_at, deleted_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NULL)
        ON CONFLICT (id) DO UPDATE SET 
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            meta = EXCLUDED.meta,
            updated_at = NOW(),
            deleted_at = NULL
      `;
      // Using ON CONFLICT in case the targetNoteId somehow already exists (though typically copy implies new)
      await this.pool.query(insertQuery, [targetNoteId, newTitle, sourceContent, newJsonBMeta]);
    } catch (error) {
      console.error(`copyObject: Error copying from ${sourceNoteId} to ${targetNoteId}`, error);
      // Optionally re-throw
    }
  }
}
