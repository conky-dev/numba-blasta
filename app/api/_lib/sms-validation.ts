/**
 * SMS Message Validation Utilities
 * Handles character counting and validation for SMS messages
 * Follows GSM 03.38 specification
 */

/**
 * GSM-7 basic character set (single septet)
 */
const GSM_7BIT_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/**
 * GSM-7 extended character set (requires escape, counts as 2 septets)
 * These are: | ^ € { } [ ~ ] \
 */
const GSM_7BIT_EXTENDED = '|^€{}[]~\\';

/**
 * Count GSM-7 characters correctly
 * Extended chars (|^€{}[]~\) count as 2 septets (escape + char)
 * Form feed (page break) also counts as 2 septets (escape + 0x0A)
 */
function countGsm7Length(text: string): number {
  let count = 0;
  for (const char of text) {
    if (GSM_7BIT_EXTENDED.includes(char)) {
      count += 2; // Escape sequence + character
    } else if (char === '\f') {
      count += 2; // Form feed (page break)
    } else if (GSM_7BIT_BASIC.includes(char)) {
      count += 1;
    } else {
      // Non-GSM character detected - can't use GSM-7
      return -1;
    }
  }
  return count;
}

/**
 * Check if message can be encoded in GSM-7
 */
function isGsm7Compatible(text: string): boolean {
  for (const char of text) {
    if (!GSM_7BIT_BASIC.includes(char) && !GSM_7BIT_EXTENDED.includes(char) && char !== '\f') {
      return false;
    }
  }
  return true;
}

/**
 * Count the effective length of an SMS message accounting for encoding
 * @param text - The message text
 * @returns Object with character count and segment info
 */
export function getSmsCharacterCount(text: string): {
  length: number;
  maxLength: number;
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
  specialCharsCount: number;
} {
  const gsm7Length = countGsm7Length(text);
  const isGsm7 = gsm7Length >= 0;
  
  if (isGsm7) {
    // GSM-7 encoding: 160 septets for single segment, 153 for multi-part
    const effectiveLength = gsm7Length;
    const maxSingleSegment = 160;
    const maxMultiSegment = 153;
    const segments = effectiveLength <= maxSingleSegment 
      ? 1 
      : Math.ceil(effectiveLength / maxMultiSegment);
    
    const extendedChars = (text.match(/[\|\^\€\{\}\[\]\~\\]/g) || []).length;
    
    return {
      length: effectiveLength,
      maxLength: segments === 1 ? maxSingleSegment : maxMultiSegment * segments,
      segments,
      encoding: 'GSM-7',
      specialCharsCount: extendedChars,
    };
  } else {
    // UCS-2 encoding: 70 chars for single segment, 67 for multi-part
    // In UCS-2, each character is 2 bytes, newlines count as 1 character
    const effectiveLength = text.length;
    const maxSingleSegment = 70;
    const maxMultiSegment = 67;
    const segments = effectiveLength <= maxSingleSegment 
      ? 1 
      : Math.ceil(effectiveLength / maxMultiSegment);
    
    return {
      length: effectiveLength,
      maxLength: segments === 1 ? maxSingleSegment : maxMultiSegment * segments,
      segments,
      encoding: 'UCS-2',
      specialCharsCount: 0, // Not applicable for UCS-2
    };
  }
}

/**
 * Truncate message to fit within a single SMS segment (160 GSM-7 or 70 UCS-2)
 * @param text - The message text
 * @param maxSegments - Maximum number of segments allowed (default: 1)
 * @returns Truncated message
 */
export function truncateSmsMessage(text: string, maxSegments: number = 1): string {
  const info = getSmsCharacterCount(text);
  
  // Determine max length based on segments
  const maxLength = maxSegments === 1 
    ? (info.encoding === 'GSM-7' ? 160 : 70)
    : (info.encoding === 'GSM-7' ? 153 * maxSegments : 67 * maxSegments);
  
  if (info.length <= maxLength) {
    return text;
  }
  
  // Truncate to fit
  if (info.encoding === 'UCS-2') {
    // Simple truncation for UCS-2
    return text.substring(0, maxLength - 3) + '...';
  } else {
    // For GSM-7, account for extended characters (2 septets each)
    let effectiveLength = 0;
    let truncateAt = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCost = GSM_7BIT_EXTENDED.includes(char) || char === '\f' ? 2 : 1;
      
      if (effectiveLength + charCost > maxLength - 3) { // Reserve 3 for '...'
        break;
      }
      
      effectiveLength += charCost;
      truncateAt = i + 1;
    }
    
    return text.substring(0, truncateAt) + '...';
  }
}

/**
 * Validate if a message is within acceptable SMS limits
 * @param text - The message text
 * @param maxSegments - Maximum number of segments allowed (default: 10)
 * @returns Validation result
 */
export function validateSmsMessage(text: string, maxSegments: number = 10): {
  valid: boolean;
  error?: string;
  info: ReturnType<typeof getSmsCharacterCount>;
} {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Message cannot be empty',
      info: getSmsCharacterCount(''),
    };
  }
  
  const info = getSmsCharacterCount(text);
  
  if (info.segments > maxSegments) {
    return {
      valid: false,
      error: `Message exceeds maximum of ${maxSegments} segments (${info.segments} required)`,
      info,
    };
  }
  
  return {
    valid: true,
    info,
  };
}

/**
 * Enforce a strict 140 septet/character limit (accounting for GSM-7 extended chars)
 * This is more restrictive than standard SMS to leave room for opt-out footer
 * @param text - The message text
 * @returns Truncated message
 */
export function enforceStrictLimit(text: string): string {
  const STRICT_LIMIT = 140;
  const info = getSmsCharacterCount(text);
  
  if (info.length <= STRICT_LIMIT) {
    return text;
  }
  
  // Truncate accounting for encoding
  if (info.encoding === 'UCS-2') {
    return text.substring(0, STRICT_LIMIT - 3) + '...';
  } else {
    // For GSM-7, account for extended characters (2 septets each)
    let effectiveLength = 0;
    let truncateAt = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCost = GSM_7BIT_EXTENDED.includes(char) || char === '\f' ? 2 : 1;
      
      if (effectiveLength + charCost > STRICT_LIMIT - 3) {
        break;
      }
      
      effectiveLength += charCost;
      truncateAt = i + 1;
    }
    
    return text.substring(0, truncateAt) + '...';
  }
}

