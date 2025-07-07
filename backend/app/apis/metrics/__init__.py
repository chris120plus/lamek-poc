from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, HTTPException, Query
import asyncpg
import databutton as db
from app.env import mode, Mode
from app.auth import AuthorizedUser

router = APIRouter()

# Pydantic models
class MetricDataPoint(BaseModel):
    timestamp: datetime = Field(..., description="Timestamp of the measurement")
    value: float = Field(..., description="Metric value")

class MetricsResponse(BaseModel):
    data: List[MetricDataPoint] = Field(..., description="Array of metric data points")
    total_count: int = Field(..., description="Total number of records matching query")

# Type definitions for metric names
MetricType = Literal["heart_rate_variability", "workout", "sleep"]

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

async def query_sleep_metrics(
    conn: asyncpg.Connection, 
    user_id: str, 
    from_date: Optional[datetime], 
    to_date: Optional[datetime], 
    limit: int
) -> List[MetricDataPoint]:
    """Query sleep metrics and return duration in hours"""
    
    query = """
        SELECT start_time as timestamp, 
               duration_total_minutes / 60.0 as value
        FROM sleep_metrics 
        WHERE user_id = $1
    """
    
    params = [user_id]
    param_count = 1
    
    if from_date:
        param_count += 1
        query += f" AND start_time >= ${param_count}"
        params.append(from_date)
    
    if to_date:
        param_count += 1
        query += f" AND start_time <= ${param_count}"
        params.append(to_date)
    
    query += " ORDER BY start_time ASC"
    
    if limit:
        param_count += 1
        query += f" LIMIT ${param_count}"
        params.append(limit)
    
    rows = await conn.fetch(query, *params)
    
    return [
        MetricDataPoint(timestamp=row['timestamp'], value=float(row['value']))
        for row in rows
    ]

async def query_health_metrics(
    conn: asyncpg.Connection,
    user_id: str,
    metric_name: str,
    from_date: Optional[datetime],
    to_date: Optional[datetime],
    limit: int
) -> List[MetricDataPoint]:
    """Query health metrics for specific metric name"""
    
    query = """
        SELECT timestamp, value
        FROM health_metrics 
        WHERE user_id = $1 AND metric_name = $2
    """
    
    params = [user_id, metric_name]
    param_count = 2
    
    if from_date:
        param_count += 1
        query += f" AND timestamp >= ${param_count}"
        params.append(from_date)
    
    if to_date:
        param_count += 1
        query += f" AND timestamp <= ${param_count}"
        params.append(to_date)
    
    query += " ORDER BY timestamp ASC"
    
    if limit:
        param_count += 1
        query += f" LIMIT ${param_count}"
        params.append(limit)
    
    rows = await conn.fetch(query, *params)
    
    return [
        MetricDataPoint(timestamp=row['timestamp'], value=float(row['value']))
        for row in rows
    ]

async def query_workout_metrics(
    conn: asyncpg.Connection,
    user_id: str,
    from_date: Optional[datetime],
    to_date: Optional[datetime],
    limit: int
) -> List[MetricDataPoint]:
    """Query workout metrics - returns calories burned for consistency with frontend display"""
    
    # Query workout_calories as primary metric (frontend expects calories)
    # This aligns with insights endpoint and frontend unit display
    query = """
        SELECT timestamp, value
        FROM health_metrics 
        WHERE user_id = $1 AND metric_name = 'workout'
    """
    
    params = [user_id]
    param_count = 1
    
    if from_date:
        param_count += 1
        query += f" AND timestamp >= ${param_count}"
        params.append(from_date)
    
    if to_date:
        param_count += 1
        query += f" AND timestamp <= ${param_count}"
        params.append(to_date)
    
    query += " ORDER BY timestamp ASC"
    
    if limit:
        param_count += 1
        query += f" LIMIT ${param_count}"
        params.append(limit)
    
    rows = await conn.fetch(query, *params)
    
    return [
        MetricDataPoint(timestamp=row['timestamp'], value=float(row['value']))
        for row in rows
    ]

