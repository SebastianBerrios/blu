"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import type { DateRangePreset } from "@/types";
import { PRESETS, canNavigateForward, navigateAnchor } from "../constants";

interface PeriodSelectorProps {
  preset: DateRangePreset;
  anchor: Date;
  label: string;
  custom?: { startDate: string; endDate: string };
  onPresetChange: (preset: DateRangePreset) => void;
  onAnchorChange: (anchor: Date) => void;
  onCustomChange: (range: { startDate: string; endDate: string }) => void;
}

function toLocalKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PeriodSelector({
  preset,
  anchor,
  label,
  custom,
  onPresetChange,
  onAnchorChange,
  onCustomChange,
}: PeriodSelectorProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [draftStart, setDraftStart] = useState(custom?.startDate ?? toLocalKey(anchor));
  const [draftEnd, setDraftEnd] = useState(custom?.endDate ?? toLocalKey(anchor));

  const handlePresetClick = (p: DateRangePreset) => {
    if (p === "custom") {
      setShowCustomModal(true);
      return;
    }
    onPresetChange(p);
    onAnchorChange(new Date());
  };

  const applyCustom = () => {
    if (!draftStart || !draftEnd) return;
    onCustomChange({ startDate: draftStart, endDate: draftEnd });
    onPresetChange("custom");
    setShowCustomModal(false);
  };

  const canForward = canNavigateForward(anchor, preset);
  const showNav = preset !== "custom";

  return (
    <div className="flex flex-col gap-3">
      {/* Preset chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePresetClick(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors ${
                preset === p.value
                  ? "bg-primary-100 text-primary-800"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {p.value === "custom" ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {p.label}
                </span>
              ) : (
                p.label
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Anchor navigator + label */}
      {showNav && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm self-start">
          <button
            onClick={() => onAnchorChange(navigateAnchor(anchor, preset, -1))}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-sm font-medium text-slate-700 capitalize min-w-[140px] text-center">
            {label}
          </span>
          <button
            onClick={() => onAnchorChange(navigateAnchor(anchor, preset, 1))}
            disabled={!canForward}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Período siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {preset === "custom" && custom && (
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm self-start">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {custom.startDate} → {custom.endDate}
          </span>
          <button
            onClick={() => setShowCustomModal(true)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium ml-1"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Custom range modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Rango personalizado</h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Desde</span>
                <input
                  type="date"
                  value={draftStart}
                  max={draftEnd}
                  onChange={(e) => setDraftStart(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Hasta</span>
                <input
                  type="date"
                  value={draftEnd}
                  min={draftStart}
                  max={toLocalKey(new Date())}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={applyCustom}
                disabled={!draftStart || !draftEnd}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
