"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder: string;
  className?: string;
  "aria-label"?: string;
  /** Si se pasan, el dropdown se controla desde fuera (ej. abrir al escribir en un campo de búsqueda). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Muestra un campo de búsqueda dentro del dropdown para filtrar opciones. */
  searchable?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  "aria-label": ariaLabel,
  open: controlledOpen,
  onOpenChange,
  searchable = false,
}: CustomSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof next === "function" ? next(open) : next;
    if (!val) setSearchQuery("");
    if (isControlled && onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
  };
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = searchable && searchQuery
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const DROPDOWN_MAX_HEIGHT = 240;
  const GAP = 8;

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    if (!containerRef.current || typeof window === "undefined") return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const openUpward = spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow;

    if (openUpward) {
      setPosition({
        bottom: window.innerHeight - rect.top + GAP,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setPosition({
        top: rect.bottom + GAP,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, searchable]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const dropdownList =
    open &&
    position &&
    typeof document !== "undefined" && (
      <div
        ref={dropdownRef}
        className="custom-select-dropdown fixed z-[9999] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        style={{
          ...(position.top !== undefined && { top: position.top }),
          ...(position.bottom !== undefined && { bottom: position.bottom }),
          left: position.left,
          minWidth: position.width,
        }}
      >
      {searchable && (
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)] p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-1.5 pl-8 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      <ul
        role="listbox"
        className="custom-select-dropdown-scroll max-h-60 overflow-y-auto py-1"
      >
      {!searchQuery && (
        <li
          role="option"
          aria-selected={value === ""}
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="cursor-pointer px-3 py-2.5 text-sm transition-colors hover:bg-[var(--primary)]/10"
          style={
            value === ""
              ? {
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
              : undefined
          }
        >
          {placeholder}
        </li>
      )}
      {filteredOptions.map((opt) => (
        <li
          key={opt.value}
          role="option"
          aria-selected={value === opt.value}
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
          className="cursor-pointer px-3 py-2.5 text-sm transition-colors last:rounded-b-[0.625rem] hover:bg-[var(--primary)]/10"
          style={
            value === opt.value
              ? {
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
              : undefined
          }
        >
          {opt.label}
        </li>
      ))}
      {searchable && searchQuery && filteredOptions.length === 0 && (
        <li className="px-3 py-2.5 text-sm text-[var(--muted)] text-center">
          Sin resultados
        </li>
      )}
      </ul>
      </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        className="flex min-h-[2.5rem] w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-left text-sm text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        <span className={selectedOption ? "" : "text-[var(--muted)]"}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {typeof document !== "undefined" && dropdownList
        ? createPortal(dropdownList as React.ReactElement, document.body)
        : null}
    </div>
  );
}