async def get_total_count(
    conn: asyncpg.Connection,
    user_id: str,
    metric: MetricType,
    from_date: Optional[datetime],
    to_date: Optional[datetime]
) -> int:
    """Get total count of records for pagination"""
    
    if metric == "sleep":
        query = "SELECT COUNT(*) FROM sleep_metrics WHERE user_id = $1"
        params = [user_id]
        param_count = 1
        
        if from_date:
            param_count += 1
            query += f" AND start_time >= ${param_count}"
            params.append(from_date)
        
        if to_date:
            param_count += 1
            query += f" AND start_time <= ${param_count}"
            params.append(to_date)
    
    elif metric == "heart_rate_variability":
        query = "SELECT COUNT(*) FROM health_metrics WHERE user_id = $1 AND metric_name = 'heart_rate_variability'"
        params = [user_id]
        param_count = 1
        
        if from_date:
            param_count += 1
            query += f" AND timestamp >= ${param_count}"
            params.append(from_date)
        
        if to_date:
            param_count += 1
            query += f" AND timestamp <= ${param_count}"
            params.append(to_date)
    
    elif metric == "workout":
        query = "SELECT COUNT(*) FROM health_metrics WHERE user_id = $1 AND metric_name = 'workout'"
        params = [user_id]
        param_count = 1
        
        if from_date:
            param_count += 1
            query += f" AND timestamp >= ${param_count}"
            params.append(from_date)
        
        if to_date:
            param_count += 1
            query += f" AND timestamp <= ${param_count}"
            params.append(to_date)
    
    result = await conn.fetchval(query, *params)
    return int(result) if result else 0

@router.get("/metrics")
async def get_metrics(
    metric: MetricType = Query(..., description="Metric type to query"),
    user: AuthorizedUser = None,
    from_date: Optional[datetime] = Query(None, alias="from", description="Start date for range query (ISO datetime)"),
    to_date: Optional[datetime] = Query(None, alias="to", description="End date for range query (ISO datetime)"),
    limit: int = Query(1000, ge=1, le=5000, description="Maximum records to return")
) -> MetricsResponse:
    """
    Query health metrics data with proper metric mapping and pagination.
    
    **Metric Mapping:**
    - sleep: Returns duration in hours from sleep_metrics table
    - heart_rate_variability: Returns HRV values in ms from health_metrics
    - workout: Returns workout values from health_metrics (treated as calories for display)
    
    **Authentication:**
    - Requires valid authentication token
    - Returns data only for the authenticated user
    
    **Pagination:**
    - Default limit: 1000, Maximum: 5000
    - Results ordered by timestamp ASC
    """
    
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = user.sub
    
    # Validate date range
    if from_date and to_date and from_date >= to_date:
        raise HTTPException(status_code=400, detail="'from' date must be before 'to' date")
    
    print(f"Querying {metric} metrics for user {user_id}, from={from_date}, to={to_date}, limit={limit}")
    
    try:
        conn = await get_db_connection()
        
        try:
            # Get total count for pagination info
            total_count = await get_total_count(conn, user_id, metric, from_date, to_date)
            
            # Query data based on metric type
            if metric == "sleep":
                data_points = await query_sleep_metrics(conn, user_id, from_date, to_date, limit)
            elif metric == "heart_rate_variability":
                data_points = await query_health_metrics(conn, user_id, "heart_rate_variability", from_date, to_date, limit)
            elif metric == "workout":
                data_points = await query_workout_metrics(conn, user_id, from_date, to_date, limit)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported metric type: {metric}")
            
            print(f"Retrieved {len(data_points)} data points out of {total_count} total")
            
            return MetricsResponse(
                data=data_points,
                total_count=total_count
            )
            
        finally:
            await conn.close()
            
    except Exception as e:
        error_msg = f"Error querying metrics: {str(e)}"
        print(f"Metrics query error for user {user_id}: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
