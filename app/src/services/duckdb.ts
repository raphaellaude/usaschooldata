import * as duckdb from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';
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
      await this.connection.query(`SET max_expression_depth TO 20;`);
      this.initialized = true;
      console.log('DuckDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
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

  isInitialized(): boolean {
    return this.initialized;
  }

  async query(sql: string): Promise<arrow.Table> {
    if (!this.connection) {
      console.log('DuckDB not initialized, attempting to reinitialize...');
      try {
        await this.initialize();
      } catch (initError) {
        console.error('Failed to reinitialize DuckDB:', initError);
        throw new Error('Database connection lost and could not be reestablished');
      }
    }

    try {
      return await this.connection!.query(sql);
    } catch (error) {
      console.error('Query failed:', error);

      // Check if this is a connection-related error that might be fixed by reinitializing
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('closed') ||
        errorMessage.includes('terminated')
      ) {
        console.log('Connection error detected, attempting to reinitialize...');
        try {
          // Reset the connection state
          this.connection = null;
          this.initialized = false;

          // Reinitialize
          await this.initialize();

          // Retry the query after reinitialization
          return await this.query(sql);
        } catch (retryError) {
          console.error('Failed to reinitialize and retry query:', retryError);
          throw new Error('Database connection lost and could not be reestablished');
        }
      }

      throw error;
    }
  }

  /**
   * Cancel any pending query on the current connection
   * Returns true if a query was cancelled, false otherwise
   */
  async cancelPendingQuery(): Promise<boolean> {
    if (!this.connection) {
      return false;
    }
    return await this.connection.cancelSent();
  }

  /**
   * Helper method to convert an Apache Arrow Table to an array of plain JavaScript objects
   * This is useful when you need the old behavior of returning JSON objects
   */
  tableToArray(table: arrow.Table): any[] {
    return table.toArray().map((row: any) => row.toJSON());
  }

  /**
   * Helper method to extract a scalar value from an Apache Arrow Table column
   * Handles the case where aggregation functions return typed arrays (Uint32Array, etc.)
   * This replaces the old extractValue hack
   */
  getScalarValue(table: arrow.Table, rowIndex: number, columnName: string): any {
    if (table.numRows === 0) return null;

    const row = table.get(rowIndex);
    if (!row) return null;

    const value = row[columnName];

    // Handle typed arrays (common with aggregation functions)
    if (
      value instanceof Uint32Array ||
      value instanceof Int32Array ||
      value instanceof Float32Array ||
      value instanceof Float64Array
    ) {
      return value.length > 0 ? value[0] : 0;
    }

    if (typeof value === 'bigint') {
      // sometimes good old numbers are returned as bigint so try to cast to number
      try {
        return Number(value);
      } catch {
        return value;
      }
    }

    // Handle regular arrays
    if (Array.isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }

    return value;
  }
}

export const duckDBService = new DuckDBService();
