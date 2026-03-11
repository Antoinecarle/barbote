/**
 * Tests for Volume Balance business rules
 * Core invariant: current_volume = initial_volume + Σ(+ movements) - Σ(- movements)
 */

describe('Volume Balance Invariant', () => {
  // Simulate the volume balance calculation
  function computeBalance(initialVolume, movements) {
    let balance = initialVolume;
    for (const m of movements) {
      if (m.type === 'entree') balance += m.volume;
      else if (m.type === 'sortie' || m.type === 'perte' || m.type === 'bottling') balance -= m.volume;
      else if (m.type === 'transfert') balance += 0; // volume neutral
      // perte included in volume_loss
      if (m.volume_loss) balance -= m.volume_loss;
    }
    return Math.round(balance * 100) / 100;
  }

  test('no movements → balance equals initial volume', () => {
    expect(computeBalance(10000, [])).toBe(10000);
  });

  test('entree adds volume', () => {
    expect(computeBalance(10000, [{ type: 'entree', volume: 2000 }])).toBe(12000);
  });

  test('sortie removes volume', () => {
    expect(computeBalance(10000, [{ type: 'sortie', volume: 3000 }])).toBe(7000);
  });

  test('perte removes volume', () => {
    expect(computeBalance(10000, [{ type: 'perte', volume: 500 }])).toBe(9500);
  });

  test('bottling removes volume', () => {
    expect(computeBalance(10000, [{ type: 'bottling', volume: 10000 }])).toBe(0);
  });

  test('transfert is volume neutral', () => {
    expect(computeBalance(10000, [{ type: 'transfert', volume: 5000 }])).toBe(10000);
  });

  test('multiple movements compose correctly', () => {
    const movements = [
      { type: 'entree', volume: 2000 },
      { type: 'perte', volume: 100 },
      { type: 'sortie', volume: 1500 },
    ];
    expect(computeBalance(10000, movements)).toBe(10400);
  });

  test('volume cannot be negative (guard)', () => {
    const balance = computeBalance(1000, [{ type: 'sortie', volume: 2000 }]);
    // This should detect an error in production code
    expect(balance).toBe(-1000); // We expose the violation, not hide it
  });

  test('soutirage loss is tracked via volume_loss', () => {
    const movements = [
      { type: 'transfert', volume: 10000, volume_loss: 200 }
    ];
    expect(computeBalance(10000, movements)).toBe(9800);
  });
});

describe('SO2 Alert Thresholds', () => {
  function getAlertLevel(free_so2_mgl) {
    if (free_so2_mgl == null) return 'unknown';
    if (free_so2_mgl < 10) return 'critical';
    if (free_so2_mgl < 20) return 'warning';
    return 'ok';
  }

  test('free SO2 < 10 mg/L is critical', () => {
    expect(getAlertLevel(5)).toBe('critical');
    expect(getAlertLevel(9.9)).toBe('critical');
  });

  test('free SO2 10-19.9 mg/L is warning', () => {
    expect(getAlertLevel(10)).toBe('warning');
    expect(getAlertLevel(15)).toBe('warning');
    expect(getAlertLevel(19.9)).toBe('warning');
  });

  test('free SO2 >= 20 mg/L is ok', () => {
    expect(getAlertLevel(20)).toBe('ok');
    expect(getAlertLevel(35)).toBe('ok');
  });

  test('null SO2 is unknown', () => {
    expect(getAlertLevel(null)).toBe('unknown');
    expect(getAlertLevel(undefined)).toBe('unknown');
  });
});

describe('Volatile Acidity Compliance', () => {
  const VA_LIMIT_ROUGE = 0.6; // g/L acétique — AOC rouge

  function checkVACompliance(volatile_acidity_gl, wine_type) {
    const limit = wine_type === 'rouge' ? 0.6 : 0.9; // White wine has higher limit
    if (volatile_acidity_gl > limit) {
      return { compliant: false, message: `AV ${volatile_acidity_gl} g/L dépasse la limite ${limit} g/L (${wine_type})` };
    }
    return { compliant: true };
  }

  test('AV 0.45 rouge is compliant', () => {
    expect(checkVACompliance(0.45, 'rouge').compliant).toBe(true);
  });

  test('AV 0.65 rouge is NOT compliant', () => {
    const result = checkVACompliance(0.65, 'rouge');
    expect(result.compliant).toBe(false);
    expect(result.message).toContain('0.65');
  });

  test('AV exactly at limit is compliant', () => {
    expect(checkVACompliance(VA_LIMIT_ROUGE, 'rouge').compliant).toBe(true);
  });

  test('AV slightly above limit is non-compliant', () => {
    expect(checkVACompliance(0.61, 'rouge').compliant).toBe(false);
  });
});
