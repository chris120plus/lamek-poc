import React from 'react';
import { InsightsCard } from 'components/InsightsCard';
import { MetricCard } from 'components/MetricCard';
import { Separator } from '@/components/ui/separator';
import { Activity, Heart, Moon, Dumbbell } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coach Lamek's Rhythm Briefing</h1>
              <p className="text-gray-600 mt-1">A daily pulse on your system. Built from your inputs. Interpreted through rhythm. Here's what your body is trying to tell you today.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* AI Insights Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Lamek Insights</h2>
              <p className="text-gray-600">AI-powered analysis of your health patterns and recommendations</p>
            </div>
            <InsightsCard className="w-full" autoRefresh={true} />
          </section>

          <Separator className="my-8" />

          {/* Metrics Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Health Metrics</h2>
              <p className="text-gray-600">Monitor your key health indicators over time</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* HRV Card */}
              <MetricCard
                metricType="heart_rate_variability"
                title="Heart Rate Variability"
                unit="ms"
                color="#3b82f6"
                timeRangeHours={72}
                className="h-fit"
              />

              {/* Sleep Card */}
              <MetricCard
                metricType="sleep"
                title="Sleep Quality"
                unit="hours"
                color="#8b5cf6"
                timeRangeHours={72}
                className="h-fit"
              />

              {/* Workout Card */}
              <MetricCard
                metricType="workout"
                title="Workout Activity"
                unit="cal"
                color="#f59e0b"
                timeRangeHours={72}
                className="h-fit"
              />
            </div>
          </section>

          {/* Quick Stats Section */}
          <section className="mt-12">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Health Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Heart className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-700 font-medium">HRV Tracking</p>
                    <p className="text-xs text-blue-600">Monitor autonomic nervous system</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                  <Moon className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Sleep Analysis</p>
                    <p className="text-xs text-purple-600">Track duration and efficiency</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                  <Dumbbell className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Workout Intensity</p>
                    <p className="text-xs text-orange-600">Monitor calorie burn and sessions</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <footer className="text-center py-8">
            <div className="text-sm text-gray-500">
              <p>Data automatically synced from Health Auto Export</p>
              <p className="mt-1">Insights powered by AI • Updates every 5 minutes</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}


