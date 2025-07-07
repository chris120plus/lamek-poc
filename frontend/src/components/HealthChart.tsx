import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricDataPointOutput } from 'types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: MetricDataPointOutput[];
  title?: string;
  color?: string;
  unit?: string;
  height?: number;
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  formattedTime: string;
}

export function HealthChart({
  data,
  title,
  color = '#3b82f6',
  unit = '',
  height = 200,
  loading = false,
  error = null
}: Props) {
  // Transform data for recharts
  const chartData: ChartDataPoint[] = data.map(point => {
    const date = new Date(point.timestamp);
    return {
      timestamp: point.timestamp,
      value: point.value,
      formattedTime: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  });

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {`${payload[0].value}${unit ? ` ${unit}` : ''}`}
          </p>
          <p className="text-sm text-gray-600">
            {data.formattedTime}
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {title && <Skeleton className="h-5 w-32" />}
        <Skeleton className="w-full" style={{ height }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-red-600">Failed to load chart</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card className="p-4" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-gray-500">No data available</p>
            <p className="text-xs text-gray-400 mt-1">Start tracking to see your metrics</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}