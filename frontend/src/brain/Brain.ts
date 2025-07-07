import {
  CheckHealthData,
  GetHealthInsightsData,
  GetHealthInsightsError,
  GetHealthInsightsParams,
  GetMetricsData,
  GetMetricsError,
  GetMetricsParams,
  HealthAutoExportWebhookData,
  HealthAutoExportWebhookError,
  HealthAutoExportWebhookParams,
} from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Webhook endpoint to receive health data from Health Auto Export. Processes discriminated metrics (sleep vs common) and workout data, inserting into respective database tables with duplicate prevention using ON CONFLICT DO NOTHING. Handles Swift/ObjC datetime format parsing and rich sleep data structure.
   *
   * @tags dbtn/module:ingest
   * @name health_auto_export_webhook
   * @summary Health Auto Export Webhook
   * @request POST:/routes/hae/webhook/{user_id}
   */
  health_auto_export_webhook = ({ userId, ...query }: HealthAutoExportWebhookParams, params: RequestParams = {}) =>
    this.request<HealthAutoExportWebhookData, HealthAutoExportWebhookError>({
      path: `/routes/hae/webhook/${userId}`,
      method: "POST",
      ...params,
    });

  /**
   * @description Query health metrics data with proper metric mapping and pagination. **Metric Mapping:** - sleep: Returns duration in hours from sleep_metrics table - heart_rate_variability: Returns HRV values in ms from health_metrics - workout: Returns workout values from health_metrics (treated as calories for display) **Authentication:** - Requires valid authentication token - Returns data only for the authenticated user **Pagination:** - Default limit: 1000, Maximum: 5000 - Results ordered by timestamp ASC
   *
   * @tags dbtn/module:metrics, dbtn/hasAuth
   * @name get_metrics
   * @summary Get Metrics
   * @request GET:/routes/metrics
   */
  get_metrics = (query: GetMetricsParams, params: RequestParams = {}) =>
    this.request<GetMetricsData, GetMetricsError>({
      path: `/routes/metrics`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * @description Generate AI-powered holistic health insights based on HRV, sleep, and workout data. **Analysis Logic:** - Recent Period: Last `range_hours` hours from now - Previous Period: Same duration before recent period (for comparison) **Metrics Analyzed:** - HRV: Average, min, max values and percentage change - Sleep: Average duration and efficiency - Workout: Total calories burned and session count **AI Integration:** - Uses Venice AI to provide personalized health recommendations - Compares current period vs previous period trends - Provides actionable insights for optimization **Authentication:** - Requires valid authentication token - Returns insights only for the authenticated user
   *
   * @tags dbtn/module:insights, dbtn/hasAuth
   * @name get_health_insights
   * @summary Get Health Insights
   * @request GET:/routes/insights
   */
  get_health_insights = (query: GetHealthInsightsParams, params: RequestParams = {}) =>
    this.request<GetHealthInsightsData, GetHealthInsightsError>({
      path: `/routes/insights`,
      method: "GET",
      query: query,
      ...params,
    });
}
