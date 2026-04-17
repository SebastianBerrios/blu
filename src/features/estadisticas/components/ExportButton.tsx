"use client";

import { Download } from "lucide-react";
import { buildStatsCSV, downloadCSV, type ExportBundle } from "../utils/csvExport";

interface ExportButtonProps {
  bundle: ExportBundle;
  disabled?: boolean;
}

export default function ExportButton({ bundle, disabled }: ExportButtonProps) {
  const handleExport = () => {
    const csv = buildStatsCSV(bundle);
    const datePart = bundle.ranges.current.start.slice(0, 10);
    downloadCSV(csv, `estadisticas-${bundle.ranges.preset}-${datePart}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50"
      title="Descargar CSV"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Exportar CSV</span>
    </button>
  );
}
