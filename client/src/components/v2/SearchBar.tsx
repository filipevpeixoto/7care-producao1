import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChange, placeholder = 'Buscar' }: SearchBarProps) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v2-text-3)]" />
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 rounded-[var(--r-pill)] border-[var(--v2-border)] bg-[var(--v2-card)] pl-10 text-[var(--v2-text)]"
    />
  </div>
);
