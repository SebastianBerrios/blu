import { Plus } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  onClick,
  type = "button",
  disabled,
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm min-h-[36px]",
    md: "px-4 py-2.5 text-sm min-h-[44px]",
    lg: "px-5 py-3 text-base min-h-[48px]",
  };

  const variantStyles = {
    primary:
      "bg-primary-900 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800",
    secondary:
      "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-slate-400",
    ghost:
      "text-slate-700 border-2 border-primary-500 hover:bg-slate-100 focus:ring-primary-500",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <Plus className="w-4 h-4" />}
      {children}
    </button>
  );
}
