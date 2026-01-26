export function isValidPhone(phone: string): boolean {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Brazilian phone: 10-11 digits (DDD + number)
  // International: 7-15 digits
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function isValidUTM(utm: Record<string, any>): boolean {
  // At least one UTM parameter should be present
  const hasUTM = 
    utm.utm_source || 
    utm.utm_medium || 
    utm.utm_campaign || 
    utm.utm_content || 
    utm.utm_term;
  
  return Boolean(hasUTM);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(str: string): string {
  return str.trim().substring(0, 255);
}

export function extractPhoneFromText(text: string): string | null {
  // Match various phone formats
  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}/g;
  const matches = text.match(phoneRegex);
  
  if (matches && matches.length > 0) {
    // Return the first match, normalized
    return matches[0].replace(/\D/g, '');
  }
  
  return null;
}
