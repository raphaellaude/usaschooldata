import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {useSchoolSearch} from '../hooks/useSchoolSearch';
import {useDuckDB} from '../hooks/useDuckDB';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const {isInitialized, isLoading: dbLoading, error: dbError} = useDuckDB();
  const {results, isSearching, error: searchError} = useSchoolSearch(searchQuery);

  // Update searchQuery when URL param changes
  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
        {query && (
          <p className="text-gray-600 mt-2">
            Showing results for: <span className="font-semibold">"{query}"</span>
          </p>
        )}
      </div>

      {dbLoading && (
        <div className="text-gray-600 mb-4">Initializing database...</div>
      )}

      {dbError && (
        <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
          Error: {dbError}
        </div>
      )}

      {!isInitialized && !dbLoading && !dbError && (
        <div className="text-gray-600 mb-4">Waiting for database to initialize...</div>
      )}

      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Searching...</span>
        </div>
      )}

      {searchError && (
        <div className="text-red-600 p-4 bg-red-50 rounded-lg">
          Error: {searchError}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 3 && (
        <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">
          Please enter at least 3 characters to search
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {results.map(school => (
              <Link
                key={school.ncessch}
                to={`/profiles/${school.ncessch}?year=${school.school_year}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {school.sch_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{school.lea_name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {school.city}, {school.state_name}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">{school.school_year}</div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  NCES ID: {school.ncessch}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {searchQuery.length >= 3 && results.length === 0 && !isSearching && isInitialized && (
        <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">
          No schools found matching "{searchQuery}"
        </div>
      )}

      {!query && (
        <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">
          Enter a search query in the header to find schools
        </div>
      )}
    </div>
  );
}
