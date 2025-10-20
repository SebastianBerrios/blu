import Link from "next/link";
import {
  Coffee,
  FolderOpen,
  ChefHat,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export default function SideBar() {
  const navItems = [
    { id: 1, nav: "categories", name: "Categorias", icon: FolderOpen },
    { id: 2, nav: "ingredients", name: "Ingredientes", icon: ChefHat },
    { id: 3, nav: "recipes", name: "Recetas", icon: BookOpen },
    { id: 4, nav: "sales", name: "Ventas", icon: TrendingUp },
  ];

  return (
    <aside className="w-64 h-full bg-gradient-to-b from-primary-50 to-white border-r border-primary-200 shadow-lg">
      <div className="p-6 flex items-center gap-3 border-b border-primary-200 bg-white">
        <div className="p-2 bg-primary-500 rounded-lg">
          <Coffee size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-primary-900 text-xl font-bold">Blu Café</h1>
          <p className="text-primary-500 text-sm">Gestión de Negocio</p>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-primary-700 font-semibold text-sm uppercase tracking-wider mb-4 px-2">
          Navegación
        </h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.id}
                href={item.nav}
                className="flex items-center gap-3 px-3 py-2.5 text-primary-700 rounded-lg transition-all duration-200 hover:bg-primary-100 hover:text-primary-900 hover:shadow-sm group"
              >
                <IconComponent
                  size={18}
                  className="text-primary-500 group-hover:text-primary-700 transition-colors"
                />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
