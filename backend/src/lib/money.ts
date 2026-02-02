/**
 * Money Module
 *
 * All monetary values are integers in micro-units (10,000ths of a dollar).
 * $50,000.12 = 500001200 micro-units
 *
 * Interest rates are integers in basis points (1 bp = 0.01%).
 * 5.50% = 550 basis points
 *
 * Decimal conversion only happens at UI boundaries (input/display).
 */

import { dinero, toSnapshot, add, subtract, type Dinero } from 'dinero.js';
import { USD } from '@dinero.js/currencies';

export const AMOUNT_SCALE = 4;
export const MICROS_PER_DOLLAR = 10 ** AMOUNT_SCALE; // 10000

export type Money = Dinero<number>;

// ============================================================================
// Dinero Integration - work directly with integers
// ============================================================================

/** Create Money from micro-units (integer) */
export const money = (micros: number): Money =>
  dinero({ amount: micros, currency: USD, scale: AMOUNT_SCALE });

/** Get micro-units from Money */
export const micros = (m: Money): number =>
  toSnapshot(m).amount;

/** Add two Money values */
export const addMoney = (a: Money, b: Money): Money => add(a, b);

/** Subtract Money values */
export const subtractMoney = (a: Money, b: Money): Money => subtract(a, b);

// ============================================================================
// UI Boundary Conversions (input/display only)
// ============================================================================

/** Parse user input string to micro-units */
export const parseAmount = (input: string): number =>
  Math.round(parseFloat(input) * MICROS_PER_DOLLAR);

/** Format micro-units for display */
export const formatAmount = (micros: number, decimals = 2): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(micros / MICROS_PER_DOLLAR);

/** Parse percentage input to basis points */
export const parseRate = (percent: string): number =>
  Math.round(parseFloat(percent) * 100);

/** Format basis points for display */
export const formatRate = (bps: number): string =>
  `${(bps / 100).toFixed(2)}%`;
