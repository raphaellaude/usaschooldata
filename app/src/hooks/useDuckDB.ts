import {useState, useEffect} from 'react';
import {duckDBService} from '../services/duckdb';

export function useDuckDB() {
  // Check if DB is already initialized to avoid unnecessary loading state
  const initiallyInitialized = duckDBService.isInitialized();
  const [isLoading, setIsLoading] = useState(!initiallyInitialized);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(initiallyInitialized);

  useEffect(() => {
    // If already initialized, no need to do anything
    if (duckDBService.isInitialized()) {
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    async function initDB() {
      try {
        setIsLoading(true);
        setError(null);
        await duckDBService.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize application');
      } finally {
        setIsLoading(false);
      }
    }

    initDB();

    // Don't close the database on unmount - it should persist across navigation
    // The database will be closed when the browser tab/window closes
  }, []);

  const query = async (sql: string) => {
    try {
      return await duckDBService.query(sql);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Query failed');
    }
  };

  return {
    isLoading,
    error,
    isInitialized,
    query,
  };
}
