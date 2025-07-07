import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Brain, TrendingUp, Clock } from 'lucide-react';
import { useHealthInsights } from 'utils/healthHooks';
import { toast } from 'sonner';

interface Props {
  className?: string;
  autoRefresh?: boolean;
}

const TIME_RANGES = [
  { value: 24, label: '24 Hours' },
  { value: 48, label: '48 Hours' },
  { value: 72, label: '3 Days' },
  { value: 168, label: '7 Days' }
];

export function InsightsCard({ className = '', autoRefresh = true }: Props) {
  const [selectedRange, setSelectedRange] = useState(24);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, loading, error, refetch } = useHealthInsights({
    rangeHours: selectedRange,
    autoRefresh,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Insights refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh insights');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRangeChange = (value: string) => {
    setSelectedRange(parseInt(value));
  };

  if (loading && !data) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200 bg-red-50`}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-red-700">
            <Brain className="h-5 w-5" />
            Holistic Health Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Failed to load insights</p>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Holistic Health Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No insights available</p>
            <p className="text-sm text-gray-400 mb-4">Start tracking your health metrics to get AI-powered insights</p>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Generate Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          Holistic Health Insights
          {autoRefresh && (
            <Badge variant="secondary" className="ml-auto text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Auto-refresh
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <Select value={selectedRange.toString()} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value.toString()}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* AI Insight */}
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">AI Recommendation</h4>
              <p className="text-gray-700 leading-relaxed">{data.insight}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-lg font-semibold text-blue-600">
                {data.current.hrv.avg.toFixed(1)}ms
              </p>
              <p className="text-xs text-gray-500">HRV Average</p>
              <div className="text-xs mt-1">
                <span className={`${
                  data.changes.hrv_change_percent > 0 
                    ? 'text-green-600' 
                    : data.changes.hrv_change_percent < 0 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {data.changes.hrv_change_percent > 0 ? '+' : ''}{data.changes.hrv_change_percent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-lg font-semibold text-purple-600">
                {data.current.sleep.avg_duration_hours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500">Sleep Duration</p>
              <div className="text-xs mt-1">
                <span className={`${
                  data.changes.sleep_duration_change > 0 
                    ? 'text-green-600' 
                    : data.changes.sleep_duration_change < 0 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {data.changes.sleep_duration_change > 0 ? '+' : ''}{data.changes.sleep_duration_change.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <p className="text-lg font-semibold text-orange-600">
                {data.current.workout.total_calories.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Total Calories</p>
              <div className="text-xs mt-1">
                <span className={`${
                  data.changes.workout_calorie_change > 0 
                    ? 'text-green-600' 
                    : data.changes.workout_calorie_change < 0 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {data.changes.workout_calorie_change > 0 ? '+' : ''}{data.changes.workout_calorie_change.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 text-center pt-2">
          Analysis period: {data.period_hours} hours • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}