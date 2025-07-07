from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Union, Literal, Annotated
from pydantic import BaseModel, Field, validator, Discriminator, Tag
from fastapi import APIRouter, HTTPException, Header, Depends, Request
from fastapi.exceptions import RequestValidationError
import hashlib
import json
import asyncpg
import databutton as db
from app.env import mode, Mode

router = APIRouter()

# Pydantic models for request validation

# Common metric data point (for HRV, steps, etc.)
class CommonPoint(BaseModel):
    date: datetime = Field(..., description="Timestamp of the metric measurement")
    qty: float = Field(..., description="Metric value/quantity")
    
    @validator('date', pre=True)
    def parse_swift_datetime(cls, v):
        """Parse Swift/ObjC datetime format: '2025-06-25 00:00:00 +0200'"""
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z")
            except ValueError:
                # Fallback to ISO format
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# Sleep-specific data point
class SleepEntry(BaseModel):
    date: datetime = Field(..., description="Sleep session date")
    asleep: float = Field(..., description="Time asleep in hours")
    awake: float = Field(..., description="Time awake in hours")
    core: float = Field(..., description="Core sleep time in hours")
    deep: float = Field(..., description="Deep sleep time in hours")
    rem: float = Field(..., description="REM sleep time in hours")
    sleepStart: datetime = Field(..., description="Sleep start time")
    sleepEnd: datetime = Field(..., description="Sleep end time")
    source: str = Field(..., description="Data source")
    totalSleep: float = Field(..., description="Total sleep time in hours")
    
    @validator('date', 'sleepStart', 'sleepEnd', pre=True)
    def parse_swift_datetime(cls, v):
        """Parse Swift/ObjC datetime format: '2025-06-25 00:00:00 +0200'"""
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z")
            except ValueError:
                # Fallback to ISO format
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# Common metric model (HRV, steps, etc.)
class CommonMetric(BaseModel):
    name: str = Field(..., description="Metric name (e.g., heart_rate_variability)")
    units: str = Field(..., description="Unit of measurement (e.g., ms, bpm)")
    data: List[CommonPoint] = Field(..., description="Array of data points")

# Sleep metric model
class SleepMetric(BaseModel):
    name: Literal["sleep_analysis"] = Field(..., description="Sleep metric name (must be sleep_analysis)")
    units: str = Field(..., description="Unit of measurement")
    data: List[SleepEntry] = Field(..., description="Array of sleep data points")

# Energy data point for workout timeseries
class EnergyPoint(BaseModel):
    date: datetime = Field(..., description="Timestamp of energy measurement")
    qty: float = Field(..., description="Energy quantity")
    source: Optional[str] = Field(None, description="Data source")
    units: str = Field(..., description="Energy units (e.g., 'cal')")
    
    @validator('date', pre=True)
    def parse_swift_datetime(cls, v):
        """Parse Swift/ObjC datetime format: '2025-07-01 06:05:54 +0200'"""
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z")
            except ValueError:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# Heart rate data structure with Avg/Min/Max
class HeartRateValues(BaseModel):
    Avg: Optional[float] = Field(None, description="Average heart rate")
    Min: Optional[float] = Field(None, description="Minimum heart rate")
    Max: Optional[float] = Field(None, description="Maximum heart rate")

# Heart rate data point for workout timeseries
class HeartRatePoint(BaseModel):
    date: datetime = Field(..., description="Timestamp of heart rate measurement")
    qty: HeartRateValues = Field(..., description="Heart rate values (Avg/Min/Max)")
    source: Optional[str] = Field(None, description="Data source")
    units: str = Field(..., description="Heart rate units (e.g., 'count/min')")
    
    @validator('date', pre=True)
    def parse_swift_datetime(cls, v):
        """Parse Swift/ObjC datetime format: '2025-07-01 06:05:54 +0200'"""
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z")
            except ValueError:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# HAE Workout structure - no units/data wrapper, direct fields
