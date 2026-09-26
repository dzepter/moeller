/** Hilfen für Kontakt-CTAs (Telefon, WhatsApp). */

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.startsWith("49") ? `+${digits}` : `+49${digits.replace(/^0/, "")}`;
  return `tel:${e164}`;
}
