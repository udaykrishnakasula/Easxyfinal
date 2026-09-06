import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ShieldCheck,
  Download,
  X,
  SlidersHorizontal,
  Check,
  AlertTriangle,
} from "lucide-react";

/**
 * Reusable Admin Bulk Action Dropdown Component
 * Positioned next to batch selection checkboxes to quickly apply status changes to multiple records.
 */
export default function AdminBulkActionDropdown({
  selectedCount = 0,
  totalCount = 0,
  actions = [],
  onExportSelected,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
  label = "Bulk Actions",
  buttonClassName = "",
  align = "left", // "left" | "right"
  testId = "admin-bulk-action-dropdown",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const hasSelection = selectedCount > 0;

  const colorStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
    green: "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
    rose: "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20",
    red: "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20",
    amber: "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
    yellow: "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20",
    purple: "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
    default: "text-white/90 bg-white/5 hover:bg-white/10 border-white/10",
  };

  const handleActionClick = (action) => {
    if (action.disabled || !hasSelection) return;
    setIsOpen(false);
    if (action.onClick) {
      action.onClick();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} data-testid={testId}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={!hasSelection && actions.every((a) => a.disabledWhenNoneSelected !== false)}
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid={`${testId}-trigger`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm select-none border ${
          hasSelection
            ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 shadow-purple-900/30 shadow-md ring-1 ring-purple-400/30"
            : "bg-white/5 hover:bg-white/10 text-ex-muted border-white/10 cursor-pointer"
        } ${buttonClassName}`}
      >
        <Layers className={`h-3.5 w-3.5 ${hasSelection ? "text-purple-200" : "text-ex-muted"}`} />
        <span>
          {label} {hasSelection && `(${selectedCount})`}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : hasSelection ? "text-purple-200" : "text-ex-muted"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          data-testid={`${testId}-menu`}
          className={`absolute z-50 mt-2 w-72 rounded-2xl bg-[#0e0e18]/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-black/80 py-2 text-xs divide-y divide-white/10 animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          }`}
        >
          {/* Header Summary */}
          <div className="px-3.5 py-2.5 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white tracking-wide uppercase text-[11px] flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
                Bulk Actions
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  hasSelection
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-white/10 text-ex-muted"
                }`}
              >
                {selectedCount} Selected
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ex-muted leading-tight">
              {hasSelection
                ? `Quickly set status or perform operations on ${selectedCount} record${selectedCount === 1 ? "" : "s"}.`
                : "Select records using checkboxes to execute batch status actions."}
            </p>
          </div>

          {/* Status Actions List */}
          <div className="p-1.5 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-ex-muted uppercase tracking-wider">
              Set Status To
            </div>
            {actions.map((action, idx) => {
              const ActionIcon = action.icon || CheckCircle2;
              const isActionDisabled = action.disabled || (!hasSelection && action.disabledWhenNoneSelected !== false);
              const colorKey = action.color || (action.isDanger ? "rose" : "emerald");
              const style = colorStyles[colorKey] || colorStyles.default;

              return (
                <button
                  key={action.key || idx}
                  type="button"
                  disabled={isActionDisabled}
                  onClick={() => handleActionClick(action)}
                  data-testid={`bulk-action-${action.key}`}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition border ${
                    isActionDisabled
                      ? "opacity-40 cursor-not-allowed bg-transparent border-transparent text-ex-muted"
                      : `${style} hover:border-current/40 group`
                  }`}
                >
                  <ActionIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs leading-tight flex items-center justify-between">
                      <span>{action.label}</span>
                      {hasSelection && (
                        <span className="text-[10px] font-mono opacity-80 group-hover:opacity-100">
                          ({selectedCount})
                        </span>
                      )}
                    </div>
                    {action.description && (
                      <div className="text-[10px] opacity-75 mt-0.5 leading-snug line-clamp-1">
                        {action.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Selection & Export Shortcuts */}
          <div className="p-1.5 space-y-0.5">
            {onExportSelected && (
              <button
                type="button"
                disabled={!hasSelection}
                onClick={() => {
                  setIsOpen(false);
                  onExportSelected();
                }}
                data-testid="bulk-action-export"
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-medium transition ${
                  hasSelection
                    ? "text-purple-300 hover:text-white hover:bg-purple-500/20"
                    : "text-ex-muted opacity-40 cursor-not-allowed"
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Selected to CSV ({selectedCount})</span>
              </button>
            )}

            {onSelectAll && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSelectAll();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-ex-muted hover:text-white hover:bg-white/5 transition font-medium"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isAllSelected ? "Deselect All Records" : `Select All Records (${totalCount || "all"})`}</span>
              </button>
            )}

            {onClearSelection && hasSelection && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onClearSelection();
                }}
                data-testid="bulk-action-clear"
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition font-medium"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Selection</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
