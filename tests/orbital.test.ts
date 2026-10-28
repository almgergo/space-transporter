import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/core/math/Vec2';
import { ConicArc, propagate } from '../src/core/orbital/ConicArc';
import { hohmann, synodicPeriod } from '../src/core/orbital/hohmann';
import { KeplerOrbit, solveKepler } from '../src/core/orbital/KeplerOrbit';
import { solveLambert } from '../src/core/orbital/lambert';
import type { StateVector } from '../src/core/orbital/StateVector';
import { auPerDayToKms, DEG, MU_SUN } from '../src/core/units';

const mu = MU_SUN;
const R_MARS = 1.52368;
const energy = ({ r, v }: StateVector) => v.dot(v) / 2 - mu / r.length();
const momentum = ({ r, v }: StateVector) => r.cross(v);
const relErr = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-15);

describe('Kepler equation', () => {
  it('satisfies M = E − e sin E', () => {
    for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
      for (const M of [0.1, 1, 3, 5]) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 10);
      }
    }
  });
});

describe('KeplerOrbit', () => {
  it('circular orbit has constant radius and circular speed', () => {
    const orbit = KeplerOrbit.circular(1, 0, 0, mu);
    const s = orbit.stateAt(123.4);
    expect(s.r.length()).toBeCloseTo(1, 12);
    expect(s.v.length()).toBeCloseTo(Math.sqrt(mu), 12);
    expect(orbit.period).toBeCloseTo(365.25, 0);
  });

  it('elliptical orbit conserves energy and has correct perihelion', () => {
    const orbit = new KeplerOrbit(
      { semiMajorAxis: 1.5, eccentricity: 0.3, longitudeOfPerihelion: 0.7, meanAnomalyAtEpoch: 0, epoch: 0 },
      mu,
    );
    const s0 = orbit.stateAt(0);
    expect(s0.r.length()).toBeCloseTo(1.5 * 0.7, 12);
    expect(s0.r.angle()).toBeCloseTo(0.7, 12);
    const s1 = orbit.stateAt(300);
    expect(relErr(energy(s1), energy(s0))).toBeLessThan(1e-10);
    expect(relErr(momentum(s1), momentum(s0))).toBeLessThan(1e-10);
  });
});

describe('ConicArc (universal propagation)', () => {
  const cases: Array<[string, number]> = [
    ['elliptic', 1.1],
    ['near-parabolic', Math.sqrt(2 - 0.01) * 0.999999],
    ['hyperbolic', 1.8],
  ];
  for (const [name, speedFactor] of cases) {
    it(`conserves energy and angular momentum (${name})`, () => {
      const s0 = { r: new Vec2(1, 0), v: new Vec2(0.1 * Math.sqrt(mu), Math.sqrt(mu) * speedFactor) };
      for (const dt of [10, 200, 2000]) {
        const s = propagate(s0, dt, mu);
        // Near-parabolic energy is ~0, so compare against the kinetic-energy scale instead.
        expect(Math.abs(energy(s) - energy(s0)) / (mu / 1)).toBeLessThan(1e-10);
        expect(relErr(momentum(s), momentum(s0))).toBeLessThan(1e-10);
      }
    });
  }

  it('reproduces a KeplerOrbit from its state', () => {
    const orbit = new KeplerOrbit(
      { semiMajorAxis: 1.3, eccentricity: 0.2, longitudeOfPerihelion: 1, meanAnomalyAtEpoch: 0.4, epoch: 50 },
      mu,
    );
    const arc = new ConicArc(orbit.stateAt(80), 80, mu);
    for (const t of [80, 200, 1000, -300]) {
      const expected = orbit.stateAt(t);
      const actual = arc.stateAt(t);
      expect(actual.r.distanceTo(expected.r)).toBeLessThan(1e-9);
      expect(actual.v.distanceTo(expected.v)).toBeLessThan(1e-11);
    }
  });
});

describe('Hohmann reference', () => {
  it('matches known Earth → Mars numbers', () => {
    const h = hohmann(1, R_MARS, mu);
    expect(h.timeOfFlight).toBeCloseTo(258.9, 1);
    expect(auPerDayToKms(h.deltaV1)).toBeCloseTo(2.94, 2);
    expect(auPerDayToKms(h.deltaV2)).toBeCloseTo(2.65, 2);
    expect(h.phaseAngle / DEG).toBeCloseTo(44.3, 1);
    expect(synodicPeriod(365.25, 686.98)).toBeCloseTo(779.9, 0);
  });
});

describe('Lambert solver', () => {
  const h = hohmann(1, R_MARS, mu);
  const vEarth = Math.sqrt(mu);
  const vMars = Math.sqrt(mu / R_MARS);

  it('approaches the Hohmann solution near a 180° transfer', () => {
    for (const offset of [1e-3, 1e-9, 0]) {
      const r1 = new Vec2(1, 0);
      const r2 = Vec2.fromPolar(R_MARS, Math.PI - offset);
      const sol = solveLambert(r1, r2, h.timeOfFlight, mu);
      expect(sol).toBeDefined();
      expect(relErr(sol!.v1.length() - vEarth, h.deltaV1)).toBeLessThan(0.01);
      expect(relErr(vMars - sol!.v2.length(), h.deltaV2)).toBeLessThan(0.01);
    }
  });

  it('round-trips: propagating v1 for tof lands on r2', () => {
    const geometries: Array<[number, number, number]> = [
      [R_MARS, 100 * DEG, 150],
      [R_MARS, 250 * DEG, 400],
      [R_MARS, Math.PI - 1e-9, 259],
      [0.72, 60 * DEG, 40], // short, fast, inward
      [R_MARS, 30 * DEG, 20], // very short → hyperbolic
    ];
    for (const [radius, angle, tof] of geometries) {
      const r1 = new Vec2(1, 0);
      const r2 = Vec2.fromPolar(radius, angle);
      const sol = solveLambert(r1, r2, tof, mu);
      expect(sol, `angle ${angle} tof ${tof}`).toBeDefined();
      const end = propagate({ r: r1, v: sol!.v1 }, tof, mu);
      expect(end.r.distanceTo(r2) / radius).toBeLessThan(2e-6);
      expect(end.v.distanceTo(sol!.v2)).toBeLessThan(1e-6 * sol!.v2.length());
    }
  });

  it('recovers circular velocity for two points on the same circle', () => {
    const n = Math.sqrt(mu);
    const tof = 90;
    const sol = solveLambert(new Vec2(1, 0), Vec2.fromPolar(1, n * tof), tof, mu)!;
    expect(sol.v1.x).toBeCloseTo(0, 9);
    expect(sol.v1.y).toBeCloseTo(vEarth, 9);
  });

  it('rejects degenerate geometry', () => {
    expect(solveLambert(new Vec2(1, 0), new Vec2(1.5, 0), 100, mu)).toBeUndefined();
    expect(solveLambert(new Vec2(1, 0), new Vec2(0, 1.5), 0, mu)).toBeUndefined();
  });
});
