/** Formatea entrada como RUT chileno: 12.345.678-9. Máximo 8 dígitos + 1 dígito verificador (0-9 o K). */
export function formatChileanRut(value: string): string {
  const raw = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!raw) return "";
  let bodyDigits = "";
  let dv = "";
  for (const c of raw) {
    if (/\d/.test(c) && bodyDigits.length < 8) {
      bodyDigits += c;
    } else if (bodyDigits.length === 8 && /[0-9kK]/.test(c)) {
      dv = c;
      break;
    }
  }
  const bodyFormatted = bodyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${bodyFormatted}-${dv}` : bodyFormatted;
}

/** Longitud máxima del RUT formateado (ej. 12.345.678-9). */
export const RUT_FORMATTED_MAX_LENGTH = 12;
