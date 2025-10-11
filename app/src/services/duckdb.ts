import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: eh_worker,
    },
};

class DuckDBService {
    private db: duckdb.AsyncDuckDB | null = null;
    private connection: duckdb.AsyncDuckDBConnection | null = null;
    private initialized = false;

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Select a bundle based on browser checks
            const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

            // Instantiate the asynchronous version of DuckDB-wasm
            const worker = new Worker(bundle.mainWorker!);
            const logger = new duckdb.ConsoleLogger();
            this.db = new duckdb.AsyncDuckDB(logger, worker);
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

            // Create a connection
            this.connection = await this.db.connect();
            await this.connection.query(`INSTALL httpfs; LOAD httpfs;`);
            console.log(await this.connection.query(`SELECT 1`))
            this.initialized = true;
            console.log('DuckDB initialized successfully');
        } catch (error) {
            console.error('Failed to initialize DuckDB:', error);
            throw error;
        }
    }

    async query(sql: string): Promise<any[]> {
        if (!this.connection) {
            throw new Error('DuckDB not initialized. Call initialize() first.');
        }

        try {
            const result = await this.connection.query(sql);
            return result.toArray().map(row => row.toJSON());
        } catch (error) {
            console.error('Query failed:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
        if (this.db) {
            await this.db.terminate();
            this.db = null;
        }
        this.initialized = false;
    }
}

export const duckDBService = new DuckDBService();
