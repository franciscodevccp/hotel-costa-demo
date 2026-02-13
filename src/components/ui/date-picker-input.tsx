"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { format, parse } from "date-fns";
import { es as esFns } from "date-fns/locale";

// Estilos del calendario (ruta según estructura del paquete)
import "react-day-picker/src/style.css";

// Abreviaturas correctas para Chile: Lunes a Domingo (Lu, Ma, Mi, Ju, Vi, Sá, Do)
const WEEKDAY_SHORT_CL: Record<number, string> = {
  0: "Do",
  1: "Lu",
  2: "Ma",
  3: "Mi",
  4: "Ju",
  5: "Vi",
  6: "Sá",
};

export interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  id,
  className = "",
  "aria-label": ariaLabel,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [inputText, setInputText] = useState(() =>
    value ? format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: esFns }) : ""
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      try {
        setInputText(format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: esFns }));
      } catch {
        setInputText("");
      }
    } else {
      setInputText("");
    }
  }, [value]);

  // Actualizar posición del popover al abrir (y al hacer scroll/resize si está abierto)
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const minWidth = 240;
        let left = rect.left;
        if (left + minWidth > window.innerWidth) left = window.innerWidth - minWidth;
        if (left < 8) left = 8;
        setPosition({
          top: rect.bottom + 4,
          left,
        });
      }
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inInput = containerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inInput && !inPopover) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  let selectedDate: Date | undefined;
  try {
    selectedDate = value && value.trim() ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  } catch {
    selectedDate = undefined;
  }

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(format(date, "yyyy-MM-dd"));
    setInputText(format(date, "dd/MM/yyyy", { locale: esFns }));
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(format(today, "yyyy-MM-dd"));
    setInputText(format(today, "dd/MM/yyyy", { locale: esFns }));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setInputText("");
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        type="text"
        readOnly
        id={id}
        value={inputText}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[100] min-w-[240px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg rdp-compact"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            <DayPicker
              mode="single"
              locale={es}
              weekStartsOn={1}
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate ?? new Date()}
              formatters={{
                formatWeekdayName: (weekday) => WEEKDAY_SHORT_CL[weekday.getDay()],
              }}
            />
            <div className="mt-2 flex justify-between gap-2 border-t border-[var(--border)] pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)]"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
              >
                Hoy
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
