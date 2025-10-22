interface SpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function Spinner({
  text,
  size = "md",
  fullScreen,
}: SpinnerProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
    : "flex items-center justify-center py-12";

  const sizeClasses = {
    sm: "w-5 h-5 border-2 text-sm",
    md: "w-10 h-10 border-2 text-base",
    lg: "w-16 h-16 border-4 text-lg",
  };

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-3 text-primary-700">
        <div
          className={`${sizeClasses[size]} border-2 border-primary-500 border-t-transparent rounded-full animate-spin`}
        ></div>
        {text && <span>{text}</span>}
      </div>
    </div>
  );
}
