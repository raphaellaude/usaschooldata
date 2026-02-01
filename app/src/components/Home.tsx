import {useState, useEffect} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {useSchoolSearch, SearchFilters} from '../hooks/useSchoolSearch';
import {useDuckDB} from '../hooks/useDuckDB';

const SCHOOL_TYPES = [
  {value: 1, label: 'Regular School'},
  {value: 2, label: 'Special Education School'},
  {value: 3, label: 'Career and Technical School'},
  {value: 4, label: 'Alternative Education School'},
];

const SCHOOL_LEVELS = [
  {value: 'Primary', label: 'Primary/Elementary'},
  {value: 'Middle', label: 'Middle'},
  {value: 'High', label: 'High'},
  {value: 'Other', label: 'Other'},
];

const US_STATES = [
  {code: 'AL', name: 'Alabama'},
  {code: 'AK', name: 'Alaska'},
  {code: 'AZ', name: 'Arizona'},
  {code: 'AR', name: 'Arkansas'},
  {code: 'CA', name: 'California'},
  {code: 'CO', name: 'Colorado'},
  {code: 'CT', name: 'Connecticut'},
  {code: 'DE', name: 'Delaware'},
  {code: 'DC', name: 'District of Columbia'},
  {code: 'FL', name: 'Florida'},
  {code: 'GA', name: 'Georgia'},
  {code: 'HI', name: 'Hawaii'},
  {code: 'ID', name: 'Idaho'},
  {code: 'IL', name: 'Illinois'},
  {code: 'IN', name: 'Indiana'},
  {code: 'IA', name: 'Iowa'},
  {code: 'KS', name: 'Kansas'},
  {code: 'KY', name: 'Kentucky'},
  {code: 'LA', name: 'Louisiana'},
  {code: 'ME', name: 'Maine'},
  {code: 'MD', name: 'Maryland'},
  {code: 'MA', name: 'Massachusetts'},
  {code: 'MI', name: 'Michigan'},
  {code: 'MN', name: 'Minnesota'},
  {code: 'MS', name: 'Mississippi'},
  {code: 'MO', name: 'Missouri'},
  {code: 'MT', name: 'Montana'},
  {code: 'NE', name: 'Nebraska'},
  {code: 'NV', name: 'Nevada'},
  {code: 'NH', name: 'New Hampshire'},
  {code: 'NJ', name: 'New Jersey'},
  {code: 'NM', name: 'New Mexico'},
  {code: 'NY', name: 'New York'},
  {code: 'NC', name: 'North Carolina'},
  {code: 'ND', name: 'North Dakota'},
  {code: 'OH', name: 'Ohio'},
  {code: 'OK', name: 'Oklahoma'},
  {code: 'OR', name: 'Oregon'},
  {code: 'PA', name: 'Pennsylvania'},
  {code: 'RI', name: 'Rhode Island'},
  {code: 'SC', name: 'South Carolina'},
  {code: 'SD', name: 'South Dakota'},
  {code: 'TN', name: 'Tennessee'},
  {code: 'TX', name: 'Texas'},
  {code: 'UT', name: 'Utah'},
  {code: 'VT', name: 'Vermont'},
  {code: 'VA', name: 'Virginia'},
  {code: 'WA', name: 'Washington'},
  {code: 'WV', name: 'West Virginia'},
  {code: 'WI', name: 'Wisconsin'},
  {code: 'WY', name: 'Wyoming'},
];

export default function Home() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const {isInitialized, isLoading: dbLoading, error: dbError} = useDuckDB();
  const {results, isSearching, error: searchError} = useSchoolSearch(searchQuery, filters, 50);

  const hasActiveFilters =
    filters.stateCode || filters.schoolType || filters.schoolLevel || filters.charter;

  // Update searchQuery when URL param changes
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-left mb-8">
        {dbLoading && <div className="text-gray-600 mb-4">Settings things up...</div>}
        {dbError && (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">Error: {dbError}</div>
        )}
        {isInitialized && (
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for schools by name..."
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

            {/* Filter Toggle */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showFilters ? 'Hide filters' : 'Show filters'}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters({})}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={filters.stateCode || ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          stateCode: e.target.value || undefined,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All states</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Type
                    </label>
                    <select
                      value={filters.schoolType || ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          schoolType: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All types</option>
                      {SCHOOL_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Level
                    </label>
                    <select
                      value={filters.schoolLevel || ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          schoolLevel: e.target.value || undefined,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All levels</option>
                      {SCHOOL_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Charter</label>
                    <select
                      value={filters.charter || ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          charter: e.target.value || undefined,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All schools</option>
                      <option value="Yes">Charter schools</option>
                      <option value="No">Non-charter schools</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {searchError && (
              <div className="mt-4 text-red-600 p-4 bg-red-50 rounded-lg">Error: {searchError}</div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 3 && !hasActiveFilters && (
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
                          <h3 className="text-md font-semibold text-gray-900">{school.sch_name}</h3>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between gap-4">
                          <span>Scbool year: {school.school_year}</span>
                          <span>NCES ID: {school.ncessch}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(searchQuery.length >= 3 || hasActiveFilters) &&
              results.length === 0 &&
              !isSearching && (
                <div className="mt-4 text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No schools found
                  {searchQuery.length >= 3 && ` matching "${searchQuery}"`}
                  {hasActiveFilters && ' with the selected filters'}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
