"use client";

import type { DateRangePreset } from "@/types";
import { PRESETS } from "../constants";

interface PresetSelectorProps {
  preset: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  variant?: "desktop" | "mobile";
}

export default function PresetSelector({
  preset,
  onChange,
  variant = "desktop",
}: PresetSelectorProps) {
  const buttonBaseClass =
    variant === "mobile"
      ? "flex-1 px-3 py-3 min-h-[44px]"
      : "px-4 py-2";

  return (
    <div className={variant === "mobile" ? "flex gap-2 md:hidden" : "flex gap-2"}>
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`${buttonBaseClass} rounded-lg border-2 font-medium text-sm transition-all ${
            preset === p.value
              ? "bg-primary-100 text-primary-800 border-primary-300"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
