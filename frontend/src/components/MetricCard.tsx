import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthChart } from 'components/HealthChart';
import { useHealthMetrics, getTrendIndicator, getTimeRange } from 'utils/healthHooks';
import { MetricDataPointOutput } from 'types';

type MetricType = 'heart_rate_variability' | 'workout' | 'sleep';

interface Props {
  metricType: MetricType;
  title: string;
  unit: string;
  color: string;
  timeRangeHours?: number;
  className?: string;
}

interface MetricStats {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: {
    icon: string;
    color: string;
    label: string;
  };
}

function calculateStats(data: MetricDataPointOutput[]): MetricStats {
  if (!data || data.length === 0) {
    return {
      current: 0,
      average: 0,
      min: 0,
      max: 0,
      trend: getTrendIndicator(0)
    };
  }

  const values = data.map(d => d.value);
  const current = values[values.length - 1] || 0;
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate trend based on first half vs second half
  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);
  
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      current,
      average,
      min,
      max,
      trend: getTrendIndicator(changePercent)
    };
  }

  return {
    current,
    average,
    min,
    max,
    trend: getTrendIndicator(0)
  };
}

function getMetricConfig(metricType: MetricType) {
  switch (metricType) {
    case 'heart_rate_variability':
      return {
        description: 'Heart Rate Variability',
        chartHeight: 180,
        formatValue: (value: number) => `${value.toFixed(1)}`
      };
    case 'sleep':
      return {
        description: 'Sleep Duration',
        chartHeight: 180,
        formatValue: (value: number) => `${value.toFixed(1)}`
      };
    case 'workout':
      return {
        description: 'Workout Duration',
        chartHeight: 180,
        formatValue: (value: number) => `${value.toFixed(0)}`
      };
    default:
      return {
        description: 'Metric',
        chartHeight: 180,
        formatValue: (value: number) => `${value.toFixed(1)}`
      };
  }
}

export function MetricCard({
  metricType,
  title,
  unit,
  color,
  timeRangeHours = 168, // Increased to 1 week to capture real HAE data
  className = ''
}: Props) {
  // Memoize timeRange to prevent infinite re-renders
  const timeRange = useMemo(() => getTimeRange(timeRangeHours), [timeRangeHours]);
  
  const { data, loading, error, refetch } = useHealthMetrics({
    metric: metricType,
    timeRange, // Re-enabled with wider range for real data
    limit: 100
  });

  const config = getMetricConfig(metricType);
  const stats = calculateStats(data?.data || []);

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </div>
          <Skeleton className="w-full h-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>{title}</span>
          <Badge 
            variant="secondary" 
            className={`${stats.trend.color} bg-opacity-10`}
          >
            {stats.trend.icon} {stats.trend.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color }}>
              {config.formatValue(stats.current)}
            </p>
            <p className="text-xs text-gray-500">Current</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">
              {config.formatValue(stats.average)}
            </p>
            <p className="text-xs text-gray-500">Average</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {config.formatValue(stats.min)}-{config.formatValue(stats.max)}
            </p>
            <p className="text-xs text-gray-500">Range</p>
          </div>
        </div>

        {/* Chart */}
        <HealthChart
          data={data?.data || []}
          color={color}
          unit={unit}
          height={config.chartHeight}
          loading={loading}
          error={error}
        />

        {/* Footer Info */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Last {timeRangeHours}h</span>
          <span>{data?.total_count || 0} data points</span>
        </div>
      </CardContent>
    </Card>
  );
}