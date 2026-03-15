interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          {icon && (
            <div className="hidden md:flex p-3 bg-primary-100 rounded-xl">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-slate-500 text-sm mt-0.5 hidden md:block">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="hidden md:block">{action}</div>}
      </div>
    </header>
  );
}
