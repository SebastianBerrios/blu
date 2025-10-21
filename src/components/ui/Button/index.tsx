import { Plus } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  variant: "primary" | "ghost";
  icon?: boolean;
  onClick?: () => void;
}

export default function Button({
  children,
  variant,
  icon,
  onClick,
}: ButtonProps) {
  const getButtonStyles = () => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95";

    if (variant === "primary") {
      return `${baseStyles} bg-primary-900 text-white border-2 hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800`;
    }

    if (variant === "ghost") {
      return `${baseStyles} text-gray-700 border-2 border-primary-500 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200`;
    }

    return baseStyles;
  };

  return (
    <button onClick={onClick} className={getButtonStyles()}>
      {icon && <Plus className="w-4 h-4" />}
      {children}
    </button>
  );
}