class HAEWorkout(BaseModel):
    # Core workout metadata
    start: Optional[datetime] = Field(None, description="Workout start time")
    end: Optional[datetime] = Field(None, description="Workout end time")
    duration: Optional[float] = Field(None, description="Workout duration")
    workoutType: Optional[str] = Field(None, description="Type of workout")
    location: Optional[str] = Field(None, description="Workout location")
    
    # Energy data
    activeEnergyBurned: Optional[Dict[str, Any]] = Field(None, description="Active energy burned data")
    activeEnergy: Optional[List[Dict[str, Any]]] = Field(None, description="Active energy timeseries")
    
    # Heart rate data
    heartRateRecovery: Optional[List[Dict[str, Any]]] = Field(None, description="Heart rate recovery data")
    heartRateData: Optional[List[Dict[str, Any]]] = Field(None, description="Heart rate timeseries")
    
    # Intensity data
    intensity: Optional[Dict[str, Any]] = Field(None, description="Workout intensity data")
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional workout metadata")
    source: Optional[str] = Field(None, description="Data source")
    
    @validator('start', 'end', pre=True)
    def parse_swift_datetime(cls, v):
        """Parse Swift/ObjC datetime format: '2025-07-01 06:05:54 +0200'"""
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z")
            except ValueError:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# Discriminator function to choose between CommonMetric and SleepMetric
def metric_discriminator(v: Any) -> str:
    if isinstance(v, dict) and v.get('name') == 'sleep_analysis':
        return 'sleep'
    return 'common'

# Define the discriminated union type with proper tags
MetricUnion = Annotated[
    Union[
        Annotated[CommonMetric, Tag('common')],
        Annotated[SleepMetric, Tag('sleep')]
    ],
    Discriminator(metric_discriminator)
]

class DataNode(BaseModel):
    metrics: List[MetricUnion] = Field(default=[], description="Health metrics with discriminated union")
    workouts: List[HAEWorkout] = Field(default=[], description="Workout data from Health Auto Export")

class HealthAutoExportPayload(BaseModel):
    data: DataNode = Field(..., description="Health Auto Export data wrapper")
    request_id: Optional[str] = Field(None, description="Request ID for idempotency tracking")

class WebhookResponse(BaseModel):
    success: bool
    message: str
    processed: Dict[str, int]  # Now includes metrics, sleep, workouts counts
    request_hash: str

# Optional authentication function
def validate_api_key(x_api_key: str = None) -> bool:
    """Optionally verify the API key from Health Auto Export"""
    if not x_api_key:
        return False  # No key provided, but allow request
    
    expected_key = db.secrets.get("HEALTH_AUTO_EXPORT_API_KEY")
    if not expected_key:
        return False  # No key configured, but allow request
    
    return x_api_key == expected_key

# Database helper functions
async def get_db_connection():
    """Get database connection based on environment"""
    if mode == Mode.PROD:
        database_url = db.secrets.get("DATABASE_URL_PROD")
    else:
        database_url = db.secrets.get("DATABASE_URL_DEV")
    
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    return await asyncpg.connect(database_url)

async def insert_health_metrics(conn: asyncpg.Connection, user_id: str, metrics: List[CommonMetric]) -> int:
    """Insert health metrics data with duplicate prevention"""
    inserted_count = 0
    
    for metric in metrics:
        for data_point in metric.data:
            try:
                await conn.execute(
                    """
                    INSERT INTO health_metrics (user_id, metric_name, metric_unit, timestamp, value)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id, metric_name, timestamp) DO NOTHING
                    """,
                    user_id,
                    metric.name,
                    metric.units,
                    data_point.date,
                    data_point.qty
                )
                inserted_count += 1
            except Exception as e:
                print(f"Error inserting health metric {metric.name} for user {user_id}: {e}")
                # Continue processing other metrics
                continue
    
    return inserted_count

