/**
 * Safe money calculator & expression evaluator for Vietnamese transactions
 * Supports +, -, *, /, shortcuts (k, tr, m) and thousand separators
 */

export interface FormulaEvaluation {
  result: number;
  hasOperator: boolean;
  isValid: boolean;
  formattedDisplay: string;
}

/**
 * Normalizes user input into clean tokens
 */
function normalizeSubValue(valStr: string): number {
  let cleaned = valStr.trim().toLowerCase();
  if (!cleaned) return 0;

  // Handle unit suffixes
  let multiplier = 1;
  if (cleaned.includes('ty') || cleaned.includes('tỷ') || cleaned.endsWith('b')) {
    multiplier = 1_000_000_000;
    cleaned = cleaned.replace(/tỷ|ty|b/g, '').trim();
  } else if (cleaned.includes('tr') || cleaned.includes('trieu') || cleaned.includes('triệu') || cleaned.endsWith('m')) {
    multiplier = 1_000_000;
    cleaned = cleaned.replace(/triệu|trieu|tr|m/g, '').trim();
  } else if (cleaned.includes('k') || cleaned.includes('nghìn') || cleaned.includes('nghin') || cleaned.includes('ngàn') || cleaned.includes('ngan')) {
    multiplier = 1_000;
    cleaned = cleaned.replace(/nghìn|nghin|ngàn|ngan|k/g, '').trim();
  }

  // Handle decimal vs thousand separator
  // If decimal with comma (e.g. 1,5tr -> 1.5tr)
  if (multiplier > 1) {
    cleaned = cleaned.replace(',', '.');
    const floatVal = parseFloat(cleaned);
    if (!isNaN(floatVal)) {
      return Math.round(floatVal * multiplier);
    }
  }

  // Otherwise, remove all non-digits
  const digitsOnly = cleaned.replace(/\D/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? 0 : parsed * multiplier;
}

/**
 * Evaluates an expression like "500000 + 1000000" or "500k + 1tr" or "2000000 - 350000"
 */
export function evaluateMoneyExpression(rawExpr: string): FormulaEvaluation {
  if (!rawExpr || !rawExpr.trim()) {
    return { result: 0, hasOperator: false, isValid: true, formattedDisplay: '' };
  }

  const trimmed = rawExpr.trim();
  // Standardize operators: replace 'x', 'X' with '*', '÷' with '/', '–' or '—' with '-'
  const normalized = trimmed
    .replace(/[xX×]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[–—]/g, '-');

  // Check if any operator exists
  const hasOperator = /[+\-*/]/.test(normalized);

  if (!hasOperator) {
    const singleVal = normalizeSubValue(normalized);
    return {
      result: Math.max(0, singleVal),
      hasOperator: false,
      isValid: true,
      formattedDisplay: singleVal > 0 ? singleVal.toLocaleString('vi-VN') : '',
    };
  }

  // Split into tokens (numbers and operators)
  // Example: "500000 + 1000000" -> ["500000", "+", "1000000"]
  const regex = /([+\-*/])/g;
  const parts = normalized.split(regex).map(p => p.trim()).filter(p => p.length > 0);

  if (parts.length === 0) {
    return { result: 0, hasOperator: true, isValid: true, formattedDisplay: '' };
  }

  // Build list of numbers and operators
  const tokens: (number | string)[] = [];
  let displayParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (['+', '-', '*', '/'].includes(part)) {
      tokens.push(part);
      const symbol = part === '*' ? '×' : part === '/' ? '÷' : part;
      displayParts.push(` ${symbol} `);
    } else {
      const num = normalizeSubValue(part);
      tokens.push(num);
      displayParts.push(num > 0 ? num.toLocaleString('vi-VN') : '0');
    }
  }

  // If last token is an operator, evaluate up to the previous number
  let evalTokens = [...tokens];
  if (['+', '-', '*', '/'].includes(String(evalTokens[evalTokens.length - 1]))) {
    evalTokens.pop();
  }

  if (evalTokens.length === 0) {
    return {
      result: 0,
      hasOperator: true,
      isValid: true,
      formattedDisplay: displayParts.join(''),
    };
  }

  // Pass 1: Multiplication and Division
  const pass1: (number | string)[] = [];
  let i = 0;
  while (i < evalTokens.length) {
    const token = evalTokens[i];
    if (token === '*' || token === '/') {
      const prev = Number(pass1.pop() || 0);
      const next = Number(evalTokens[i + 1] || 0);
      let calculated = 0;
      if (token === '*') {
        calculated = prev * next;
      } else {
        calculated = next !== 0 ? Math.round(prev / next) : 0;
      }
      pass1.push(calculated);
      i += 2;
    } else {
      pass1.push(token);
      i++;
    }
  }

  // Pass 2: Addition and Subtraction
  let total = Number(pass1[0] || 0);
  let j = 1;
  while (j < pass1.length) {
    const op = String(pass1[j]);
    const nextVal = Number(pass1[j + 1] || 0);
    if (op === '+') {
      total += nextVal;
    } else if (op === '-') {
      total -= nextVal;
    }
    j += 2;
  }

  const finalResult = Math.max(0, Math.round(total));

  return {
    result: finalResult,
    hasOperator: true,
    isValid: !isNaN(finalResult),
    formattedDisplay: displayParts.join(''),
  };
}

/**
 * Format string display while typing or pasting math expressions
 */
export function formatExpressionPreview(rawStr: string): string {
  const parsed = evaluateMoneyExpression(rawStr);
  return parsed.formattedDisplay || rawStr;
}
