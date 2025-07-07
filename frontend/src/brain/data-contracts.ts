/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** InsightsResponse */
export interface InsightsResponse {
  /**
   * Period Hours
   * Time period analyzed
   */
  period_hours: number;
  /** Current period statistics */
  current: PeriodData;
  /** Previous period statistics */
  previous: PeriodData;
  /** Changes between periods */
  changes: MetricChanges;
  /**
   * Insight
   * AI-generated health insight
   */
  insight: string;
}

/** MetricChanges */
export interface MetricChanges {
  /**
   * Hrv Change Percent
   * HRV percentage change
   */
  hrv_change_percent: number;
  /**
   * Sleep Duration Change
   * Sleep duration change in hours
   */
  sleep_duration_change: number;
  /**
   * Workout Calorie Change
   * Workout calorie change
   */
  workout_calorie_change: number;
}

/** MetricDataPoint */
export interface MetricDataPoint {
  /**
   * Timestamp
   * Timestamp of the measurement
   * @format date-time
   */
  timestamp: string;
  /**
   * Value
   * Metric value
   */
  value: number;
}

/** MetricStats */
export interface MetricStats {
  /**
   * Avg
   * Average value
   */
  avg: number;
  /**
   * Min
   * Minimum value
   */
  min?: number | null;
  /**
   * Max
   * Maximum value
   */
  max?: number | null;
}

/** MetricsResponse */
export interface MetricsResponse {
  /**
   * Data
   * Array of metric data points
   */
  data: MetricDataPoint[];
  /**
   * Total Count
   * Total number of records matching query
   */
  total_count: number;
}

/** PeriodData */
export interface PeriodData {
  /** HRV statistics */
  hrv: MetricStats;
  /** Sleep statistics */
  sleep: SleepStats;
  /** Workout statistics */
  workout: WorkoutStats;
}

/** SleepStats */
export interface SleepStats {
  /**
   * Avg Duration Hours
   * Average sleep duration in hours
   */
  avg_duration_hours: number;
  /**
   * Avg Efficiency
   * Average sleep efficiency percentage
   */
  avg_efficiency?: number | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** WebhookResponse */
export interface WebhookResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Processed */
  processed: Record<string, number>;
  /** Request Hash */
  request_hash: string;
}

/** WorkoutStats */
export interface WorkoutStats {
  /**
   * Total Calories
   * Total calories burned
   */
  total_calories: number;
  /**
   * Session Count
   * Number of workout sessions
   */
  session_count: number;
}

export type CheckHealthData = HealthResponse;

export interface HealthAutoExportWebhookParams {
  /** User Id */
  userId: string;
}

export type HealthAutoExportWebhookData = WebhookResponse;

export type HealthAutoExportWebhookError = HTTPValidationError;

export interface GetMetricsParams {
  /**
   * Metric
   * Metric type to query
   */
  metric: "heart_rate_variability" | "workout" | "sleep";
  /**
   * From
   * Start date for range query (ISO datetime)
   */
  from?: string | null;
  /**
   * To
   * End date for range query (ISO datetime)
   */
  to?: string | null;
  /**
   * Limit
   * Maximum records to return
   * @min 1
   * @max 5000
   * @default 1000
   */
  limit?: number;
}

export type GetMetricsData = MetricsResponse;

export type GetMetricsError = HTTPValidationError;

export interface GetHealthInsightsParams {
  /**
   * Range Hours
   * Analysis time window in hours (1-168)
   * @min 1
   * @max 168
   * @default 24
   */
  range_hours?: number;
}

export type GetHealthInsightsData = InsightsResponse;

export type GetHealthInsightsError = HTTPValidationError;
