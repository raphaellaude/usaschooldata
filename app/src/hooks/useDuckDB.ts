import {useRoomStore} from '../store';

/**
 * Hook that provides DuckDB initialization state from the SQLRooms store.
 * Components use this to gate data fetching until DuckDB is ready.
 */
export function useDuckDB() {
  const initialized = useRoomStore(state => state.room.initialized);

  return {
    isLoading: !initialized,
    error: null,
    isInitialized: initialized,
  };
}
