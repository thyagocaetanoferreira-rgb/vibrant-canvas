import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const ModulePlaceholder = ({ title, description, icon: Icon }: ModulePlaceholderProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-card-foreground text-lg">Módulo em Desenvolvimento</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Este módulo está sendo preparado para a nova versão do IntraService. Em breve estará disponível com todas as funcionalidades.
        </p>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
