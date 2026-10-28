import { describe, expect, it } from 'vitest';
import { createSolarSystem, START_DATE } from '../src/core/scenario';
import { dateToJ2000Days } from '../src/core/units';

const system = createSolarSystem();
const planet = (id: string) => system.planetById(id)!;

describe('planet data entry', () => {
  it('periods match published sidereal periods (checks a)', () => {
    const expected: Record<string, number> = {
      mercury: 87.97, venus: 224.7, earth: 365.26, mars: 686.98,
      jupiter: 4332.6, saturn: 10759, uranus: 30687, neptune: 60190,
    };
    for (const [id, days] of Object.entries(expected)) {
      expect(Math.abs(planet(id).orbit.period - days) / days, id).toBeLessThan(0.003);
    }
  });

  it('perihelion distances match (checks e)', () => {
    const q = (id: string) => planet(id).orbit.elements.semiMajorAxis * (1 - planet(id).orbit.elements.eccentricity);
    expect(q('mercury')).toBeCloseTo(0.3075, 3);
    expect(q('earth')).toBeCloseTo(0.9833, 3);
  });

  it('Earth is at perihelion in early January (checks the ϖ / M₀ convention)', () => {
    const t = dateToJ2000Days(new Date(Date.UTC(2026, 0, 3)));
    expect(planet('earth').positionAt(t).length()).toBeCloseTo(0.9833, 3);
    const july = dateToJ2000Days(new Date(Date.UTC(2026, 6, 4)));
    expect(planet('earth').positionAt(july).length()).toBeCloseTo(1.0167, 3);
  });

  it('starts in 2026', () => {
    expect(START_DATE).toBeCloseTo(9496.5, 6);
  });
});
