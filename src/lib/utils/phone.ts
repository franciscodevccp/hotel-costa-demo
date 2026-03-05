/** Longitud máxima del teléfono chileno: +56 + 9 dígitos (móvil) = 12 caracteres. */
export const PHONE_CHILE_MAX_LENGTH = 12;

/**
 * Formatea y limita la entrada a un teléfono chileno: +56 seguido de 9 dígitos (móvil).
 * Solo permite + y dígitos; máximo 12 caracteres (ej. +56912345678).
 */
export function formatChileanPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  const hasPlus = value.trimStart().startsWith("+");
  if (!digits && !hasPlus) return "";
  let numPart = digits;
  if (numPart.startsWith("56")) {
    numPart = numPart.slice(0, 2 + 9);
  } else {
    numPart = ("56" + numPart).slice(0, 2 + 9);
  }
  const out = "+" + numPart;
  return out.length > PHONE_CHILE_MAX_LENGTH ? out.slice(0, PHONE_CHILE_MAX_LENGTH) : out;
}
