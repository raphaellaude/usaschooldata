import {useState, useEffect, useMemo} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {useSchoolSearch} from '../hooks/useSchoolSearch';
import type {SearchFilters, SchoolSearchResult} from '../hooks/useSchoolSearch';
import {useDuckDB} from '../hooks/useDuckDB';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

const SCHOOL_TYPES = [
  {value: 1, label: 'Regular School'},
  {value: 2, label: 'Special Education School'},
  {value: 3, label: 'Career and Technical School'},
  {value: 4, label: 'Alternative Education School'},
];

// NCES LEVEL field values (normalized in data pipeline)
const SCHOOL_LEVELS = [
  {value: 'Prekindergarten', label: 'Prekindergarten'},
  {value: 'Elementary', label: 'Elementary'},
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

const columnHelper = createColumnHelper<SchoolSearchResult>();

const FilterChip = ({label, onRemove}: {label: string; onRemove: () => void}) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
    {label}
    <button
      onClick={onRemove}
      className="hover:text-blue-600 ml-1"
      aria-label={`Remove ${label} filter`}
    >
      ×
    </button>
  </span>
);

const DATA_DOMAIN = 'https://data.usaschooldata.com';

export default function Home() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [filters, setFilters] = useState<SearchFilters>({});
  const {isInitialized, isLoading: dbLoading, error: dbError} = useDuckDB();
  const {results, isSearching, error: searchError} = useSchoolSearch(searchQuery, filters, 50);

  const hasActiveFilters =
    filters.stateCode || filters.schoolType || filters.schoolLevel || filters.charter;

  // Update searchQuery when URL param changes
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('sch_name', {
        header: 'School Name',
        cell: info => (
          <Link
            to={`/profiles/${info.row.original.ncessch}?year=${info.row.original.school_year}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('state_code', {
        header: 'State',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor('sch_level', {
        header: 'Level',
        cell: info => info.getValue() || '—',
      }),
      columnHelper.accessor('charter', {
        header: 'Charter',
        cell: info => info.getValue() || '—',
      }),
      columnHelper.accessor('ncessch', {
        header: 'NCES ID',
        cell: info => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="text-left mb-8">
        {dbLoading && <div className="text-gray-600 mb-4">Setting things up...</div>}
        {dbError && (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">Error: {dbError}</div>
        )}
        {isInitialized && (
          <div>
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

            {/* Filters - Inline dropdowns */}
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                value={filters.stateCode || ''}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    stateCode: e.target.value || undefined,
                  }))
                }
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">State</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.schoolLevel || ''}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    schoolLevel: e.target.value || undefined,
                  }))
                }
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Level</option>
                {SCHOOL_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.schoolType || ''}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    schoolType: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Type</option>
                {SCHOOL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.charter || ''}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    charter: e.target.value || undefined,
                  }))
                }
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Charter</option>
                <option value="Yes">Charter schools</option>
                <option value="No">Non-charter schools</option>
              </select>
            </div>

            {/* Filter chips row */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {filters.stateCode && (
                  <FilterChip
                    label={
                      US_STATES.find(s => s.code === filters.stateCode)?.name || filters.stateCode
                    }
                    onRemove={() => setFilters(prev => ({...prev, stateCode: undefined}))}
                  />
                )}
                {filters.schoolLevel && (
                  <FilterChip
                    label={filters.schoolLevel}
                    onRemove={() => setFilters(prev => ({...prev, schoolLevel: undefined}))}
                  />
                )}
                {filters.schoolType && (
                  <FilterChip
                    label={
                      SCHOOL_TYPES.find(t => t.value === filters.schoolType)?.label || 'Unknown'
                    }
                    onRemove={() => setFilters(prev => ({...prev, schoolType: undefined}))}
                  />
                )}
                {filters.charter && (
                  <FilterChip
                    label={filters.charter === 'Yes' ? 'Charter' : 'Non-charter'}
                    onRemove={() => setFilters(prev => ({...prev, charter: undefined}))}
                  />
                )}
                <button
                  onClick={() => setFilters({})}
                  className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                >
                  Clear all
                </button>
                <span className="ml-auto text-sm text-gray-500">{results.length} results</span>
              </div>
            )}

            {/* Result count when no active filters */}
            {results.length > 0 && !hasActiveFilters && (
              <div className="text-sm text-gray-500 mt-2">{results.length} results</div>
            )}

            {searchError && (
              <div className="mt-3 text-red-600 p-4 bg-red-50 rounded-lg">Error: {searchError}</div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 3 && !hasActiveFilters && (
              <div className="mt-3 text-gray-500 text-sm">Type at least 3 characters to search</div>
            )}

            {results.length > 0 && (
              <div className="mt-3 bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(searchQuery.length >= 3 || hasActiveFilters) &&
              results.length === 0 &&
              !isSearching && (
                <div className="mt-3 text-gray-500 p-4 bg-gray-50 rounded-lg">
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
