from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, HTTPException, Query
import asyncpg
import databutton as db
import requests
from app.env import mode, Mode
from app.auth import AuthorizedUser

router = APIRouter()

# Pydantic models
class MetricStats(BaseModel):
    avg: float = Field(..., description="Average value")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")

class SleepStats(BaseModel):
    avg_duration_hours: float = Field(..., description="Average sleep duration in hours")
    avg_efficiency: Optional[float] = Field(None, description="Average sleep efficiency percentage")

class WorkoutStats(BaseModel):
    total_calories: float = Field(..., description="Total calories burned")
    session_count: int = Field(..., description="Number of workout sessions")

class PeriodData(BaseModel):
    hrv: MetricStats = Field(..., description="HRV statistics")
    sleep: SleepStats = Field(..., description="Sleep statistics")
    workout: WorkoutStats = Field(..., description="Workout statistics")

class MetricChanges(BaseModel):
    hrv_change_percent: float = Field(..., description="HRV percentage change")
    sleep_duration_change: float = Field(..., description="Sleep duration change in hours")
    workout_calorie_change: float = Field(..., description="Workout calorie change")

class InsightsResponse(BaseModel):
    period_hours: int = Field(..., description="Time period analyzed")
    current: PeriodData = Field(..., description="Current period statistics")
    previous: PeriodData = Field(..., description="Previous period statistics")
    changes: MetricChanges = Field(..., description="Changes between periods")
    insight: str = Field(..., description="AI-generated health insight")

# Database helper
async def get_db_connection():
    """Get database connection based on environment"""
    if mode == Mode.PROD:
        database_url = db.secrets.get("DATABASE_URL_PROD")
    else:
        database_url = db.secrets.get("DATABASE_URL_DEV")
    
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    return await asyncpg.connect(database_url)

async def get_hrv_stats(conn: asyncpg.Connection, user_id: str, start_time: datetime, end_time: datetime) -> MetricStats:
    """Get HRV statistics for a time period"""
    query = """
        SELECT 
            AVG(value) as avg_val,
            MIN(value) as min_val,
            MAX(value) as max_val
        FROM health_metrics 
        WHERE user_id = $1 
        AND metric_name = 'heart_rate_variability'
        AND timestamp BETWEEN $2 AND $3
    """
    
    result = await conn.fetchrow(query, user_id, start_time, end_time)
    
    if not result or result['avg_val'] is None:
        return MetricStats(avg=0.0, min=0.0, max=0.0)
    
    return MetricStats(
        avg=float(result['avg_val']),
        min=float(result['min_val']) if result['min_val'] else 0.0,
        max=float(result['max_val']) if result['max_val'] else 0.0
    )

async def get_sleep_stats(conn: asyncpg.Connection, user_id: str, start_time: datetime, end_time: datetime) -> SleepStats:
    """Get sleep statistics for a time period"""
    query = """
        SELECT 
            AVG(duration_total_minutes) / 60.0 as avg_duration_hours,
            AVG(efficiency) as avg_efficiency
        FROM sleep_metrics 
        WHERE user_id = $1 
        AND start_time BETWEEN $2 AND $3
    """
    
    result = await conn.fetchrow(query, user_id, start_time, end_time)
    
    if not result or result['avg_duration_hours'] is None:
        return SleepStats(avg_duration_hours=0.0, avg_efficiency=0.0)
    
    return SleepStats(
        avg_duration_hours=float(result['avg_duration_hours']),
        avg_efficiency=float(result['avg_efficiency']) if result['avg_efficiency'] else 0.0
    )

async def get_workout_stats(conn: asyncpg.Connection, user_id: str, start_time: datetime, end_time: datetime) -> WorkoutStats:
    """Get workout statistics for a time period"""
    # Get calories from health_metrics
    calories_query = """
        SELECT COALESCE(SUM(value), 0) as total_calories
        FROM health_metrics 
        WHERE user_id = $1 
        AND metric_name = 'workout'
        AND timestamp BETWEEN $2 AND $3
    """
    
    # Get session count from workout entries
    sessions_query = """
        SELECT COUNT(*) as session_count
        FROM health_metrics 
        WHERE user_id = $1 
        AND metric_name = 'workout'
        AND timestamp BETWEEN $2 AND $3
    """
    
    calories_result = await conn.fetchrow(calories_query, user_id, start_time, end_time)
    sessions_result = await conn.fetchrow(sessions_query, user_id, start_time, end_time)
    
    return WorkoutStats(
        total_calories=float(calories_result['total_calories']) if calories_result else 0.0,
        session_count=int(sessions_result['session_count']) if sessions_result else 0
    )

