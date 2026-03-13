import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Search, ChevronsUpDown } from "lucide-react";

interface Municipio {
  id: number;
  nome: string;
}

interface MunicipioMultiSelectProps {
  municipios: Municipio[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

const MunicipioMultiSelect = ({ municipios, selected, onChange, placeholder = "Selecione os municípios" }: MunicipioMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return municipios.slice(0, 100);
    const term = search.toLowerCase();
    return municipios.filter((m) => m.nome.toLowerCase().includes(term)).slice(0, 100);
  }, [municipios, search]);

  const selectedNames = useMemo(() => {
    const map = new Map(municipios.map((m) => [m.id, m.nome]));
    return selected.map((id) => ({ id, nome: map.get(id) || String(id) }));
  }, [municipios, selected]);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const removeOne = (id: number) => {
    onChange(selected.filter((s) => s !== id));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-10"
          >
            <span className="text-muted-foreground truncate">
              {selected.length === 0 ? placeholder : `${selected.length} município(s) selecionado(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar município..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-60">
            <div className="p-1">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum município encontrado</p>
              )}
              {filtered.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selected.includes(m.id)}
                    onCheckedChange={() => toggle(m.id)}
                  />
                  <span>{m.nome}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((m) => (
            <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
              {m.nome}
              <button
                type="button"
                onClick={() => removeOne(m.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MunicipioMultiSelect;
