import { describe, it, expect } from 'vitest';
import {
  money,
  micros,
  addMoney,
  subtractMoney,
  parseAmount,
  formatAmount,
  parseRate,
  formatRate,
  MICROS_PER_DOLLAR,
} from './money.js';

describe('Money Module', () => {
  describe('constants', () => {
    it('has correct micros per dollar', () => {
      expect(MICROS_PER_DOLLAR).toBe(10000);
    });
  });

  describe('Dinero integration', () => {
    it('creates money from micro-units', () => {
      const m = money(500001234);
      expect(micros(m)).toBe(500001234);
    });

    it('adds money correctly', () => {
      const a = money(1000000); // $100
      const b = money(502500);  // $50.25
      expect(micros(addMoney(a, b))).toBe(1502500);
    });

    it('subtracts money correctly', () => {
      const a = money(1000000); // $100
      const b = money(502500);  // $50.25
      expect(micros(subtractMoney(a, b))).toBe(497500);
    });
  });

  describe('UI boundary - amounts', () => {
    it('parses user input to micro-units', () => {
      expect(parseAmount('50000.1234')).toBe(500001234);
      expect(parseAmount('100')).toBe(1000000);
      expect(parseAmount('0.01')).toBe(100);
    });

    it('formats micro-units for display', () => {
      expect(formatAmount(500001234)).toBe('$50,000.12');
      expect(formatAmount(1000000)).toBe('$100.00');
      expect(formatAmount(100)).toBe('$0.01');
    });

    it('formats with custom decimals', () => {
      expect(formatAmount(500001234, 4)).toBe('$50,000.1234');
    });
  });

  describe('UI boundary - rates', () => {
    it('parses percentage to basis points', () => {
      expect(parseRate('5.5')).toBe(550);
      expect(parseRate('5.50')).toBe(550);
      expect(parseRate('10')).toBe(1000);
      expect(parseRate('0.5')).toBe(50);
    });

    it('formats basis points as percentage', () => {
      expect(formatRate(550)).toBe('5.50%');
      expect(formatRate(1000)).toBe('10.00%');
      expect(formatRate(50)).toBe('0.50%');
    });
  });
});
