import React from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {useSchoolDirectory} from '../hooks/useSchoolDirectory';
import {useMembershipTable} from '../hooks/useMembershipTable';
import {useSummary} from './profile/OverviewSection';
import OverviewSection from './profile/OverviewSection';
import DemographicsSection from './profile/DemographicsSection';
import RawDataSection from './profile/RawDataSection';
import HistoricalSection from './profile/HistoricalSection';
import GradeBand from './GradeBand';
import {DEFAULT_SCHOOL_YEAR} from '../constants';
import {Link1Icon, ExternalLinkIcon} from '@radix-ui/react-icons';

export default function Profile() {
  const {id} = useParams<{id: string}>();
  const [searchParams] = useSearchParams();
  const urlRequestedYear = searchParams.get('year') || DEFAULT_SCHOOL_YEAR;
  const [fallbackToDefault, setFallbackToDefault] = React.useState(false);
  const year = fallbackToDefault ? DEFAULT_SCHOOL_YEAR : urlRequestedYear;
  const ncesCode = id || '';
  const entityType: 'district' | 'school' = ncesCode.length === 12 ? 'school' : 'district';
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);

  // Table creation (DDL)
  const {
    tableName,
    isReady: tableReady,
    error: tableError,
    yearNotAvailable,
    requestedYear,
    availableYears,
  } = useMembershipTable(entityType, ncesCode, {schoolYear: year});

  // Directory info (school header)
  const {
    directoryInfo,
    isLoading: directoryLoading,
    error: directoryError,
  } = useSchoolDirectory(ncesCode, year);

  // Summary data (shared between Overview + Demographics)
  const {summary, isLoading: summaryLoading} = useSummary(tableName, tableReady, entityType);

  // Handle year fallback
  React.useEffect(() => {
    if (yearNotAvailable && requestedYear !== DEFAULT_SCHOOL_YEAR && !fallbackToDefault) {
      setFallbackToDefault(true);
    }
  }, [yearNotAvailable, requestedYear, fallbackToDefault]);

  const copyLinkToClipboard = async (hash: string) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Handle scrolling to hash anchor
  React.useEffect(() => {
    if (!summaryLoading && !directoryLoading && tableReady) {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash.replace('#', ''));
          if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
        }, 100);
      }
    }
  }, [summaryLoading, directoryLoading, tableReady]);

  if (!id) {
    return <div>Invalid profile URL</div>;
  }

  const isLoading = directoryLoading || !tableReady || summaryLoading;

  const SectionHeader = ({id: sectionId, label}: {id: string; label: string}) => (
    <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
      <a
        href={`#${sectionId}`}
        className="hover:text-gray-900 inline-flex items-center gap-2"
        onClick={e => {
          e.preventDefault();
          copyLinkToClipboard(`#${sectionId}`);
          window.location.hash = sectionId;
        }}
      >
        {label}
        <Link1Icon
          className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
            copiedLink === `#${sectionId}` ? 'text-green-600' : ''
          }`}
        />
      </a>
    </h3>
  );

  return (
    <div className="min-h-screen bg-white w-full">
      <header className="border-b border-gray-200 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-4xl font-display font-semibold text-gray-900 flex items-center gap-3 mb-2 group">
            {directoryLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : directoryInfo ? (
              <a
                href="#"
                className="hover:text-gray-600 inline-flex items-center gap-2"
                onClick={e => {
                  e.preventDefault();
                  copyLinkToClipboard('');
                }}
              >
                {directoryInfo.sch_name}
                <Link1Icon
                  className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    copiedLink === '' ? 'text-green-600' : ''
                  }`}
                />
              </a>
            ) : (
              `${entityType === 'district' ? 'District' : 'School'} Profile`
            )}
          </h1>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              NCES ID: {ncesCode}
              <a
                href={`https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?Search=1&ID=${ncesCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                title="View on NCES School Search"
              >
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </span>
            <span>School Year: {year}</span>
            {directoryInfo?.sch_type && <span>School Type: {directoryInfo.sch_type}</span>}
            {directoryInfo?.sch_level && <span>School Level: {directoryInfo.sch_level}</span>}
            {directoryInfo?.charter && <span>Charter School: {directoryInfo.charter}</span>}
            {directoryInfo?.sy_status && <span>Status: {directoryInfo.sy_status}</span>}
            {directoryInfo?.city && directoryInfo?.state_name && (
              <span>
                Location: {directoryInfo.city}, {directoryInfo.state_name}
              </span>
            )}
          </div>

          {entityType === 'school' && directoryInfo && (
            <div className="mt-4">
              <GradeBand directoryInfo={directoryInfo} />
            </div>
          )}

          <nav className="mt-4 flex space-x-6">
            <a href="#demographics" className="text-blue-600 hover:text-blue-800 text-sm">
              &rarr; Demographics
            </a>
            <a href="#data" className="text-blue-600 hover:text-blue-800 text-sm">
              &rarr; Raw Data
            </a>
            {entityType === 'school' && (
              <a
                href="#historical-enrollment"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                &rarr; Historical Enrollment
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Year Fallback Notification */}
      {fallbackToDefault && urlRequestedYear !== DEFAULT_SCHOOL_YEAR && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Note:</span> Data for school year {urlRequestedYear}{' '}
                  is not available. Showing data for {DEFAULT_SCHOOL_YEAR} instead.
                  {availableYears && availableYears.length > 0 && (
                    <span> Available years: {availableYears.join(', ')}.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-12">
            <section id="overview">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-lg font-medium text-gray-900 mb-4">Total enrollment</span>
                    <span className="text-gray-400">Loading...</span>
                  </div>
                </div>
              </div>
            </section>
            <section id="demographics">
              <h3 className="text-sm font-semibold text-gray-600 mb-6">Demographics</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">By Gender</h4>
                  <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                    <div className="animate-pulse">Loading chart...</div>
                  </div>
                </div>
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">By Race/Ethnicity</h4>
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <div className="animate-pulse">Loading chart...</div>
                  </div>
                </div>
              </div>
            </section>
            <section id="data">
              <h3 className="text-sm font-semibold text-gray-600 mb-6">Raw Membership Data</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <div className="animate-pulse">Loading data...</div>
                </div>
              </div>
            </section>
          </div>
        ) : (tableError && !yearNotAvailable) || directoryError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            {tableError && <p className="text-red-700 mb-2">{tableError}</p>}
            {directoryError && (
              <p className="text-red-700 mb-2">Directory error: {directoryError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            <section id="overview">
              <OverviewSection
                summary={summary}
                tableName={tableName}
                isReady={tableReady}
                entityType={entityType}
              />
            </section>
            <section id="demographics">
              <SectionHeader id="demographics" label="Demographics" />
              <DemographicsSection summary={summary} />
            </section>
            <section id="data">
              <SectionHeader id="data" label="Raw Membership Data" />
              <RawDataSection tableName={tableName} isReady={tableReady} entityType={entityType} />
            </section>
            {entityType === 'school' && (
              <section id="historical-enrollment">
                <SectionHeader id="historical-enrollment" label="Historical Enrollment" />
                <HistoricalSection
                  schoolCode={ncesCode}
                  enabled={!summaryLoading && !directoryLoading}
                  currentYear={year}
                />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
