import { useState, useEffect } from 'react';
import brain from 'brain';
import { MetricsResponse, InsightsResponse } from 'types';

type MetricType = 'heart_rate_variability' | 'workout' | 'sleep';

interface UseHealthMetricsOptions {
  metric: MetricType;
  timeRange?: {
    from?: string;
    to?: string;
  };
  limit?: number;
  enabled?: boolean;
}

interface UseHealthMetricsResult {
  data: MetricsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching health metrics data
 */
export function useHealthMetrics(options: UseHealthMetricsOptions): UseHealthMetricsResult {
  const { metric, timeRange, limit = 1000, enabled = true } = options;
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        metric,
        from: timeRange?.from || null,
        to: timeRange?.to || null,
        limit
      };
      
      const response = await brain.get_metrics(params);
      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      setError(errorMessage);
      console.error('Error fetching health metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [metric, timeRange?.from, timeRange?.to, limit, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics
  };
}

interface UseHealthInsightsOptions {
  rangeHours?: number;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseHealthInsightsResult {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching AI-powered health insights
 */
export function useHealthInsights(options: UseHealthInsightsOptions = {}): UseHealthInsightsResult {
  const { 
    rangeHours = 24, 
    enabled = true, 
    autoRefresh = false, 
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options;
  
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = { range_hours: rangeHours };
      const response = await brain.get_health_insights(params);
      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insights';
      setError(errorMessage);
      console.error('Error fetching health insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [rangeHours, enabled]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled) return;
    
    const interval = setInterval(() => {
      fetchInsights();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchInsights
  };
}

/**
 * Helper function to format time range for API calls
 */
export function getTimeRange(hours: number) {
  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  return {
    from: from.toISOString(),
    to: now.toISOString()
  };
}

/**
 * Helper function to get trend indicator
 */
export function getTrendIndicator(changePercent: number): {
  icon: string;
  color: string;
  label: string;
} {
  if (changePercent > 5) {
    return {
      icon: '↗️',
      color: 'text-green-600',
      label: 'Improving'
    };
  } else if (changePercent < -5) {
    return {
      icon: '↘️',
      color: 'text-red-600',
      label: 'Declining'
    };
  } else {
    return {
      icon: '→',
      color: 'text-gray-600',
      label: 'Stable'
    };
  }
}