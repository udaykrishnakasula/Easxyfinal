import dayjs from "dayjs";

/**
 * Escapes a cell value for CSV formatting according to RFC 4180.
 * Handles null, numbers, strings containing commas, quotes, or newlines.
 */
export function escapeCsvValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of data objects to CSV text.
 * @param {Array<Object>} rows - Array of objects
 * @param {Array<{ key: string, label: string, formatter?: (val: any, row: any) => any }>} columns - Column configuration
 * @returns {string} UTF-8 encoded CSV string with BOM
 */
export function jsonToCsv(rows = [], columns = []) {
  if (!rows || rows.length === 0) {
    if (columns.length > 0) {
      return "\uFEFF" + columns.map((col) => escapeCsvValue(col.label)).join(",");
    }
    return "";
  }

  // Determine headers
  const headerCols =
    columns && columns.length > 0
      ? columns
      : Object.keys(rows?.[0] || {}).map((k) => ({ key: k, label: k }));

  const headerLine = headerCols.map((col) => escapeCsvValue(col.label)).join(",");

  const dataLines = rows.map((row) => {
    return headerCols
      .map((col) => {
        let val;
        if (typeof col.formatter === "function") {
          val = col.formatter(row[col.key], row);
        } else if (typeof col.accessor === "function") {
          val = col.accessor(row);
        } else {
          val = row[col.key];
        }
        return escapeCsvValue(val);
      })
      .join(",");
  });

  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

/**
 * Triggers a browser download of CSV data.
 * @param {string} csvContent - The CSV text content
 * @param {string} filename - Filename with .csv extension
 */
export function downloadCsvFile(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Column definitions for Deposit records export
 */
export const DEPOSIT_CSV_COLUMNS = [
  { key: "id", label: "Deposit ID" },
  {
    key: "user_name",
    label: "Investor Name",
    accessor: (row) => row.user?.name || row.user_name || "Unknown",
  },
  {
    key: "user_email",
    label: "Investor Email",
    accessor: (row) => row.user?.email || row.user_email || "",
  },
  {
    key: "user_phone",
    label: "Investor Phone",
    accessor: (row) => row.user?.phone || row.user_phone || "",
  },
  { key: "user_id", label: "User ID" },
  {
    key: "amount",
    label: "Deposit Amount (USDT)",
    formatter: (v) => (v !== undefined && v !== null ? Number(v).toFixed(2) : "0.00"),
  },
  {
    key: "approved_amount",
    label: "Approved Amount (USDT)",
    accessor: (row) => {
      const amt = row.approved_amount ?? row.amount;
      return amt !== undefined && amt !== null ? Number(amt).toFixed(2) : "0.00";
    },
  },
  {
    key: "network",
    label: "Network",
    formatter: (v) => String(v || "TRC20").toUpperCase(),
  },
  {
    key: "status",
    label: "Status",
    formatter: (v) => String(v || "pending").toUpperCase(),
  },
  {
    key: "tx_hash",
    label: "Transaction Hash (TXID)",
    formatter: (v) => v || "—",
  },
  {
    key: "admin_note",
    label: "Admin Review Note",
    accessor: (row) => row.admin_note || row.rejection_reason || row.note || "",
  },
  {
    key: "created_at",
    label: "Submitted Date & Time",
    formatter: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "—"),
  },
  {
    key: "reviewed_at",
    label: "Reviewed Date & Time",
    accessor: (row) =>
      row.reviewed_at || row.updated_at
        ? dayjs(row.reviewed_at || row.updated_at).format("YYYY-MM-DD HH:mm:ss")
        : "—",
  },
];

/**
 * Column definitions for KYC Identity Verification records export
 */
export const KYC_CSV_COLUMNS = [
  { key: "id", label: "KYC Record ID" },
  {
    key: "user_name",
    label: "Investor Name",
    accessor: (row) => row.user_name || row.name || row.user?.name || "Unknown",
  },
  {
    key: "user_email",
    label: "Investor Email",
    accessor: (row) => row.user_email || row.email || row.user?.email || "",
  },
  {
    key: "user_phone",
    label: "Investor Phone",
    accessor: (row) => row.user_phone || row.phone || row.user?.phone || "",
  },
  { key: "user_id", label: "User ID" },
  {
    key: "id_type",
    label: "Document Type",
    formatter: (v) => {
      if (!v) return "National ID";
      return String(v).replace(/_/g, " ").toUpperCase();
    },
  },
  {
    key: "id_number",
    label: "Document ID Number",
    accessor: (row) => row.id_number || row.id_number_masked || "—",
  },
  {
    key: "address",
    label: "Permanent Residential Address",
    accessor: (row) => row.permanent_address || row.address || row.user_address || row.user?.address || "—",
  },
  {
    key: "country",
    label: "Country",
    formatter: (v) => v || "IN",
  },
  {
    key: "status",
    label: "Status",
    formatter: (v) => String(v || "pending").toUpperCase(),
  },
  {
    key: "reject_reason",
    label: "Rejection Reason / Admin Feedback",
    accessor: (row) => row.reject_reason || row.rejection_reason || "",
  },
  {
    key: "admin_reviewer",
    label: "Reviewed By Admin",
    accessor: (row) => row.admin_name || row.admin_email || "Super Admin",
  },
  {
    key: "created_at",
    label: "Submitted Date & Time",
    accessor: (row) =>
      row.created_at || row.submitted_at
        ? dayjs(row.created_at || row.submitted_at).format("YYYY-MM-DD HH:mm:ss")
        : "—",
  },
  {
    key: "reviewed_at",
    label: "Reviewed Date & Time",
    accessor: (row) =>
      row.reviewed_at
        ? dayjs(row.reviewed_at).format("YYYY-MM-DD HH:mm:ss")
        : "—",
  },
];

/**
 * Helper to export Deposit records to CSV
 */
export function exportDepositsToCsv(records = [], filterStatus = "all", customQuery = "") {
  const dateStamp = dayjs().format("YYYY-MM-DD_HHmm");
  const statusSlug = filterStatus ? filterStatus.toLowerCase() : "all";
  const querySlug = customQuery ? `_filtered` : "";
  const filename = `easyx_deposits_${statusSlug}${querySlug}_${dateStamp}.csv`;

  const csv = jsonToCsv(records, DEPOSIT_CSV_COLUMNS);
  downloadCsvFile(csv, filename);
  return { filename, count: records.length };
}

/**
 * Helper to export KYC records to CSV
 */
export function exportKycToCsv(records = [], filterStatus = "all", customQuery = "") {
  const dateStamp = dayjs().format("YYYY-MM-DD_HHmm");
  const statusSlug = filterStatus ? filterStatus.toLowerCase() : "all";
  const querySlug = customQuery ? `_filtered` : "";
  const filename = `easyx_kyc_${statusSlug}${querySlug}_${dateStamp}.csv`;

  const csv = jsonToCsv(records, KYC_CSV_COLUMNS);
  downloadCsvFile(csv, filename);
  return { filename, count: records.length };
}
