import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useSchoolSearch} from '../hooks/useSchoolSearch';
import {useDuckDB} from '../hooks/useDuckDB';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const {isInitialized, isLoading: dbLoading, error: dbError} = useDuckDB();
  const {results, isSearching, error: searchError} = useSchoolSearch(searchQuery);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">School Data Explorer</h1>
        <p className="text-lg text-gray-600 mb-6">
          Search for schools and districts by name or location
        </p>

        {dbLoading && <div className="text-gray-600 mb-4">Initializing database...</div>}

        {dbError && (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">Error: {dbError}</div>
        )}

        {isInitialized && (
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search schools or districts (min 3 characters)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {searchError && (
              <div className="mt-4 text-red-600 p-4 bg-red-50 rounded-lg">Error: {searchError}</div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="mt-4 text-gray-500 text-sm">Type at least 3 characters to search</div>
            )}

            {results.length > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {results.map(school => (
                    <Link
                      key={school.ncessch}
                      to={`/profiles/${school.ncessch}?year=${school.school_year}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{school.sch_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{school.lea_name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {school.city}, {school.state_name}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">{school.school_year}</div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">NCES ID: {school.ncessch}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 3 && results.length === 0 && !isSearching && (
              <div className="mt-4 text-gray-500 p-4 bg-gray-50 rounded-lg">
                No schools found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
