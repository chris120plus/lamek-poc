import { CheckHealthData, GetHealthInsightsData, GetMetricsData, HealthAutoExportWebhookData } from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Webhook endpoint to receive health data from Health Auto Export. Processes discriminated metrics (sleep vs common) and workout data, inserting into respective database tables with duplicate prevention using ON CONFLICT DO NOTHING. Handles Swift/ObjC datetime format parsing and rich sleep data structure.
   * @tags dbtn/module:ingest
   * @name health_auto_export_webhook
   * @summary Health Auto Export Webhook
   * @request POST:/routes/hae/webhook/{user_id}
   */
  export namespace health_auto_export_webhook {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = HealthAutoExportWebhookData;
  }

  /**
   * @description Query health metrics data with proper metric mapping and pagination. **Metric Mapping:** - sleep: Returns duration in hours from sleep_metrics table - heart_rate_variability: Returns HRV values in ms from health_metrics - workout: Returns workout values from health_metrics (treated as calories for display) **Authentication:** - Requires valid authentication token - Returns data only for the authenticated user **Pagination:** - Default limit: 1000, Maximum: 5000 - Results ordered by timestamp ASC
   * @tags dbtn/module:metrics, dbtn/hasAuth
   * @name get_metrics
   * @summary Get Metrics
   * @request GET:/routes/metrics
   */
  export namespace get_metrics {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMetricsData;
  }

  /**
   * @description Generate AI-powered holistic health insights based on HRV, sleep, and workout data. **Analysis Logic:** - Recent Period: Last `range_hours` hours from now - Previous Period: Same duration before recent period (for comparison) **Metrics Analyzed:** - HRV: Average, min, max values and percentage change - Sleep: Average duration and efficiency - Workout: Total calories burned and session count **AI Integration:** - Uses Venice AI to provide personalized health recommendations - Compares current period vs previous period trends - Provides actionable insights for optimization **Authentication:** - Requires valid authentication token - Returns insights only for the authenticated user
   * @tags dbtn/module:insights, dbtn/hasAuth
   * @name get_health_insights
   * @summary Get Health Insights
   * @request GET:/routes/insights
   */
  export namespace get_health_insights {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Range Hours
       * Analysis time window in hours (1-168)
       * @min 1
       * @max 168
       * @default 24
       */
      range_hours?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetHealthInsightsData;
  }
}
