/**
 * Tests for AI Service — manual fallback calculation
 * Tests the calculateAssemblageFallback function without OpenAI dependency
 */

import { calculateAssemblageFallback } from '../services/ai-service.js';

// Mock lots data for testing
const mockLots = [
  {
    id: 'lot-uuid-1',
    lot_number: 'LOT-2024-001',
    name: 'Merlot Parcelle A',
    type: 'rouge',
    vintage_year: 2024,
    appellation: 'Saint-Émilion',
    current_volume_liters: 8000,
    latest_analysis: {
      alcohol_percent: 13.5,
      total_acidity_gl: 5.8,
      volatile_acidity_gl: 0.38,
      ph: 3.45,
      free_so2_mgl: 25,
      total_so2_mgl: 95,
      residual_sugar_gl: 1.8,
    },
  },
  {
    id: 'lot-uuid-2',
    lot_number: 'LOT-2024-002',
    name: 'Cabernet Franc Parcelle B',
    type: 'rouge',
    vintage_year: 2024,
    appellation: 'Saint-Émilion',
    current_volume_liters: 5000,
    latest_analysis: {
      alcohol_percent: 14.0,
      total_acidity_gl: 6.2,
      volatile_acidity_gl: 0.45,
      ph: 3.38,
      free_so2_mgl: 20,
      total_so2_mgl: 110,
      residual_sugar_gl: 1.5,
    },
  },
  {
    id: 'lot-uuid-3',
    lot_number: 'LOT-2024-003',
    name: 'Cabernet Sauvignon Terrasse',
    type: 'rouge',
    vintage_year: 2024,
    appellation: 'Saint-Émilion',
    current_volume_liters: 3000,
    latest_analysis: {
      alcohol_percent: 14.5,
      total_acidity_gl: 6.0,
      volatile_acidity_gl: 0.52,
      ph: 3.35,
      free_so2_mgl: 18,
      total_so2_mgl: 120,
      residual_sugar_gl: 1.2,
    },
  },
];

describe('calculateAssemblageFallback', () => {
  const TARGET_VOLUME = 10000;
  const TARGET_ANALYSIS = { alcohol_min: 13.0, alcohol_max: 14.5 };

  test('should return exactly 3 scenarios', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    expect(result.scenarios).toHaveLength(3);
    expect(result.calculation_method).toBe('manual_weighted_fallback');
  });

  test('each scenario should have required fields', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    result.scenarios.forEach(scenario => {
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBeDefined();
      expect(scenario.lots).toBeInstanceOf(Array);
      expect(scenario.lots.length).toBeGreaterThan(0);
      expect(scenario.predicted_analysis).toBeDefined();
      expect(typeof scenario.quality_score).toBe('number');
      expect(scenario.quality_score).toBeGreaterThanOrEqual(0);
      expect(scenario.quality_score).toBeLessThanOrEqual(100);
      expect(scenario.is_fallback).toBe(true);
    });
  });

  test('scenario lot percentages should sum approximately to 100', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    result.scenarios.forEach(scenario => {
      const total = scenario.lots.reduce((sum, l) => sum + l.percentage, 0);
      expect(total).toBeGreaterThanOrEqual(95);
      expect(total).toBeLessThanOrEqual(105); // Allow 5% rounding tolerance
    });
  });

  test('predicted analysis should have numeric values', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    result.scenarios.forEach(scenario => {
      if (scenario.predicted_analysis.alcohol_percent != null) {
        expect(typeof scenario.predicted_analysis.alcohol_percent).toBe('number');
        expect(scenario.predicted_analysis.alcohol_percent).toBeGreaterThan(0);
      }
    });
  });

  test('weighted analysis should be between min and max of source lots', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    const alcoholValues = mockLots.map(l => l.latest_analysis.alcohol_percent);
    const minAlc = Math.min(...alcoholValues);
    const maxAlc = Math.max(...alcoholValues);

    result.scenarios.forEach(scenario => {
      const predAlc = scenario.predicted_analysis.alcohol_percent;
      if (predAlc != null) {
        expect(predAlc).toBeGreaterThanOrEqual(minAlc - 0.1);
        expect(predAlc).toBeLessThanOrEqual(maxAlc + 0.1);
      }
    });
  });

  test('volatile acidity should be max of sources (not average)', () => {
    const result = calculateAssemblageFallback(mockLots, TARGET_VOLUME, TARGET_ANALYSIS);
    const maxAV = Math.max(...mockLots.map(l => l.latest_analysis.volatile_acidity_gl));

    result.scenarios.forEach(scenario => {
      const predAV = scenario.predicted_analysis.volatile_acidity_gl;
      if (predAV != null) {
        expect(predAV).toBeLessThanOrEqual(maxAV + 0.01);
      }
    });
  });

  test('should throw error with less than 2 lots', () => {
    expect(() => {
      calculateAssemblageFallback([mockLots[0]], TARGET_VOLUME, TARGET_ANALYSIS);
    }).toThrow('Au moins 2 lots requis');
  });

  test('should work with 2 lots minimum', () => {
    const result = calculateAssemblageFallback(
      mockLots.slice(0, 2), TARGET_VOLUME, TARGET_ANALYSIS
    );
    expect(result.scenarios.length).toBeGreaterThan(0);
  });

  test('lots without analyses should not crash', () => {
    const lotsNoAnalysis = mockLots.map(l => ({ ...l, latest_analysis: null }));
    expect(() => {
      calculateAssemblageFallback(lotsNoAnalysis, TARGET_VOLUME, TARGET_ANALYSIS);
    }).not.toThrow();
  });
});
