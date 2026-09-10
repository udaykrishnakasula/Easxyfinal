import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  Info,
  Layers,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  Terminal,
  Code2,
} from "lucide-react";
import { useAdminErrorFrequency } from "@/admin/adminApi";
import { EasyXCard, EasyXButton, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";
import ErrorDetailSidePanel from "./ErrorDetailSidePanel";

// Color palettes for Recharts bars
const SEVERITY_COLORS = {
  critical: "#EF4444", // Red-500
  error: "#F97316",    // Orange-500
  warning: "#F59E0B",  // Amber-500
  info: "#8B5CF6",     // Violet-500
};

const STATUS_COLORS = {
  unresolved: "#F43F5E", // Rose-500
  resolved: "#10B981",   // Emerald-500
};

// Custom interactive Recharts Tooltip
function CustomErrorTooltip({ active, payload, label, mode }) {
  if (!active || !payload || !Array.isArray(payload) || !payload.length || !payload[0]) return null;

  const dataPoint = payload?.[0]?.payload;
  if (!dataPoint) return null;

  return (
    <div className="rounded-xl bg-[#130E22]/95 backdrop-blur-md border border-white/15 p-3.5 shadow-2xl min-w-[240px] max-w-[320px] text-xs text-white z-50 pointer-events-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2.5">
        <div>
          <span className="font-bold text-white text-sm">{dataPoint.day_name}</span>
          <span className="text-ex-muted text-[11px] ml-1.5 font-mono">({dataPoint.formatted_date})</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white font-mono">
          {dataPoint.total} {dataPoint.total === 1 ? "Error" : "Errors"}
        </span>
      </div>

      {/* Breakdown per selected view mode */}
      {mode === "severity" && (
        <div className="space-y-1.5 mb-2.5">
          <div className="text-[11px] font-semibold text-ex-muted uppercase tracking-wider">
            Severity Breakdown
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center justify-between bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
              <span className="flex items-center gap-1 text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Critical:
              </span>
              <span className="font-bold font-mono text-red-300">{dataPoint.critical}</span>
            </div>
            <div className="flex items-center justify-between bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
              <span className="flex items-center gap-1 text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Error:
              </span>
              <span className="font-bold font-mono text-orange-300">{dataPoint.error}</span>
            </div>
            <div className="flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Warning:
              </span>
              <span className="font-bold font-mono text-amber-300">{dataPoint.warning}</span>
            </div>
            <div className="flex items-center justify-between bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
              <span className="flex items-center gap-1 text-purple-400">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Info:
              </span>
              <span className="font-bold font-mono text-purple-300">{dataPoint.info}</span>
            </div>
          </div>
        </div>
      )}

      {mode === "status" && (
        <div className="space-y-1.5 mb-2.5">
          <div className="text-[11px] font-semibold text-ex-muted uppercase tracking-wider">
            Resolution Status
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center justify-between bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Unresolved:
              </span>
              <span className="font-bold font-mono text-rose-300">{dataPoint.unresolved}</span>
            </div>
            <div className="flex items-center justify-between bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Resolved:
              </span>
              <span className="font-bold font-mono text-emerald-300">{dataPoint.resolved}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Error Signatures on this day */}
      {dataPoint.top_errors && dataPoint.top_errors.length > 0 && (
        <div className="border-t border-white/10 pt-2">
          <div className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
            Top Incident Signatures
          </div>
          <div className="space-y-1">
            {dataPoint.top_errors.map((err, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] text-white/90 bg-white/5 px-2 py-0.5 rounded font-mono truncate gap-2"
              >
                <span className="truncate" title={err.name}>
                  {err.name}
                </span>
                <span className="text-ex-lav-300 font-bold shrink-0">x{err.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-purple-300 text-center font-medium flex items-center justify-center gap-1">
        <Terminal className="h-3 w-3 text-purple-400" />
        <span>Click bar to open Stack Trace & Metadata side panel</span>
      </div>
    </div>
  );
}

export default function ErrorFrequencyVisualSummary({
  onSelectDay,
  onNavigateToLogs,
  onViewUserJourney,
  className = "",
}) {
  const [viewMode, setViewMode] = useState("severity"); // 'severity' | 'status' | 'volume'
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sidePanelDay, setSidePanelDay] = useState(null);

  const { data, isLoading, isFetching, refetch } = useAdminErrorFrequency(7);

  const summary = data?.summary || {
    total_7d: 0,
    daily_avg: 0,
    peak_day: "N/A",
    peak_date: "N/A",
    peak_count: 0,
    resolved_count_7d: 0,
    unresolved_count_7d: 0,
    resolution_rate_pct: 100,
    critical_count_7d: 0,
    error_count_7d: 0,
    warning_count_7d: 0,
    info_count_7d: 0,
  };

  const days = useMemo(() => data?.days || [], [data?.days]);

  // Selected Day Details for Drill-down
  const activeDay = useMemo(() => {
    if (!selectedDayKey) return days[days.length - 1] || null; // default to today
    return days.find((d) => d.date === selectedDayKey) || days[days.length - 1] || null;
  }, [days, selectedDayKey]);

  // Handler to select a day and open the side panel
  const handleOpenDayPanel = (targetDay) => {
    if (!targetDay) return;
    setSelectedDayKey(targetDay.date);
    setSidePanelDay(targetDay);
    setIsSidePanelOpen(true);
    if (onSelectDay) onSelectDay(targetDay);
  };

  return (
    <div
      id="error-frequency-visual-summary"
      className={`rounded-2xl bg-ex-surface border border-white/10 p-5 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Top Header & Telemetry Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 font-mono">
              Error Telemetry (Past 7 Days)
            </span>
            <span className="text-ex-muted text-xs">•</span>
            <span className="text-xs text-ex-muted">Daily Incident Frequency</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <span>7-Day Error Frequency & Spike Monitor</span>
          </h2>
        </div>

        {/* View Mode Switcher & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
            <button
              id="btn-view-severity"
              onClick={() => setViewMode("severity")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === "severity"
                  ? "bg-ex-accent text-ex-ink shadow-sm"
                  : "text-ex-muted hover:text-white"
              }`}
            >
              By Severity
            </button>
            <button
              id="btn-view-status"
              onClick={() => setViewMode("status")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === "status"
                  ? "bg-ex-accent text-ex-ink shadow-sm"
                  : "text-ex-muted hover:text-white"
              }`}
            >
              By Status
            </button>
            <button
              id="btn-view-volume"
              onClick={() => setViewMode("volume")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === "volume"
                  ? "bg-ex-accent text-ex-ink shadow-sm"
                  : "text-ex-muted hover:text-white"
              }`}
            >
              Total Volume
            </button>
          </div>

          <button
            id="btn-refresh-error-frequency"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ex-text flex items-center gap-1.5 transition"
            title="Refresh Error Frequency"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-ex-lav-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Total Errors (7d) */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-ex-muted">
            <span>7-Day Errors</span>
            <Bug className="h-3.5 w-3.5 text-red-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1 font-mono">
            {summary.total_7d}
          </div>
          <div className="text-[11px] text-red-400/90 mt-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {summary.critical_count_7d} Critical / {summary.error_count_7d} Standard
          </div>
        </div>

        {/* Daily Average */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-ex-muted">
            <span>Daily Average</span>
            <Activity className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1 font-mono">
            {summary.daily_avg}{" "}
            <span className="text-xs font-normal text-ex-muted font-sans">/ day</span>
          </div>
          <div className="text-[11px] text-amber-400/90 mt-0.5">
            {summary.warning_count_7d} warnings logged
          </div>
        </div>

        {/* Peak Spike Day */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-ex-muted">
            <span>Peak Incident Day</span>
            <Flame className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-1">
            {summary.peak_day}{" "}
            <span className="text-xs font-normal text-ex-muted font-mono">
              ({summary.peak_count} errs)
            </span>
          </div>
          <div className="text-[11px] text-orange-400/90 mt-0.5 truncate">
            {summary.peak_date}
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center justify-between text-xs text-ex-muted">
            <span>7-Day Resolution</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
            {summary.resolution_rate_pct}%
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-0.5">
            {summary.resolved_count_7d} of {summary.total_7d} resolved
          </div>
        </div>
      </div>

      {/* Main Recharts Bar Chart Area */}
      <div className="bg-black/20 rounded-xl p-3 border border-white/5">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <EasyXLoader text="Compiling 7-day error metrics..." />
          </div>
        ) : days.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <EasyXEmptyState
              icon={CheckCircle2}
              title="No Errors Logged in Past 7 Days"
              description="Your application telemetry shows zero unhandled crashes or API failures across the last 7 days."
            />
          </div>
        ) : (
          <div>
            <div className="h-64 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={days}
                  margin={{ top: 16, right: 12, left: -20, bottom: 4 }}
                  onClick={(e) => {
                    const clicked = e?.activePayload?.[0]?.payload;
                    if (clicked) {
                      handleOpenDayPanel(clicked);
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.07)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="formatted_date"
                    stroke="#9E92B8"
                    tick={{ fill: "#9E92B8", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#9E92B8"
                    tick={{ fill: "#9E92B8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  />
                  <Tooltip
                    content={<CustomErrorTooltip mode={viewMode} />}
                    cursor={{ fill: "rgba(255, 255, 255, 0.08)", radius: 4 }}
                  />

                  {/* Mode: BY SEVERITY (Stacked Bars) */}
                  {viewMode === "severity" && (
                    <>
                      <Bar
                        dataKey="critical"
                        name="Critical"
                        stackId="severity"
                        fill={SEVERITY_COLORS.critical}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                      <Bar
                        dataKey="error"
                        name="Error"
                        stackId="severity"
                        fill={SEVERITY_COLORS.error}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                      <Bar
                        dataKey="warning"
                        name="Warning"
                        stackId="severity"
                        fill={SEVERITY_COLORS.warning}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                      <Bar
                        dataKey="info"
                        name="Info"
                        stackId="severity"
                        fill={SEVERITY_COLORS.info}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                    </>
                  )}

                  {/* Mode: BY RESOLUTION STATUS (Stacked Bars) */}
                  {viewMode === "status" && (
                    <>
                      <Bar
                        dataKey="unresolved"
                        name="Unresolved"
                        stackId="status"
                        fill={STATUS_COLORS.unresolved}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                      <Bar
                        dataKey="resolved"
                        name="Resolved"
                        stackId="status"
                        fill={STATUS_COLORS.resolved}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-opacity hover:opacity-85"
                      />
                    </>
                  )}

                  {/* Mode: TOTAL VOLUME (Single Bar with dynamic highlight) */}
                  {viewMode === "volume" && (
                    <Bar
                      dataKey="total"
                      name="Total Errors"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                      className="cursor-pointer transition-opacity hover:opacity-85"
                    >
                      {days.map((entry, index) => {
                        const isPeak = entry.total === summary.peak_count && entry.total > 0;
                        const isSelected = entry.date === activeDay?.date;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              isSelected
                                ? "#C084FC" // Active highlighted day
                                : isPeak
                                ? "#F43F5E" // Peak spike
                                : "#A855F7" // Default purple gradient
                            }
                            stroke={isSelected ? "#FFFFFF" : "transparent"}
                            strokeWidth={isSelected ? 2 : 0}
                            className="cursor-pointer"
                          />
                        );
                      })}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recharts Legend / Legend Badge Strip */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-white/5 text-[11px] text-ex-muted px-1">
              <div className="flex items-center gap-3.5 flex-wrap">
                {viewMode === "severity" && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                      <span className="text-white font-medium">Critical</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
                      <span className="text-white font-medium">Error</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                      <span className="text-white font-medium">Warning</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                      <span className="text-white font-medium">Info</span>
                    </span>
                  </>
                )}

                {viewMode === "status" && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                      <span className="text-white font-medium">Unresolved ({summary.unresolved_count_7d})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      <span className="text-white font-medium">Resolved ({summary.resolved_count_7d})</span>
                    </span>
                  </>
                )}

                {viewMode === "volume" && (
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                    <span>Daily Total Crash/Error Volume (Red indicates peak spike day)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-purple-300/90 font-medium">
                <Terminal className="h-3 w-3 text-purple-400" />
                <span>Click any bar to inspect specific stack traces & metadata</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Day Strip Selector & Selected Day Inspection */}
      {activeDay && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-ex-muted uppercase tracking-wider">
              7-Day Daily Breakdown & Drilldown
            </span>
            <span className="text-[11px] text-purple-300 font-medium">
              Inspecting: <strong className="text-white">{activeDay.full_date}</strong>
            </span>
          </div>

          {/* 7-Day Mini Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {days.map((d) => {
              const isSelected = d.date === activeDay.date;
              const isPeak = d.total === summary.peak_count && d.total > 0;

              return (
                <button
                  key={d.date}
                  onClick={() => handleOpenDayPanel(d)}
                  className={`p-2.5 rounded-xl text-left transition-all relative border group ${
                    isSelected
                      ? "bg-purple-500/20 border-purple-400/50 shadow-md ring-1 ring-purple-400/30"
                      : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5"
                  }`}
                  title="Click to inspect this day's error logs & stack traces"
                >
                  {isPeak && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-red-500 text-white shadow-sm">
                      PEAK
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-white">{d.day_name}</div>
                    <ChevronRight className="h-3 w-3 text-ex-muted opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="text-[10px] text-ex-muted font-mono">{d.formatted_date}</div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-base font-extrabold font-mono text-white">
                      {d.total}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400 font-mono">
                      {d.resolved}/{d.total}✓
                    </span>
                  </div>

                  {/* Micro severity dots */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {d.critical > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title={`${d.critical} Critical`} />}
                    {d.error > 0 && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title={`${d.error} Errors`} />}
                    {d.warning > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={`${d.warning} Warnings`} />}
                    {d.info > 0 && <span className="h-1.5 w-1.5 rounded-full bg-purple-500" title={`${d.info} Info`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Drill-down Detail Panel for Selected Day */}
          <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/10 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold font-mono">
                  {activeDay.day_name}, {activeDay.formatted_date}
                </span>
                <span className="text-ex-muted">
                  Logged: <strong className="text-white font-mono">{activeDay.total} errors</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                {activeDay.critical > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 font-medium">
                    {activeDay.critical} Critical
                  </span>
                )}
                {activeDay.error > 0 && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium">
                    {activeDay.error} Standard
                  </span>
                )}
                {activeDay.warning > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                    {activeDay.warning} Warnings
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                  {activeDay.resolved} Resolved
                </span>
              </div>
            </div>

            {/* Prominent Action Button to Open Side Panel */}
            <button
              id="btn-inspect-stack-trace-side-panel"
              onClick={() => handleOpenDayPanel(activeDay)}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition shrink-0 group"
            >
              <Terminal className="h-4 w-4 text-purple-200 group-hover:scale-110 transition" />
              <span>Inspect Stack Traces & Metadata</span>
              <ChevronRight className="h-4 w-4 text-purple-200" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Side Panel for Stack Traces and Error Metadata */}
      <ErrorDetailSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        dayData={sidePanelDay || activeDay}
        onNavigateToLogs={onNavigateToLogs}
        onViewUserJourney={onViewUserJourney}
      />
    </div>
  );
}
