interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="text-slate-300 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm text-center max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