async def generate_ai_insight(current: PeriodData, previous: PeriodData, period_hours: int) -> str:
    """Generate AI-powered health insight using Venice AI"""
    try:
        venice_api_key = db.secrets.get("VENICE_API_KEY")
        venice_model = db.secrets.get("VENICE_MODEL")
        
        if not venice_api_key or not venice_model:
            return "AI insights temporarily unavailable. Please configure Venice AI credentials."
        
        # Calculate changes
        hrv_change = ((current.hrv.avg - previous.hrv.avg) / previous.hrv.avg * 100) if previous.hrv.avg > 0 else 0
        sleep_change = current.sleep.avg_duration_hours - previous.sleep.avg_duration_hours
        calorie_change = current.workout.total_calories - previous.workout.total_calories
        
        # Create prompt
        user_prompt = f"""Last {period_hours}h: HRV avg {current.hrv.avg:.1f}ms ({hrv_change:+.1f}% change), Sleep avg {current.sleep.avg_duration_hours:.1f}h (efficiency {current.sleep.avg_efficiency:.0f}%), Workout burned {current.workout.total_calories:.0f}kcal in {current.workout.session_count} sessions.

Previous {period_hours}h: HRV avg {previous.hrv.avg:.1f}ms, Sleep avg {previous.sleep.avg_duration_hours:.1f}h (efficiency {previous.sleep.avg_efficiency:.0f}%), Workout burned {previous.workout.total_calories:.0f}kcal in {previous.workout.session_count} sessions.

Provide a single holistic health recommendation based on these trends."""
        
        # Venice AI API call with detailed logging
        import json
        
        url = "https://api.venice.ai/api/v1/chat/completions"
        payload = {
            "model": venice_model,
            "messages": [
                {"role": "system", "content": "You are a holistic health coach. Provide concise, actionable health recommendations based on biometric trends."},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 200,
            "temperature": 0.7
        }
        
        print("→ Venice URL:  ", url)
        print("→ Venice body:", json.dumps(payload, indent=2))
        
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {venice_api_key}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        
        print("← Venice status:", response.status_code)
        print("← Venice reply: ", response.text)
        print("← Req full URL: ", response.request.url)
        print("← Req raw body:", response.request.body)
        
        if response.status_code == 200:
            ai_response = response.json()
            return ai_response['choices'][0]['message']['content'].strip()
        else:
            print(f"Venice AI API error: {response.status_code} - {response.text}")
            return "AI insights temporarily unavailable due to service error."
            
    except Exception as e:
        print(f"Error generating AI insight: {str(e)}")
        return "AI insights temporarily unavailable. Analysis shows your metrics are being tracked successfully."

@router.get("/insights")
async def get_health_insights(
    user: AuthorizedUser,
    range_hours: int = Query(24, ge=1, le=168, description="Analysis time window in hours (1-168)")
) -> InsightsResponse:
    """
    Generate AI-powered holistic health insights based on HRV, sleep, and workout data.
    
    **Analysis Logic:**
    - Recent Period: Last `range_hours` hours from now
    - Previous Period: Same duration before recent period (for comparison)
    
    **Metrics Analyzed:**
    - HRV: Average, min, max values and percentage change
    - Sleep: Average duration and efficiency
    - Workout: Total calories burned and session count
    
    **AI Integration:**
    - Uses Venice AI to provide personalized health recommendations
    - Compares current period vs previous period trends
    - Provides actionable insights for optimization
    
    **Authentication:**
    - Requires valid authentication token
    - Returns insights only for the authenticated user
    """
    
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = user.sub
    
    # Calculate time periods
    now = datetime.utcnow()
    current_start = now - timedelta(hours=range_hours)
    current_end = now
    previous_start = now - timedelta(hours=range_hours * 2)
    previous_end = current_start
    
    print(f"Generating insights for user {user_id}:")
    print(f"Current period: {current_start} to {current_end}")
    print(f"Previous period: {previous_start} to {previous_end}")
    
    try:
        conn = await get_db_connection()
        
        try:
            # Get current period stats
            current_hrv = await get_hrv_stats(conn, user_id, current_start, current_end)
            current_sleep = await get_sleep_stats(conn, user_id, current_start, current_end)
            current_workout = await get_workout_stats(conn, user_id, current_start, current_end)
            
            # Get previous period stats
            previous_hrv = await get_hrv_stats(conn, user_id, previous_start, previous_end)
            previous_sleep = await get_sleep_stats(conn, user_id, previous_start, previous_end)
            previous_workout = await get_workout_stats(conn, user_id, previous_start, previous_end)
            
            # Create period data objects
            current_data = PeriodData(
                hrv=current_hrv,
                sleep=current_sleep,
                workout=current_workout
            )
            
            previous_data = PeriodData(
                hrv=previous_hrv,
                sleep=previous_sleep,
                workout=previous_workout
            )
            
            # Calculate changes
            hrv_change = ((current_hrv.avg - previous_hrv.avg) / previous_hrv.avg * 100) if previous_hrv.avg > 0 else 0
            sleep_change = current_sleep.avg_duration_hours - previous_sleep.avg_duration_hours
            calorie_change = current_workout.total_calories - previous_workout.total_calories
            
            changes = MetricChanges(
                hrv_change_percent=hrv_change,
                sleep_duration_change=sleep_change,
                workout_calorie_change=calorie_change
            )
            
            # Generate AI insight
            ai_insight = await generate_ai_insight(current_data, previous_data, range_hours)
            
            print(f"Generated insights with {len(ai_insight)} character AI response")
            
            return InsightsResponse(
                period_hours=range_hours,
                current=current_data,
                previous=previous_data,
                changes=changes,
                insight=ai_insight
            )
            
        finally:
            await conn.close()
            
    except Exception as e:
        error_msg = f"Error generating health insights: {str(e)}"
        print(f"Health insights error for user {user_id}: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
