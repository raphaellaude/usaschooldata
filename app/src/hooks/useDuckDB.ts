import { useState, useEffect } from 'react';
import { duckDBService } from '../services/duckdb';

export function useDuckDB() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        async function initDB() {
            try {
                setIsLoading(true);
                setError(null);
                await duckDBService.initialize();
                setIsInitialized(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to initialize database');
            } finally {
                setIsLoading(false);
            }
        }

        initDB();

        return () => {
            duckDBService.close();
        };
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
        query
    };
}