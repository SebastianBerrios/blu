interface TimeRangeFieldsProps {
  startTime: string;
  onStartTimeChange: (value: string) => void;
  endTime: string;
  onEndTimeChange: (value: string) => void;
  disabled: boolean;
}

export default function TimeRangeFields({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  disabled,
}: TimeRangeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Hora inicio <span className="text-red-600">*</span>
        </label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Hora fin <span className="text-red-600">*</span>
        </label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
        />
      </div>
    </div>
  );
}
