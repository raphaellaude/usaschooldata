import { useState, useEffect } from 'react';
import { dataService, MembershipQueryOptions } from '../services/dataService';
import { useDuckDB } from './useDuckDB';

export interface ProfileData {
  summary: any;
  membershipData: any[];
  isLoading: boolean;
  error: string | null;
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

    try {
      if (entityType === 'school') {
        const [summaryData, membershipResults] = await Promise.all([
          dataService.getSchoolSummary(entityCode),
          dataService.querySchoolMembership(entityCode, options)
        ]);

        setSummary(summaryData);
        setMembershipData(membershipResults);
      } else if (entityType === 'district') {
        const [summaryData, membershipResults] = await Promise.all([
          dataService.getDistrictSummary(entityCode),
          dataService.queryDistrictMembership(entityCode, options)
        ]);

        setSummary(summaryData);
        setMembershipData(membershipResults);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
      setError(errorMessage);
      console.error('Profile data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    summary,
    membershipData,
    isLoading,
    error
  };
}