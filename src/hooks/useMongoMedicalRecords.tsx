import { useState, useEffect, useCallback } from 'react';
import { mongodbClient } from '../services/mongodbApi';
import { MedicalRecordDocument, MedicalRecordFilter, QueryOptions, PaginatedResponse } from '../types/mongodb';
import { RecordStatus, RecordType } from '../config/mongodb';
import { useAuth } from './useMongoAuth';

// Medical Records State Interface
interface MedicalRecordsState {
  records: MedicalRecordDocument[];
  loading: boolean;
  error: string | null;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  currentPage: number;
}

// Hook for MongoDB Medical Records Management
export const useMongoMedicalRecords = (initialFilter?: MedicalRecordFilter) => {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<MedicalRecordsState>({
    records: [],
    loading: false,
    error: null,
    total: 0,
    hasNext: false,
    hasPrev: false,
    currentPage: 1,
  });

  const [filter, setFilter] = useState<MedicalRecordFilter>(initialFilter || {});
  const [options, setOptions] = useState<QueryOptions>({
    limit: 20,
    skip: 0,
    sort: { createdAt: -1 },
  });

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  // Fetch medical records
  const fetchRecords = useCallback(async (
    customFilter?: MedicalRecordFilter,
    customOptions?: QueryOptions
  ) => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      clearError();

      // Apply user-specific filters based on role
      const finalFilter: MedicalRecordFilter = {
        ...filter,
        ...customFilter,
      };

      // Patients can only see their own records
      if (user.profile.role === 'patient') {
        finalFilter.patientId = user._id;
      }
      // Doctors can see their patients' records
      else if (user.profile.role === 'doctor') {
        if (!finalFilter.patientId && !finalFilter.doctorId) {
          finalFilter.doctorId = user._id;
        }
      }

      const finalOptions: QueryOptions = {
        ...options,
        ...customOptions,
      };

      const response = await mongodbClient.getMedicalRecords(finalFilter, finalOptions);

      if (response.success && response.data) {
        const paginatedData = response.data as PaginatedResponse<MedicalRecordDocument>;
        setState(prev => ({
          ...prev,
          records: paginatedData.data,
          total: paginatedData.total,
          hasNext: paginatedData.hasNext,
          hasPrev: paginatedData.hasPrev,
          currentPage: paginatedData.page,
          loading: false,
          error: null,
        }));
      } else {
        setError(response.error || 'Failed to fetch medical records');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch medical records');
    }
  }, [isAuthenticated, user, filter, options, setLoading, clearError, setError]);

  // Create medical record
  const createRecord = useCallback(async (
    recordData: Partial<MedicalRecordDocument>
  ): Promise<MedicalRecordDocument | null> => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return null;
    }

    // Only doctors and admins can create records
    if (!['doctor', 'admin'].includes(user.profile.role)) {
      setError('Insufficient permissions to create medical records');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const newRecord: Partial<MedicalRecordDocument> = {
        ...recordData,
        doctorId: recordData.doctorId || user._id,
        status: recordData.status || RecordStatus.ACTIVE,
        recordType: recordData.recordType || RecordType.CONSULTATION,
        visitDate: recordData.visitDate || new Date(),
      };

      const response = await mongodbClient.createMedicalRecord(newRecord);

      if (response.success && response.data) {
        // Add to current records list
        setState(prev => ({
          ...prev,
          records: [response.data!, ...prev.records],
          total: prev.total + 1,
          loading: false,
        }));

        return response.data;
      } else {
        setError(response.error || 'Failed to create medical record');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create medical record');
      return null;
    }
  }, [isAuthenticated, user, setLoading, clearError, setError]);

  // Update medical record
  const updateRecord = useCallback(async (
    recordId: string,
    updates: Partial<MedicalRecordDocument>
  ): Promise<MedicalRecordDocument | null> => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const response = await mongodbClient.updateMedicalRecord(recordId, updates);

      if (response.success && response.data) {
        // Update in current records list
        setState(prev => ({
          ...prev,
          records: prev.records.map(record =>
            record._id === recordId ? response.data! : record
          ),
          loading: false,
        }));

        return response.data;
      } else {
        setError(response.error || 'Failed to update medical record');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update medical record');
      return null;
    }
  }, [isAuthenticated, user, setLoading, clearError, setError]);

  // Delete medical record
  const deleteRecord = useCallback(async (recordId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return false;
    }

    // Only doctors and admins can delete records
    if (!['doctor', 'admin'].includes(user.profile.role)) {
      setError('Insufficient permissions to delete medical records');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const response = await mongodbClient.deleteMedicalRecord(recordId);

      if (response.success) {
        // Remove from current records list
        setState(prev => ({
          ...prev,
          records: prev.records.filter(record => record._id !== recordId),
          total: prev.total - 1,
          loading: false,
        }));

        return true;
      } else {
        setError(response.error || 'Failed to delete medical record');
        return false;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete medical record');
      return false;
    }
  }, [isAuthenticated, user, setLoading, clearError, setError]);

  // Get single medical record
  const getRecord = useCallback(async (recordId: string): Promise<MedicalRecordDocument | null> => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const response = await mongodbClient.getMedicalRecord(recordId);

      if (response.success && response.data) {
        setLoading(false);
        return response.data;
      } else {
        setError(response.error || 'Failed to fetch medical record');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch medical record');
      return null;
    }
  }, [isAuthenticated, user, setLoading, clearError, setError]);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<MedicalRecordFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Update options
  const updateOptions = useCallback((newOptions: Partial<QueryOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Pagination helpers
  const nextPage = useCallback(() => {
    if (state.hasNext) {
      const newSkip = (state.currentPage) * (options.limit || 20);
      updateOptions({ skip: newSkip });
    }
  }, [state.hasNext, state.currentPage, options.limit, updateOptions]);

  const prevPage = useCallback(() => {
    if (state.hasPrev && state.currentPage > 1) {
      const newSkip = (state.currentPage - 2) * (options.limit || 20);
      updateOptions({ skip: Math.max(0, newSkip) });
    }
  }, [state.hasPrev, state.currentPage, options.limit, updateOptions]);

  const goToPage = useCallback((page: number) => {
    const newSkip = (page - 1) * (options.limit || 20);
    updateOptions({ skip: newSkip });
  }, [options.limit, updateOptions]);

  // Search records
  const searchRecords = useCallback((searchTerm: string) => {
    updateFilter({ search: searchTerm });
  }, [updateFilter]);

  // Filter by status
  const filterByStatus = useCallback((status: RecordStatus) => {
    updateFilter({ status });
  }, [updateFilter]);

  // Filter by type
  const filterByType = useCallback((recordType: RecordType) => {
    updateFilter({ recordType });
  }, [updateFilter]);

  // Filter by date range
  const filterByDateRange = useCallback((dateFrom: Date, dateTo: Date) => {
    updateFilter({ dateFrom, dateTo });
  }, [updateFilter]);

  // Refresh records
  const refresh = useCallback(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Auto-fetch when filter or options change
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRecords();
    }
  }, [filter, options, isAuthenticated, user]);

  return {
    // State
    ...state,
    
    // Actions
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    refresh,
    clearError,
    
    // Filtering
    updateFilter,
    searchRecords,
    filterByStatus,
    filterByType,
    filterByDateRange,
    
    // Pagination
    nextPage,
    prevPage,
    goToPage,
    updateOptions,
    
    // Current filter and options
    currentFilter: filter,
    currentOptions: options,
  };
};

export default useMongoMedicalRecords;