async def insert_sleep_metrics_from_analysis(conn: asyncpg.Connection, user_id: str, sleep_metric: SleepMetric) -> int:
    """Insert sleep metrics from sleep_analysis metric with rich sleep data"""
    inserted_count = 0
    
    for sleep_entry in sleep_metric.data:
        try:
            # Use the rich sleep data from Health Auto Export
            total_sleep_minutes = int(sleep_entry.totalSleep * 60)
            awake_minutes = int(sleep_entry.awake * 60)
            core_minutes = int(sleep_entry.core * 60)
            deep_minutes = int(sleep_entry.deep * 60)
            rem_minutes = int(sleep_entry.rem * 60)
            
            # Calculate efficiency
            total_time_in_bed = int((sleep_entry.sleepEnd - sleep_entry.sleepStart).total_seconds() / 60)
            efficiency = (total_sleep_minutes / total_time_in_bed * 100) if total_time_in_bed > 0 else 0
            
            await conn.execute(
                """
                INSERT INTO sleep_metrics (
                    user_id, start_time, end_time, duration_total_minutes,
                    duration_in_bed_minutes, duration_awake_minutes, 
                    duration_light_minutes, duration_deep_minutes, 
                    duration_rem_minutes, efficiency
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id, start_time) DO NOTHING
                """,
                user_id,
                sleep_entry.sleepStart,
                sleep_entry.sleepEnd,
                total_sleep_minutes,
                total_time_in_bed,
                awake_minutes,
                core_minutes,  # Using core as light sleep
                deep_minutes,
                rem_minutes,
                efficiency
            )
            inserted_count += 1
        except Exception as e:
            print(f"Error inserting sleep data for user {user_id} at {sleep_entry.date}: {e}")
            continue
    
    return inserted_count

async def insert_workout_metrics(conn: asyncpg.Connection, user_id: str, workouts: List[HAEWorkout]) -> int:
    """Insert workout data from HAE with proper structure handling."""
    inserted_count = 0
    
    for workout in workouts:
        try:
            # Extract calories from activeEnergyBurned or activeEnergy
            total_calories = 0
            
            if workout.activeEnergyBurned and isinstance(workout.activeEnergyBurned, dict):
                # Single energy value
                total_calories = workout.activeEnergyBurned.get('qty', 0)
            elif workout.activeEnergy and isinstance(workout.activeEnergy, list):
                # Sum timeseries values
                for energy_point in workout.activeEnergy:
                    if isinstance(energy_point, dict) and 'qty' in energy_point:
                        total_calories += energy_point['qty']
            
            # Calculate workout duration in minutes
            duration_minutes = 0
            if workout.start and workout.end:
                duration_minutes = (workout.end - workout.start).total_seconds() / 60
            elif workout.duration:
                duration_minutes = workout.duration
            
            # Use workout start time or current time
            workout_timestamp = workout.start or datetime.now(timezone.utc)
            
            # Insert workout calories
            if total_calories > 0:
                await conn.execute(
                    """
                    INSERT INTO health_metrics (user_id, metric_name, metric_unit, timestamp, value)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id, metric_name, timestamp) DO NOTHING
                    """,
                    user_id,
                    'workout',
                    'cal',
                    workout_timestamp,
                    total_calories
                )
                inserted_count += 1
                print(f"✅ Inserted workout: {total_calories} cal, {duration_minutes:.1f} min at {workout_timestamp}")
            
        except Exception as e:
            print(f"❌ Error inserting workout data for user {user_id}: {e}")
            continue
    
    return inserted_count

