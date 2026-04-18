import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}

export default function FAB({ onClick, label = "Crear", icon }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform hover:bg-primary-700"
      aria-label={label}
    >
      {icon ?? <Plus className="w-6 h-6" />}
    </button>
  );
}
