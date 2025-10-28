import {useState, useEffect} from 'react';
import {
  dataService,
  type MembershipQueryOptions,
  type SchoolSummary,
  type DistrictSummary,
  YearNotAvailableError,
} from '../services/dataService';
import {useDuckDB} from './useDuckDB';

export interface ProfileData {
  summary: SchoolSummary | DistrictSummary | null;
  membershipData: any[];
  isLoading: boolean;
  isMembershipLoading: boolean;
  error: string | null;
  membershipError: string | null;
  yearNotAvailable: boolean;
  requestedYear?: string;
  availableYears?: string[];
}

export function useProfileData(
  entityType: 'district' | 'school',
  entityCode: string,
  options: MembershipQueryOptions = {}
): ProfileData {
  const [summary, setSummary] = useState<SchoolSummary | DistrictSummary | null>(null);
  const [membershipData, setMembershipData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMembershipLoading, setIsMembershipLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [yearNotAvailable, setYearNotAvailable] = useState(false);
  const [requestedYear, setRequestedYear] = useState<string | undefined>();
  const [availableYears, setAvailableYears] = useState<string[] | undefined>();
  const {isInitialized, error: dbError} = useDuckDB();

  useEffect(() => {
    if (!entityCode) {
      setIsLoading(false);
      return;
    }

    if (!isInitialized) {
      return; // Wait for DuckDB to be initialized
    }

    if (dbError) {
      setError(`Database error: ${dbError}`);
      setIsLoading(false);
      return;
    }

    loadProfileData();
  }, [entityType, entityCode, isInitialized, dbError, JSON.stringify(options)]);

  const loadProfileData = async () => {
    setIsLoading(true);
    setIsMembershipLoading(true);
    setError(null);
    setMembershipError(null);
    setYearNotAvailable(false);
    setRequestedYear(undefined);
    setAvailableYears(undefined);

    try {
      // Load summary data first (needed for initial page render)
      if (entityType === 'school') {
        const summaryData = await dataService.getSchoolSummary(entityCode, options);
        setSummary(summaryData);
      } else if (entityType === 'district') {
        const summaryData = await dataService.getDistrictSummary(entityCode, options);
        setSummary(summaryData);
      }

      // Summary is loaded, allow page to render
      setIsLoading(false);

      // Load membership data separately (can be expensive)
      try {
        if (entityType === 'school') {
          const membershipResults = await dataService.querySchoolMembership(entityCode, options);
          setMembershipData(membershipResults);
        } else if (entityType === 'district') {
          const membershipResults = await dataService.queryDistrictMembership(entityCode, options);
          setMembershipData(membershipResults);
        }
      } catch (membershipErr) {
        const errorMessage = membershipErr instanceof Error ? membershipErr.message : 'Failed to load membership data';
        setMembershipError(errorMessage);
        console.error('Membership data loading error:', membershipErr);
      } finally {
        setIsMembershipLoading(false);
      }
    } catch (err) {
      if (err instanceof YearNotAvailableError) {
        setYearNotAvailable(true);
        setRequestedYear(err.requestedYear);
        setAvailableYears(err.availableYears);
        setError(`Year ${err.requestedYear} not available`);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
        setError(errorMessage);
      }
      console.error('Profile data loading error:', err);
      setIsLoading(false);
      setIsMembershipLoading(false);
    }
  };

  return {
    summary,
    membershipData,
    isLoading,
    isMembershipLoading,
    error,
    membershipError,
    yearNotAvailable,
    requestedYear,
    availableYears,
  };
}