@router.post("/hae/webhook/{user_id}")
async def health_auto_export_webhook(
    user_id: str,
    request: Request
) -> WebhookResponse:
    """
    Webhook endpoint to receive health data from Health Auto Export.
    
    Processes discriminated metrics (sleep vs common) and workout data, inserting into
    respective database tables with duplicate prevention using ON CONFLICT DO NOTHING.
    
    Handles Swift/ObjC datetime format parsing and rich sleep data structure.
    """
    
    print(f"🔥 WEBHOOK CALLED: user_id={user_id}")
    
    try:
        # Get raw request body first
        raw_body = await request.body()
        print(f"📜 RAW REQUEST BODY: {raw_body.decode('utf-8')}")
        
        # Parse JSON manually to see structure
        import json
        raw_payload = json.loads(raw_body)
        print(f"🗺 PARSED JSON STRUCTURE: {json.dumps(raw_payload, indent=2)}")
        
        # Now try to validate with Pydantic
        try:
            payload = HealthAutoExportPayload(**raw_payload)
            print(f"✅ Pydantic validation successful")
        except Exception as validation_error:
            print(f"❌ PYDANTIC VALIDATION ERROR: {validation_error}")
            print(f"❌ VALIDATION ERROR TYPE: {type(validation_error)}")
            
            # Try to validate individual parts
            if 'data' in raw_payload:
                data_node = raw_payload['data']
                print(f"🔍 DATA NODE: {json.dumps(data_node, indent=2)}")
                
                if 'workouts' in data_node and data_node['workouts']:
                    print(f"💪 WORKOUT DATA: {json.dumps(data_node['workouts'], indent=2)}")
                    
                    # Try to validate workout structure
                    for i, workout in enumerate(data_node['workouts']):
                        print(f"🔍 Workout {i}: {json.dumps(workout, indent=2)}")
                        if 'data' in workout:
                            for j, workout_point in enumerate(workout['data']):
                                print(f"🔍 Workout {i} Point {j}: {json.dumps(workout_point, indent=2)}")
            
            raise HTTPException(status_code=422, detail=f"Validation error: {validation_error}")
        
        # Debug: Print raw payload first
        print("❏ RAW HAE PAYLOAD:", payload.model_dump_json(indent=2))
        
        processed_counts = {
            "metrics": 0,
            "sleep": 0,
            "workouts": 0
        }
        
        print("🔐 Connecting to database...")
        # Get database connection
        conn = await get_db_connection()
        print("✅ Database connected successfully")
        
        try:
            # Process health metrics with proper type discrimination
            print(f"📊 Processing {len(payload.data.metrics)} metrics...")
            for i, metric in enumerate(payload.data.metrics):
                print(f"🔍 Metric {i+1}: name={metric.name}, type={type(metric).__name__}")
                
                try:
                    if metric.name == "sleep_analysis":
                        # Handle sleep analysis as sleep data (should be SleepMetric)
                        sleep_inserted = await insert_sleep_metrics_from_analysis(conn, user_id, metric)
                        processed_counts["sleep"] += sleep_inserted
                        print(f"✅ Inserted {sleep_inserted} sleep sessions from sleep_analysis metric")
                    else:
                        # Handle as regular health metrics (should be CommonMetric)
                        metrics_inserted = await insert_health_metrics(conn, user_id, [metric])
                        processed_counts["metrics"] += metrics_inserted
                        print(f"✅ Inserted {metrics_inserted} data points for metric {metric.name}")
                        
                except Exception as metric_error:
                    print(f"❌ Error processing metric {metric.name}: {metric_error}")
                    continue
            
            # Process workout data
            print(f"💪 Processing {len(payload.data.workouts)} workouts...")
            if payload.data.workouts:
                try:
                    workouts_inserted = await insert_workout_metrics(conn, user_id, payload.data.workouts)
                    processed_counts["workouts"] = workouts_inserted
                    print(f"✅ Inserted {workouts_inserted} workout data points")
                except Exception as workout_error:
                    print(f"❌ Error processing workouts: {workout_error}")
            
            print(f"✅ Successfully processed all HAE data: {processed_counts}")
            return WebhookResponse(
                success=True,
                message=f"Successfully processed health data for user {user_id}",
                processed=processed_counts,
                request_hash="success"
            )
            
        finally:
            await conn.close()
            print("🔐 Database connection closed")
            
    except Exception as global_error:
        print(f"❌ GLOBAL WEBHOOK ERROR: {global_error}")
        print(f"❌ GLOBAL ERROR TYPE: {type(global_error)}")
        import traceback
        print(f"❌ FULL GLOBAL TRACEBACK: {traceback.format_exc()}")
        
        return WebhookResponse(
            success=False,
            message=f"Failed to process health data: {str(global_error)}",
            processed={"metrics": 0, "sleep": 0, "workouts": 0},
            request_hash="error"
        )
