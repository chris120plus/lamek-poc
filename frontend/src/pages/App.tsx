import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Moon, Dumbbell, TrendingUp, ArrowRight } from "lucide-react";

export default function App() {
  const navigate = useNavigate();

  const handleViewDashboard = () => {
    navigate('/Dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <Activity className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Your Rhythm. Your Feedback. Your Loop.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            This is not just tracking – it's translation. Coach Lamek listens to your data and helps you find the rhythm behind your results: HRV, sleep, recovery, and performance – all in one evolving feedback loop.
          </p>
          <Button
            onClick={handleViewDashboard}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            View Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                <Heart className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">HRV Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Monitor your autonomic nervous system and stress levels through heart rate variability analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-purple-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-purple-100 p-3 rounded-full w-fit mb-2">
                <Moon className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Sleep Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Track sleep duration, efficiency, and quality patterns to optimize your recovery.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-orange-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-orange-100 p-3 rounded-full w-fit mb-2">
                <Dumbbell className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Workout Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Monitor calorie burn, session frequency, and activity intensity trends.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Get personalized recommendations based on your holistic health data patterns.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Your Health Journey?
          </h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Connect your Health Auto Export data and get instant insights into your wellness patterns.
          </p>
          <Button
            onClick={handleViewDashboard}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
          >
            Get Started Now
            <Activity className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}


