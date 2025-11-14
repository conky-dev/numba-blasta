import Mustache from 'mustache';

/**
 * Renders a template with variables using Mustache syntax
 * Supports: {{firstName}}, {{lastName}}, {{customField}}, etc.
 * 
 * @param content - Template content with {{placeholders}}
 * @param variables - Key-value pairs for variable substitution
 * @returns Rendered template string
 */
export function renderTemplate(content: string, variables: Record<string, any> = {}): string {
  try {
    // Disable HTML escaping since we're doing SMS
    return Mustache.render(content, variables);
  } catch (error) {
    console.error('Template rendering error:', error);
    return content; // Return original if rendering fails
  }
}

/**
 * Extracts all variable placeholders from a template
 * @param content - Template content
 * @returns Array of variable names found in template
 */
export function extractTemplateVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Remove whitespace and add to set (automatically dedupes)
    variables.add(match[1].trim());
  }
  
  return Array.from(variables);
}

/**
 * Validates that all required variables are provided
 * @param content - Template content
 * @param variables - Variables provided for rendering
 * @returns Object with isValid flag and missing variable names
 */
export function validateTemplateVariables(
  content: string,
  variables: Record<string, any>
): { isValid: boolean; missing: string[] } {
  const requiredVars = extractTemplateVariables(content);
  const missing = requiredVars.filter(varName => !(varName in variables));
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Gets a preview of a template with sample data
 * @param content - Template content
 * @param sampleData - Sample data for preview
 * @returns Preview text with character count
 */
export function previewTemplate(content: string, sampleData: Record<string, any> = {}) {
  const rendered = renderTemplate(content, sampleData);
  const variables = extractTemplateVariables(content);
  
  // Calculate SMS segments (160 chars per segment for GSM-7, 70 for Unicode)
  const charCount = rendered.length;
  const hasUnicode = /[^\x00-\x7F]/.test(rendered);
  const maxCharsPerSegment = hasUnicode ? 70 : 160;
  const segments = Math.ceil(charCount / maxCharsPerSegment) || 1;
  
  return {
    preview: rendered,
    charCount,
    segments,
    hasUnicode,
    variables,
  };
}

