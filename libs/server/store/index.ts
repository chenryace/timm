// Removed StoreS3 import
import { StorePostgreSQL } from './providers/postgresql';
import { StoreProvider } from './providers/base'; // StoreProviderConfig might not be needed if not used by StorePostgreSQL directly
import { config } from 'libs/server/config';

// Updated AppStoreConfig to only include PostgreSQL-related fields
interface AppStoreConfig {
    pgConnectionString?: string;
    prefix?: string;
}

export function createStore(): StoreProvider {
    const cfg = config().store as AppStoreConfig;

    if (!cfg.pgConnectionString) {
        throw new Error('PostgreSQL connection string (pgConnectionString) is missing in config.');
    }
    return new StorePostgreSQL({
        connectionString: cfg.pgConnectionString,
        prefix: cfg.prefix || '', // Prefix can still be used if relevant for PostgreSQL
    });
}

export { StoreProvider } from './providers/base';
