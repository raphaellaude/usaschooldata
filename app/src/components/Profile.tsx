import React from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {useSchoolDirectory} from '../hooks/useSchoolDirectory';
import {useApiProfileData} from '../hooks/useApiProfileData';
import {useApiGradeData} from '../hooks/useApiGradeData';
import {useApiHistoricalEnrollment} from '../hooks/useApiHistoricalEnrollment';
import DoughnutChart from './charts/DoughnutChart';
import BarChart from './charts/BarChart';
import HistoricalEnrollmentChart from './charts/HistoricalEnrollmentChart';
import CopyableWrapper from './CopyableWrapper';
import GradeBand from './GradeBand';
import {DEFAULT_SCHOOL_YEAR} from '../constants';
import {Link1Icon} from '@radix-ui/react-icons';

export default function Profile() {
  const {id} = useParams<{
    id: string;
  }>();
  const [searchParams] = useSearchParams();
  const urlRequestedYear = searchParams.get('year') || DEFAULT_SCHOOL_YEAR;
  // TODO: Re-implement year fallback once API supports returning available years
  // const [fallbackToDefault, setFallbackToDefault] = React.useState(false);
  // const year = fallbackToDefault ? DEFAULT_SCHOOL_YEAR : urlRequestedYear;
  const year = urlRequestedYear;
  const ncesCode = id || '';
  const entityType: 'district' | 'school' = ncesCode.length === 12 ? 'school' : 'district';
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);

  // Use API hooks instead of DuckDB hooks
  const {
    summary,
    isLoading: dataLoading,
    error: dataError,
  } = useApiProfileData(entityType, ncesCode, year);

  const {
    directoryInfo,
    isLoading: directoryLoading,
    error: directoryError,
  } = useSchoolDirectory(ncesCode, year);

  // Load grade data via API
  const {gradeData} = useApiGradeData(ncesCode, year, entityType === 'school' && !dataLoading);

  // Load historical enrollment data for schools only AFTER summary data loads
  // API fetches all years in a single request, much faster than DuckDB queries
  const historicalEnrollmentData = useApiHistoricalEnrollment(
    entityType === 'school' ? ncesCode : '',
    !dataLoading && !directoryLoading // Only start loading after summary and directory complete
  );

  // TODO: Re-implement year fallback logic once API supports it
  // React.useEffect(() => {
  //   if (yearNotAvailable && requestedYear !== DEFAULT_SCHOOL_YEAR && !fallbackToDefault) {
  //     setFallbackToDefault(true);
  //   }
  // }, [yearNotAvailable, requestedYear, fallbackToDefault]);

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

  // Handle scrolling to hash anchor on initial load and when data finishes loading
  React.useEffect(() => {
    // Wait for data to finish loading before attempting to scroll
    if (!dataLoading && !directoryLoading) {
      const hash = window.location.hash;
      if (hash) {
        // Use setTimeout to ensure the DOM has been updated with the content
        setTimeout(() => {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
        }, 100);
      }
    }
  }, [dataLoading, directoryLoading]);

  if (!id) {
    return <div>Invalid profile URL</div>;
  }

  const renderOverview = () => {
    // Prepare grade data for the bar chart
    const gradeChartData = gradeData.map(item => ({
      label: item.grade,
      value: item.student_count,
    }));

    return (
      <div>
        {summary ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="rounded-lg">
              <div className="text-lg font-medium text-gray-900 mb-4">Total enrollment</div>
              <div className="text-6xl font-bold text-gray-900">
                {summary.totalEnrollment?.toLocaleString() || 'N/A'}
              </div>
            </div>

            {entityType === 'district' && (
              <div className="text-center py-4 bg-white border border-gray-200 rounded-lg">
                <div className="font-medium text-gray-700">Number of Schools</div>
                <div className="text-gray-900">{(summary as any)?.schoolCount || 'N/A'}</div>
              </div>
            )}

            {entityType === 'school' && gradeChartData.length > 0 && (
              <CopyableWrapper
                data={gradeChartData}
                filename="students-by-grade"
                className="lg:col-span-2"
              >
                <div className="rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Students by grade</h4>
                  <div className="h-[400px]">
                    <BarChart data={gradeChartData} />
                  </div>
                </div>
              </CopyableWrapper>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No overview data available</p>
        )}
      </div>
    );
  };

  const renderDemographics = () => {
    if (!summary?.demographics) {
      return (
        <div>
          <h3>Demographics</h3>
          <p>No demographic data available</p>
        </div>
      );
    }

    const allRaces = [
      'American Indian or Alaska Native',
      'Asian',
      'Black or African American',
      'Hispanic/Latino',
      'Native Hawaiian or Other Pacific Islander',
      'Two or more races',
      'White',
    ];

    const raceData = allRaces.map(race => ({
      label: race,
      value: (summary.demographics.byRaceEthnicity[race] as number) || 0,
    }));

    const sexData = Object.entries(summary.demographics.bySex).map(([label, value]) => ({
      label,
      value: value as number,
    }));

    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
          <a
            href="#demographics"
            className="hover:text-gray-900 inline-flex items-center gap-2"
            onClick={e => {
              e.preventDefault();
              copyLinkToClipboard('#demographics');
              window.location.hash = 'demographics';
            }}
          >
            Demographics
            <Link1Icon
              className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '#demographics' ? 'text-green-600' : ''}`}
            />
          </a>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sex Demographics - Doughnut Chart */}
          <CopyableWrapper data={sexData} filename="gender-demographics">
            <div className="rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Sex</h4>
              <div className="flex flex-col">
                <DoughnutChart data={sexData} width={280} height={240} />
              </div>
            </div>
          </CopyableWrapper>

          {/* Race/Ethnicity Demographics - Bar Chart */}
          <CopyableWrapper
            data={raceData}
            filename="race-ethnicity-demographics"
            className="lg:col-span-2"
          >
            <div className="rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Race & ethnicity</h4>
              <div className="h-[300px]">
                <BarChart data={raceData} />
              </div>
            </div>
          </CopyableWrapper>
        </div>
      </div>
    );
  };

  const renderHistoricalEnrollment = () => {
    // Only show for schools, not districts
    if (entityType !== 'school') {
      return null;
    }

    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
          <a
            href="#historical-enrollment"
            className="hover:text-gray-900 inline-flex items-center gap-2"
            onClick={e => {
              e.preventDefault();
              copyLinkToClipboard('#historical-enrollment');
              window.location.hash = 'historical-enrollment';
            }}
          >
            Historical Enrollment
            <Link1Icon
              className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '#historical-enrollment' ? 'text-green-600' : ''}`}
            />
          </a>
        </h3>
        {historicalEnrollmentData.isLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="animate-pulse">Loading historical enrollment data...</div>
            </div>
          </div>
        ) : historicalEnrollmentData.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">
              Failed to load historical enrollment data: {historicalEnrollmentData.error}
            </p>
          </div>
        ) : historicalEnrollmentData.byYear.length > 0 ? (
          <div className="rounded-lg">
            <HistoricalEnrollmentChart
              historicalData={historicalEnrollmentData}
              currentYear={year}
            />
          </div>
        ) : (
          <p className="text-gray-600">No historical enrollment data available</p>
        )}
      </div>
    );
  };

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
                  className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '' ? 'text-green-600' : ''}`}
                />
              </a>
            ) : (
              `${entityType === 'district' ? 'District' : 'School'} Profile`
            )}
          </h1>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 text-sm text-gray-500">
            <span>NCES ID: {ncesCode}</span>
            <span>School Year: {year}</span>
            {/* Directory Stats Grid */}
            {directoryInfo?.sch_type && <span>School Type: {directoryInfo.sch_type || 'N/A'}</span>}
            {directoryInfo?.sch_level && (
              <span>School Level: {directoryInfo.sch_level || 'N/A'}</span>
            )}
            {directoryInfo?.charter && (
              <span>Charter School: {directoryInfo.charter || 'N/A'}</span>
            )}
            {directoryInfo?.sy_status && <span>Status: {directoryInfo.sy_status || 'N/A'}</span>}
            {directoryInfo && directoryInfo.city && directoryInfo.state_name && (
              <span>
                Location: {directoryInfo.city}, {directoryInfo.state_name}
              </span>
            )}
          </div>

          {/* Grade Band Visualization */}
          {entityType === 'school' && directoryInfo && (
            <div className="mt-4">
              <GradeBand directoryInfo={directoryInfo} />
            </div>
          )}

          {/* Navigation */}
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

      {/* TODO: Year Fallback Notification - re-implement when API supports available years */}

      {/* Placeholder content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {dataLoading || directoryLoading ? (
          <div className="space-y-12">
            <section id="overview">
              <div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-lg font-medium text-gray-900 mb-4">
                        Total enrollment
                      </span>
                      <span className="text-gray-400">Loading...</span>
                    </div>
                    {entityType === 'district' && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-700">Number of Schools:</span>
                        <span className="text-gray-400">Loading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <section id="demographics">
              <div>
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
              </div>
            </section>
          </div>
        ) : dataError || directoryError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            {dataError && <p className="text-red-700 mb-2">{dataError}</p>}
            {directoryError && (
              <p className="text-red-700 mb-2">Directory error: {directoryError}</p>
            )}
            <p className="text-red-600 text-sm mt-2">
              The API is experiencing issues. Please try again later.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <section id="overview">{renderOverview()}</section>
            <section id="demographics">{renderDemographics()}</section>
            {entityType === 'school' && (
              <section id="historical-enrollment">{renderHistoricalEnrollment()}</section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
