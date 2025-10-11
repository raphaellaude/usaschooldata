import { useState, useEffect } from 'react';
import { dataService, type MembershipQueryOptions, YearNotAvailableError } from '../services/dataService';
import { useDuckDB } from './useDuckDB';

export interface ProfileData {
  summary: any;
  membershipData: any[];
  isLoading: boolean;
  error: string | null;
  yearNotAvailable: boolean;
  requestedYear?: string;
  availableYears?: string[];
}

export function useProfileData(
  entityType: 'district' | 'school',
  entityCode: string,
  options: MembershipQueryOptions = {}
): ProfileData {
  const [summary, setSummary] = useState<any>(null);
  const [membershipData, setMembershipData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearNotAvailable, setYearNotAvailable] = useState(false);
  const [requestedYear, setRequestedYear] = useState<string | undefined>();
  const [availableYears, setAvailableYears] = useState<string[] | undefined>();
  const { isInitialized, error: dbError } = useDuckDB();

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
    setError(null);
    setYearNotAvailable(false);
    setRequestedYear(undefined);
    setAvailableYears(undefined);

    try {
      if (entityType === 'school') {
        const [summaryData, membershipResults] = await Promise.all([
          dataService.getSchoolSummary(entityCode, options),
          dataService.querySchoolMembership(entityCode, options)
        ]);

        setSummary(summaryData);
        setMembershipData(membershipResults);
      } else if (entityType === 'district') {
        const [summaryData, membershipResults] = await Promise.all([
          dataService.getDistrictSummary(entityCode, options),
          dataService.queryDistrictMembership(entityCode, options)
        ]);

        setSummary(summaryData);
        setMembershipData(membershipResults);
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
    } finally {
      setIsLoading(false);
    }
  };

  return {
    summary,
    membershipData,
    isLoading,
    error,
    yearNotAvailable,
    requestedYear,
    availableYears
  };
}