/**
 * Validadores para endpoints externos
 */

export interface LeadValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validar dados de um lead
 */
export function validateLeadData(data: any): LeadValidationResult {
  const errors: string[] = [];

  // Validar telefone
  if (!data.telefone) {
    errors.push('Campo "telefone" é obrigatório');
  } else if (typeof data.telefone !== 'string') {
    errors.push('Campo "telefone" deve ser uma string');
  } else if (data.telefone.trim().length === 0) {
    errors.push('Campo "telefone" não pode estar vazio');
  } else {
    // Validar formato do telefone (apenas números e caracteres especiais)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(data.telefone)) {
      errors.push('Campo "telefone" contém caracteres inválidos');
    }

    // Validar se tem pelo menos 10 dígitos
    const digits = data.telefone.replace(/\D/g, '');
    if (digits.length < 10) {
      errors.push('Campo "telefone" deve ter pelo menos 10 dígitos');
    }

    // Validar se tem no máximo 15 dígitos
    if (digits.length > 15) {
      errors.push('Campo "telefone" deve ter no máximo 15 dígitos');
    }
  }

  // Validar UTM parameters (opcional, mas se fornecido, deve ser string)
  const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  for (const field of utmFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'string') {
        errors.push(`Campo "${field}" deve ser uma string`);
      } else if (data[field].length > 500) {
        errors.push(`Campo "${field}" não pode ter mais de 500 caracteres`);
      }
    }
  }

  // Validar gclid e fbclid (opcional)
  const clickIdFields = ['gclid', 'fbclid'];
  for (const field of clickIdFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'string') {
        errors.push(`Campo "${field}" deve ser uma string`);
      } else if (data[field].length > 500) {
        errors.push(`Campo "${field}" não pode ter mais de 500 caracteres`);
      }
    }
  }

  // Validar shopify_data (opcional, deve ser um objeto)
  if (data.shopify_data !== undefined && data.shopify_data !== null) {
    if (typeof data.shopify_data !== 'object' || Array.isArray(data.shopify_data)) {
      errors.push('Campo "shopify_data" deve ser um objeto JSON');
    } else {
      // Validar tamanho do objeto JSON
      const jsonString = JSON.stringify(data.shopify_data);
      if (jsonString.length > 10000) {
        errors.push('Campo "shopify_data" não pode ter mais de 10KB');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar array de leads
 */
export function validateLeadsArray(leads: any[]): LeadValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(leads)) {
    errors.push('Campo "leads" deve ser um array');
    return { isValid: false, errors };
  }

  if (leads.length === 0) {
    errors.push('Campo "leads" não pode estar vazio');
    return { isValid: false, errors };
  }

  if (leads.length > 100) {
    errors.push('Máximo de 100 leads por requisição');
    return { isValid: false, errors };
  }

  // Validar cada lead
  for (let i = 0; i < leads.length; i++) {
    const validation = validateLeadData(leads[i]);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`Lead ${i}: ${error}`);
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizar dados de um lead
 */
export function sanitizeLeadData(data: any): any {
  return {
    telefone: data.telefone?.trim() || '',
    utm_source: data.utm_source?.trim() || undefined,
    utm_medium: data.utm_medium?.trim() || undefined,
    utm_campaign: data.utm_campaign?.trim() || undefined,
    utm_content: data.utm_content?.trim() || undefined,
    utm_term: data.utm_term?.trim() || undefined,
    gclid: data.gclid?.trim() || undefined,
    fbclid: data.fbclid?.trim() || undefined
  };
}

/**
 * Formatar erro de validação para resposta
 */
export function formatValidationError(validation: LeadValidationResult): string {
  return validation.errors.join('; ');
}

/**
 * Validar status
 */
export function validateStatus(status: string): boolean {
  const validStatuses = ['novo', 'convertido', 'expirado'];
  return validStatuses.includes(status);
}

/**
 * Validar pagination parameters
 */
export function validatePaginationParams(limit: number, offset: number): LeadValidationResult {
  const errors: string[] = [];

  if (isNaN(limit) || limit < 1) {
    errors.push('Parâmetro "limit" deve ser um número maior que 0');
  }

  if (limit > 1000) {
    errors.push('Parâmetro "limit" não pode ser maior que 1000');
  }

  if (isNaN(offset) || offset < 0) {
    errors.push('Parâmetro "offset" deve ser um número não negativo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
