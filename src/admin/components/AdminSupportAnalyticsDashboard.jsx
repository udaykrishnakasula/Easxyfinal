import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  HelpCircle,
  Bot,
  Star,
  Download,
  Filter,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import { EasyXCard, EasyXButton, EasyXLoader } from "@/design/EasyX";
import {
  useAdminSupportAnalytics,
  exportAdminSupportAnalytics,
} from "@/admin/adminApi";
import { SupportCategoryBadge, SupportPriorityBadge, SupportStatusBadge } from "@/user/components/SupportStatusBadge";

dayjs.extend(relativeTime);

export default function AdminSupportAnalyticsDashboard({ onSelectTicket }) {
  const [range, setRange] = useState("30D"); // "TODAY" | "7D" | "30D" | "CUSTOM" | "ALL"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const queryParams = {
    range,
    ...(range === "CUSTOM" && fromDate ? { from_date: fromDate } : {}),
    ...(range === "CUSTOM" && toDate ? { to_date: toDate } : {}),
  };

  const { data, isLoading, isError, refetch, isFetching } = useAdminSupportAnalytics(queryParams);
  const analytics = data?.analytics;

  const handleExport = async (format = "csv") => {
    try {
      setIsExporting(true);
      await exportAdminSupportAnalytics({
        range,
        ...(range === "CUSTOM" && fromDate ? { from_date: fromDate } : {}),
        ...(range === "CUSTOM" && toDate ? { to_date: toDate } : {}),
        format,
      });
      toast.success(`Support analytics exported successfully (${format.toUpperCase()})`);
    } catch (err) {
      toast.error("Failed to export support analytics.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-support-analytics-dashboard">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02] border border-white/10 rounded-ex p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-ex-lav-500/20 text-ex-lav-300 border border-ex-lav-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Support Analytics & Executive Intelligence
              </h2>
              <p className="text-xs text-ex-muted">
                Real-time metrics, SLA performance, category distribution, FAQ deflection, and CSAT ratings
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Presets */}
          <div className="flex items-center bg-black/40 p-1 rounded-ex border border-white/10">
            {[
              { id: "TODAY", label: "Today" },
              { id: "7D", label: "7 Days" },
              { id: "30D", label: "30 Days" },
              { id: "ALL", label: "All Time" },
              { id: "CUSTOM", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRange(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  range === p.id
                    ? "bg-ex-lav-500 text-white shadow-sm"
                    : "text-ex-muted hover:text-white hover:bg-white/5"
                }`}
                data-testid={`date-filter-preset-${p.id.toLowerCase()}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {range === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-ex border border-white/10">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 bg-transparent text-xs text-white px-2 focus:outline-none"
                data-testid="analytics-from-date"
              />
              <span className="text-xs text-ex-muted">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 bg-transparent text-xs text-white px-2 focus:outline-none"
                data-testid="analytics-to-date"
              />
            </div>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ex-btn ex-btn-ghost h-9 w-9 p-0 flex items-center justify-center border border-white/10 hover:border-white/20"
            title="Refresh Analytics"
          >
            <RefreshCw className={`h-4 w-4 text-ex-muted ${isFetching ? "animate-spin text-ex-lav-400" : ""}`} />
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1.5">
            <EasyXButton
              variant="outline"
              onClick={() => handleExport("csv")}
              loading={isExporting}
              className="h-9 px-3 text-xs border-white/10 hover:border-ex-lav-400/40"
              data-testid="export-support-analytics-csv-btn"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
              Export CSV
            </EasyXButton>
            <EasyXButton
              variant="outline"
              onClick={() => handleExport("json")}
              loading={isExporting}
              className="h-9 px-3 text-xs border-white/10 hover:border-ex-lav-400/40"
              data-testid="export-support-analytics-json-btn"
            >
              <FileJson className="mr-1.5 h-3.5 w-3.5 text-sky-400" />
              JSON
            </EasyXButton>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <EasyXLoader size="lg" />
          <p className="mt-3 text-xs text-ex-muted animate-pulse">Aggregating support performance metrics...</p>
        </div>
      ) : isError || !analytics ? (
        <EasyXCard className="p-8 text-center border-rose-500/20 bg-rose-500/5">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <h3 className="text-sm font-bold text-white">Failed to Load Support Analytics</h3>
          <p className="text-xs text-ex-muted mt-1">Please try refreshing or adjusting your date range filter.</p>
          <EasyXButton variant="primary" onClick={() => refetch()} className="mt-4 h-8 px-4 text-xs">
            Retry
          </EasyXButton>
        </EasyXCard>
      ) : (
        <>
          {/* SECTION 1: SUPPORT OVERVIEW METRICS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ex-lav-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-ex-lav-400" />
                1. Support Volume & Status Overview
              </h3>
              <span className="text-[11px] text-ex-muted">
                Reporting Period: {analytics.filter.from_date} &rarr; {analytics.filter.to_date}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
              <div className="rounded-ex border border-white/10 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-ex-muted uppercase">Total Tickets</div>
                <div className="text-2xl font-black text-white mt-1" data-testid="metric-total-tickets">
                  {analytics.overview.total_tickets}
                </div>
                <div className="text-[10px] text-ex-muted mt-1">All in date range</div>
              </div>

              <div className="rounded-ex border border-sky-500/20 bg-sky-500/[0.04] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-sky-300 uppercase">Open</div>
                <div className="text-2xl font-black text-sky-200 mt-1" data-testid="metric-open-tickets">
                  {analytics.overview.open}
                </div>
                <div className="text-[10px] text-sky-400/70 mt-1">Newly submitted</div>
              </div>

              <div className="rounded-ex border border-indigo-500/20 bg-indigo-500/[0.04] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-indigo-300 uppercase">In Progress</div>
                <div className="text-2xl font-black text-indigo-200 mt-1" data-testid="metric-in-progress-tickets">
                  {analytics.overview.in_progress}
                </div>
                <div className="text-[10px] text-indigo-400/70 mt-1">Under investigation</div>
              </div>

              <div className="rounded-ex border border-amber-500/20 bg-amber-500/[0.04] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-amber-300 uppercase">Wait for User</div>
                <div className="text-2xl font-black text-amber-200 mt-1" data-testid="metric-waiting-user-tickets">
                  {analytics.overview.waiting_for_user}
                </div>
                <div className="text-[10px] text-amber-400/70 mt-1">Staff replied</div>
              </div>

              <div className="rounded-ex border border-purple-500/20 bg-purple-500/[0.04] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-purple-300 uppercase">Wait for Admin</div>
                <div className="text-2xl font-black text-purple-200 mt-1" data-testid="metric-waiting-admin-tickets">
                  {analytics.overview.waiting_for_admin}
                </div>
                <div className="text-[10px] text-purple-400/70 mt-1">Action pending</div>
              </div>

              <div className="rounded-ex border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-emerald-300 uppercase">Resolved</div>
                <div className="text-2xl font-black text-emerald-200 mt-1" data-testid="metric-resolved-tickets">
                  {analytics.overview.resolved}
                </div>
                <div className="text-[10px] text-emerald-400/70 mt-1">Solutions delivered</div>
              </div>

              <div className="rounded-ex border border-white/10 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-ex-muted uppercase">Closed</div>
                <div className="text-2xl font-black text-zinc-300 mt-1" data-testid="metric-closed-tickets">
                  {analytics.overview.closed}
                </div>
                <div className="text-[10px] text-ex-muted mt-1">Archived & completed</div>
              </div>

              <div className="rounded-ex border border-rose-500/30 bg-rose-500/[0.07] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-rose-300 uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-400" /> Overdue
                </div>
                <div className="text-2xl font-black text-rose-200 mt-1" data-testid="metric-overdue-tickets">
                  {analytics.overview.overdue}
                </div>
                <div className="text-[10px] text-rose-400/70 mt-1">SLA deadline breached</div>
              </div>

              <div className="rounded-ex border border-red-600/30 bg-red-600/[0.08] p-3.5 flex flex-col justify-between">
                <div className="text-[11px] font-medium text-red-300 uppercase flex items-center gap-1">
                  <Flame className="h-3 w-3 text-red-400" /> Urgent
                </div>
                <div className="text-2xl font-black text-red-200 mt-1" data-testid="metric-urgent-tickets">
                  {analytics.overview.urgent}
                </div>
                <div className="text-[10px] text-red-400/70 mt-1">Critical severity</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: TIME METRICS & SLA PERFORMANCE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ex-lav-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-ex-lav-400" />
                2. Response Time & Resolution Efficiency
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <EasyXCard className="p-4 border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ex-muted">Avg First-Response Time</span>
                  <Clock className="h-4 w-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2" data-testid="metric-avg-first-response">
                  {analytics.time_metrics.avg_first_response_formatted}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-ex-muted">
                  <span>Median: <strong className="text-sky-300">{analytics.time_metrics.median_first_response_formatted}</strong></span>
                  <span>{analytics.time_metrics.total_first_responses_count} replies</span>
                </div>
              </EasyXCard>

              <EasyXCard className="p-4 border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ex-muted">Avg Resolution Time</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2" data-testid="metric-avg-resolution">
                  {analytics.time_metrics.avg_resolution_formatted}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-ex-muted">
                  <span>Median: <strong className="text-emerald-300">{analytics.time_metrics.median_resolution_formatted}</strong></span>
                  <span>{analytics.time_metrics.total_resolved_count} resolved</span>
                </div>
              </EasyXCard>

              <EasyXCard className="p-4 border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ex-muted">SLA Compliance Rate</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2" data-testid="metric-sla-compliance">
                  {analytics.time_metrics.sla_compliance_rate_percent}%
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-ex-muted flex items-center justify-between">
                  <span>Target: &gt;95.0%</span>
                  <span className="text-emerald-400/80 font-medium">Within Target</span>
                </div>
              </EasyXCard>

              <EasyXCard className="p-4 border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ex-muted">Overdue Breach Count</span>
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-400 mt-2" data-testid="metric-overdue-count">
                  {analytics.time_metrics.overdue_tickets_count}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-ex-muted flex items-center justify-between">
                  <span>Auto-escalations: <strong className="text-amber-300">{analytics.overview.escalated}</strong></span>
                  <span className="text-rose-400/80 font-medium">Needs Attention</span>
                </div>
              </EasyXCard>
            </div>
          </div>

          {/* SECTION 3 & 4: CATEGORY ANALYTICS & PRIORITY ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Analytics (7 cols) */}
            <EasyXCard className="lg:col-span-7 p-4 sm:p-5 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ex-lav-300 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-ex-lav-400" />
                    3. Ticket Volume by Category
                  </h3>
                  <p className="text-[11px] text-ex-muted mt-0.5">
                    Distribution of user inquiries across functional modules
                  </p>
                </div>
                <span className="text-xs font-bold text-white">
                  {analytics.overview.total_tickets} Total
                </span>
              </div>

              <div className="space-y-3" data-testid="category-analytics-list">
                {analytics.category_analytics.map((c) => (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <SupportCategoryBadge category={c.category} />
                        <span className="text-zinc-300 font-medium">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-ex-muted">
                        <span>{c.count} tickets ({c.percentage}%)</span>
                        <span className="text-[10px] text-emerald-400">Avg res: {c.avg_resolution_formatted}</span>
                      </div>
                    </div>
                    {/* Progress visual bar */}
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ex-lav-500 to-ex-lav-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(c.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </EasyXCard>

            {/* Priority Analytics (5 cols) */}
            <EasyXCard className="lg:col-span-5 p-4 sm:p-5 border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ex-lav-300 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-ex-lav-400" />
                      4. Priority Queue Analytics
                    </h3>
                    <p className="text-[11px] text-ex-muted mt-0.5">
                      Severity breakdown and triage response times
                    </p>
                  </div>
                </div>

                <div className="space-y-3" data-testid="priority-analytics-list">
                  {analytics.priority_analytics.map((p) => (
                    <div
                      key={p.priority}
                      className="p-3 rounded-ex bg-white/[0.02] border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <SupportPriorityBadge priority={p.priority} />
                        <div>
                          <div className="text-xs font-bold text-white">{p.label} Priority</div>
                          <div className="text-[11px] text-ex-muted">
                            Avg Response: <strong className="text-zinc-200">{p.avg_response_formatted || "15m"}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-white">
                          {p.count} <span className="text-xs font-normal text-ex-muted">({p.percentage}%)</span>
                        </div>
                        {p.overdue_count > 0 ? (
                          <span className="text-[10px] text-rose-400 font-semibold">
                            {p.overdue_count} overdue
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            0 overdue
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA Target Reference Box */}
              <div className="mt-4 p-3 rounded-ex bg-black/30 border border-white/5 text-[11px] text-ex-muted space-y-1">
                <div className="font-semibold text-zinc-300">Triage SLA Targets:</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>• Urgent: 30m response / 2h res</div>
                  <div>• High: 1h response / 4h res</div>
                  <div>• Normal: 2h response / 8h res</div>
                  <div>• Low: 4h response / 24h res</div>
                </div>
              </div>
            </EasyXCard>
          </div>

          {/* SECTION 5 & 6: FAQ ANALYTICS & AI SUPPORT ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FAQ Analytics */}
            <EasyXCard className="p-4 sm:p-5 border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      5. Help Center & FAQ Analytics
                    </h3>
                    <p className="text-[11px] text-ex-muted">Knowledge base search behavior & self-service deflection</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400" data-testid="faq-deflection-rate">
                    {analytics.faq_analytics.faq_deflection_estimate_pct}% Deflection
                  </span>
                  <div className="text-[10px] text-ex-muted">{analytics.faq_analytics.total_views} Total Views</div>
                </div>
              </div>

              {/* Most Viewed FAQs */}
              <div>
                <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Most Viewed Articles
                </h4>
                <div className="space-y-1.5" data-testid="faq-most-viewed-list">
                  {analytics.faq_analytics.most_viewed_articles.length === 0 ? (
                    <div className="text-xs text-ex-muted py-2">No article views recorded yet.</div>
                  ) : (
                    analytics.faq_analytics.most_viewed_articles.map((art, idx) => (
                      <div
                        key={art.id || idx}
                        className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div className="truncate pr-2 text-zinc-200 font-medium">
                          {idx + 1}. {art.title}
                        </div>
                        <span className="shrink-0 text-emerald-400 font-bold text-[11px]">
                          {art.views_count} views
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Searched Queries & Unmatched Searches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-sky-400" /> Top Searched Questions
                  </h4>
                  <div className="space-y-1">
                    {analytics.faq_analytics.top_searched_queries.length === 0 ? (
                      <div className="text-[11px] text-ex-muted">No search logs recorded.</div>
                    ) : (
                      analytics.faq_analytics.top_searched_queries.slice(0, 4).map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-white/5"
                        >
                          <span className="text-zinc-300 truncate">"{q.query}"</span>
                          <span className="text-ex-muted text-[10px] shrink-0 font-medium">
                            {q.count}x
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-rose-400" /> Searches with 0 Results
                  </h4>
                  <div className="space-y-1">
                    {analytics.faq_analytics.unmatched_searches.length === 0 ? (
                      <div className="text-[11px] text-emerald-400/80">None — All queries matched!</div>
                    ) : (
                      analytics.faq_analytics.unmatched_searches.slice(0, 4).map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-white/5"
                        >
                          <span className="text-rose-200/90 truncate">"{q.query}"</span>
                          <span className="text-rose-400 text-[10px] shrink-0 font-bold">
                            {q.count} missed
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </EasyXCard>

            {/* AI Support Analytics */}
            <EasyXCard className="p-4 sm:p-5 border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      6. AI Support Assistant Analytics
                    </h3>
                    <p className="text-[11px] text-ex-muted">Automated deflection & conversation outcomes</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    analytics.ai_analytics.is_ai_enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30"
                  }`}>
                    {analytics.ai_analytics.is_ai_enabled ? "AI Engine Active" : "AI Inactive"}
                  </span>
                </div>
              </div>

              {/* AI Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-ex bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-ex-muted uppercase">Conversations</div>
                  <div className="text-xl font-bold text-white mt-1" data-testid="metric-ai-conversations">
                    {analytics.ai_analytics.total_conversations}
                  </div>
                </div>

                <div className="p-3 rounded-ex bg-emerald-500/[0.04] border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-300 uppercase">Deflected/Resolved</div>
                  <div className="text-xl font-bold text-emerald-300 mt-1" data-testid="metric-ai-deflected">
                    {analytics.ai_analytics.ai_resolved_deflected}
                  </div>
                </div>

                <div className="p-3 rounded-ex bg-purple-500/[0.04] border border-purple-500/20">
                  <div className="text-[10px] text-purple-300 uppercase">Escalated to Staff</div>
                  <div className="text-xl font-bold text-purple-300 mt-1" data-testid="metric-ai-escalations">
                    {analytics.ai_analytics.ai_escalations}
                  </div>
                </div>

                <div className="p-3 rounded-ex bg-amber-500/[0.04] border border-amber-500/20">
                  <div className="text-[10px] text-amber-300 uppercase">Unanswered Qs</div>
                  <div className="text-xl font-bold text-amber-300 mt-1" data-testid="metric-ai-unanswered">
                    {analytics.ai_analytics.unanswered_questions}
                  </div>
                </div>
              </div>

              {/* AI Feedback & Quality */}
              <div className="p-3.5 rounded-ex bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">AI Response Satisfaction:</span>
                  <span className="font-bold text-sky-300">
                    {analytics.ai_analytics.satisfaction_rate_pct}% Positive ({analytics.ai_analytics.helpful_feedback_count} Helpful / {analytics.ai_analytics.unhelpful_feedback_count} Unhelpful)
                  </span>
                </div>
                <p className="text-[10px] text-ex-muted leading-relaxed">
                  <strong>Measurement Basis:</strong> {analytics.ai_analytics.disclaimer}
                </p>
              </div>
            </EasyXCard>
          </div>

          {/* SECTION 7: USER SATISFACTION (CSAT ⭐ 1–5) */}
          <EasyXCard className="p-4 sm:p-6 border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    7. User Satisfaction Analytics (CSAT ⭐ 1–5)
                  </h3>
                  <p className="text-xs text-ex-muted">
                    Post-resolution ratings and customer service sentiment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-ex border border-amber-500/20">
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-300 flex items-center justify-center gap-1" data-testid="metric-csat-avg-rating">
                    {analytics.satisfaction_analytics.average_rating}
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-amber-200/60 uppercase">Average Rating</div>
                </div>

                <div className="h-8 w-px bg-white/10" />

                <div className="text-center">
                  <div className="text-2xl font-black text-white" data-testid="metric-csat-total-ratings">
                    {analytics.satisfaction_analytics.total_ratings}
                  </div>
                  <div className="text-[10px] text-ex-muted uppercase">Total Ratings</div>
                </div>

                <div className="h-8 w-px bg-white/10" />

                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-400" data-testid="metric-csat-satisfaction-rate">
                    {analytics.satisfaction_analytics.satisfaction_rate_percent}%
                  </div>
                  <div className="text-[10px] text-emerald-400/60 uppercase">Satisfaction Rate</div>
                </div>
              </div>
            </div>

            {/* Rating Stars Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = analytics.satisfaction_analytics.rating_distribution[stars] || 0;
                const total = analytics.satisfaction_analytics.total_ratings || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div
                    key={stars}
                    className="p-3 rounded-ex bg-white/[0.02] border border-white/5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-amber-300">{stars}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <span className="text-white font-bold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stars >= 4
                            ? "bg-amber-400"
                            : stars === 3
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Low-Rated Tickets Review & Recent Feedback Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Low-Rated Tickets for QA Review */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Low-Rated Tickets (≤ 3 Stars)
                  </h4>
                  <span className="text-[11px] text-rose-400/80 font-medium">
                    {analytics.satisfaction_analytics.low_rated_tickets.length} tickets for QA
                  </span>
                </div>

                <div className="space-y-2" data-testid="low-rated-tickets-list">
                  {analytics.satisfaction_analytics.low_rated_tickets.length === 0 ? (
                    <div className="p-4 rounded-ex bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 text-center">
                      ⭐ No low-rated tickets in this period. Great performance!
                    </div>
                  ) : (
                    analytics.satisfaction_analytics.low_rated_tickets.slice(0, 4).map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => onSelectTicket && onSelectTicket(ticket.id)}
                        className="p-3 rounded-ex bg-rose-500/[0.04] border border-rose-500/20 hover:border-rose-500/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-zinc-300">
                              #{ticket.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="font-bold text-white truncate max-w-[200px]">
                              {ticket.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-rose-400">
                            <span>{ticket.rating}</span>
                            <Star className="h-3 w-3 fill-rose-400 text-rose-400" />
                          </div>
                        </div>

                        {ticket.rating_comment && (
                          <p className="text-xs text-rose-200/80 italic mt-1.5 line-clamp-2">
                            "{ticket.rating_comment}"
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-ex-muted mt-2 pt-1 border-t border-white/5">
                          <span>User: {ticket.user_name || ticket.user_email}</span>
                          <span>Assigned: {ticket.assigned_admin_name || "Unassigned"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent User Comments & Feedback */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-ex-lav-400" /> Recent User Feedback Comments
                </h4>

                <div className="space-y-2">
                  {analytics.satisfaction_analytics.recent_feedbacks.length === 0 ? (
                    <div className="p-4 rounded-ex bg-white/[0.02] border border-white/10 text-xs text-ex-muted text-center">
                      No written feedback comments submitted yet.
                    </div>
                  ) : (
                    analytics.satisfaction_analytics.recent_feedbacks.slice(0, 4).map((fb, idx) => (
                      <div
                        key={fb.ticket_id || idx}
                        className="p-3 rounded-ex bg-white/[0.02] border border-white/10"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{fb.user_name || "Customer"}</span>
                            <div className="flex items-center">
                              {[...Array(fb.rating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-ex-muted">
                            Ticket #{fb.ticket_id?.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 italic mt-1.5">
                          "{fb.rating_comment}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </EasyXCard>
        </>
      )}
    </div>
  );
}
