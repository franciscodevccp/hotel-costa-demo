"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

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
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

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
      <ul
        ref={dropdownRef}
        role="listbox"
        className="custom-select-dropdown custom-select-dropdown-scroll fixed z-[9999] max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl"
        style={{
          ...(position.top !== undefined && { top: position.top }),
          ...(position.bottom !== undefined && { bottom: position.bottom }),
          left: position.left,
          minWidth: position.width,
        }}
      >
      <li
        role="option"
        aria-selected={value === ""}
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className="cursor-pointer px-3 py-2.5 text-sm transition-colors first:rounded-t-[0.625rem] hover:bg-[var(--primary)]/10"
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
      {options.map((opt) => (
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
    </ul>
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
