export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '');
}