export interface PerKgCalculationResult {
  totalPrice: number;
  totalWeightKg: number;
  totalGrams: number;
  perKgPrice: number;
  perGramPrice: number;
  per100GramPrice: number;
}

export interface PerKgCalculationOutcome {
  result: PerKgCalculationResult | null;
  error: string | null;
}

/**
 * Calculates per-KG, per-100g, and per-Gram price from total pack price
 * and combined KG + Gram weights.
 *
 * Uses gram-level scaled arithmetic to minimize IEEE-754 floating-point drift.
 */
export function calculatePerKgPrice(
  priceInput: string,
  kgInput: string,
  gramInput: string
): PerKgCalculationOutcome {
  const trimmedPrice = priceInput.trim();
  const trimmedKg = kgInput.trim();
  const trimmedGram = gramInput.trim();

  const price = parseFloat(trimmedPrice);
  const kgs = trimmedKg === '' ? 0 : parseFloat(trimmedKg);
  const grams = trimmedGram === '' ? 0 : parseFloat(trimmedGram);

  if (trimmedPrice !== '' && (isNaN(price) || price <= 0)) {
    return {
      result: null,
      error: 'कुल पैक मूल्य 0 से अधिक होना चाहिए।',
    };
  }

  if (trimmedKg !== '' && (isNaN(kgs) || kgs < 0)) {
    return {
      result: null,
      error: 'किलोग्राम वजन नकारात्मक नहीं हो सकता।',
    };
  }

  if (trimmedGram !== '' && (isNaN(grams) || grams < 0)) {
    return {
      result: null,
      error: 'अतिरिक्त ग्राम वजन नकारात्मक नहीं हो सकता।',
    };
  }

  if (trimmedPrice === '' || (trimmedKg === '' && trimmedGram === '')) {
    return {
      result: null,
      error: null,
    };
  }

  const totalGramsRaw = Math.round((kgs * 1000 + grams) * 1e6) / 1e6;
  if (totalGramsRaw <= 0) {
    return {
      result: null,
      error: 'कुल वजन 0 से अधिक होना चाहिए।',
    };
  }

  const totalWeightKgRaw = totalGramsRaw / 1000;
  const rawPerKg = price / totalWeightKgRaw;
  const rawPerGram = price / totalGramsRaw;
  const rawPer100Gram = rawPerGram * 100;

  return {
    result: {
      totalPrice: parseFloat(price.toFixed(2)),
      totalWeightKg: parseFloat(totalWeightKgRaw.toFixed(4)),
      totalGrams: parseFloat(totalGramsRaw.toFixed(2)),
      perKgPrice: parseFloat((Math.round((rawPerKg + Number.EPSILON) * 100) / 100).toFixed(2)),
      perGramPrice: parseFloat((Math.round((rawPerGram + Number.EPSILON) * 10000) / 10000).toFixed(4)),
      per100GramPrice: parseFloat((Math.round((rawPer100Gram + Number.EPSILON) * 100) / 100).toFixed(2)),
    },
    error: null,
  };
}
