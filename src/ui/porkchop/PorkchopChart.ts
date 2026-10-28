import type { PayoutTerms } from '../../core/contracts/Contract';
import type { Porkchop, PorkchopCell } from '../../core/transfer/Porkchop';
import type { TransferOption } from '../../core/transfer/TransferOption';
import { j2000DaysToDate } from '../../core/units';
import { DeltaVScale } from './colorScale';

const CELL = 6;
const MARGIN = { left: 52, top: 10, right: 12, bottom: 40 } as const;
const INK = { axis: '#3a4560', label: '#8a94a8', surface: '#0b0f18', hatch: '#283247', marker: '#ffffff', deadline: '#ffd166' };

export interface CellRef {
  readonly col: number;
  readonly row: number;
  readonly cell: PorkchopCell | undefined;
}

export interface PorkchopChartEvents {
  hover(ref: CellRef | undefined, clientX: number, clientY: number): void;
  select(ref: CellRef): void;
}

/** What the chart overlays for a carried contract: the full-pay boundary and a filter for it. */
export interface PayoutOverlay {
  readonly terms: PayoutTerms;
  paysInFull(option: TransferOption): boolean;
}

/** Canvas heatmap of total Δv over departure date (x) × time of flight (y, up = longer). */
export class PorkchopChart {
  readonly canvas: HTMLCanvasElement;
  readonly scale: DeltaVScale;
  private selected: CellRef | undefined;
  private readonly plotWidth: number;
  private readonly plotHeight: number;

  constructor(
    private readonly porkchop: Porkchop,
    private readonly payout: PayoutOverlay | undefined,
    private readonly events: PorkchopChartEvents,
  ) {
    const { columns, rows } = porkchop.spec;
    this.plotWidth = columns * CELL;
    this.plotHeight = rows * CELL;
    // Spend the colour bands on the region the player can actually book.
    const { min, maxFeasible } = deltaVRange(porkchop);
    this.scale = new DeltaVScale(min, Math.max(1.5, maxFeasible / min));

    this.canvas = document.createElement('canvas');
    const width = MARGIN.left + this.plotWidth + MARGIN.right;
    const height = MARGIN.top + this.plotHeight + MARGIN.bottom;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.getContext('2d')!.scale(dpr, dpr);

    this.canvas.addEventListener('mousemove', (e) => this.events.hover(this.hitTest(e), e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', (e) => this.events.hover(undefined, e.clientX, e.clientY));
    this.canvas.addEventListener('click', (e) => {
      const ref = this.hitTest(e);
      if (ref?.cell) this.select(ref);
    });
    this.draw();
  }

  get selection(): CellRef | undefined {
    return this.selected;
  }

  select(ref: CellRef): void {
    this.selected = ref;
    this.draw();
    this.events.select(ref);
  }

  /** Grid reference of the cheapest feasible cell, optionally only among full-pay options. */
  cheapestRef(fullPayOnly: boolean): CellRef | undefined {
    const accept = fullPayOnly && this.payout ? (o: TransferOption) => this.payout!.paysInFull(o) : undefined;
    const best = this.porkchop.cheapest(accept);
    if (!best) return undefined;
    for (let row = 0; row < this.porkchop.spec.rows; row++) {
      for (let col = 0; col < this.porkchop.spec.columns; col++) {
        if (this.porkchop.cell(col, row) === best) return { col, row, cell: best };
      }
    }
    return undefined;
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    const { columns, rows } = this.porkchop.spec;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const hatch = hatchPattern(ctx);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cell = this.porkchop.cell(col, row);
        const { x, y } = this.cellOrigin(col, row);
        ctx.fillStyle = !cell ? INK.surface : cell.feasible ? this.scale.color(cell.option.totalDeltaV) : hatch;
        ctx.fillRect(x, y, CELL, CELL);
      }
    }

    this.drawPayoutBoundary(ctx);
    this.drawMarker(ctx, this.cheapestRef(false), 'ring');
    if (this.selected) this.drawMarker(ctx, this.selected, 'box');
    this.drawAxes(ctx);
  }

  /**
   * Deadline contracts: arrival = departure + flight = deadline is a diagonal (full pay below it).
   * Travel-time contracts: flight ≤ ideal is a horizontal line (full pay below it).
   */
  private drawPayoutBoundary(ctx: CanvasRenderingContext2D): void {
    const terms = this.payout?.terms;
    if (!terms) return;
    const { departureFrom, departureTo } = this.porkchop.spec;
    const flightAt = (departure: number) => (terms.kind === 'deadline' ? terms.deadline - departure : terms.idealDays);
    const a = this.toPixel(departureFrom, flightAt(departureFrom));
    const b = this.toPixel(departureTo, flightAt(departureTo));
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, this.plotWidth, this.plotHeight);
    ctx.clip();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = INK.deadline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawMarker(ctx: CanvasRenderingContext2D, ref: CellRef | undefined, kind: 'ring' | 'box'): void {
    if (!ref) return;
    const { x, y } = this.cellOrigin(ref.col, ref.row);
    ctx.strokeStyle = INK.marker;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (kind === 'ring') ctx.arc(x + CELL / 2, y + CELL / 2, CELL + 2, 0, Math.PI * 2);
    else ctx.rect(x - 2, y - 2, CELL + 4, CELL + 4);
    ctx.stroke();
  }

  private drawAxes(ctx: CanvasRenderingContext2D): void {
    const { departureFrom, departureTo, minTimeOfFlight, maxTimeOfFlight } = this.porkchop.spec;
    const bottom = MARGIN.top + this.plotHeight;
    ctx.strokeStyle = INK.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left - 0.5, MARGIN.top - 0.5, this.plotWidth + 1, this.plotHeight + 1);
    ctx.fillStyle = INK.label;
    ctx.font = '11px ui-monospace, Menlo, monospace';

    ctx.textAlign = 'center';
    const monthStep = pickStep([3, 12, 24, 60, 120], (months) => (months * 30.44 * this.plotWidth) / (departureTo - departureFrom), 72);
    for (const t of monthStarts(departureFrom, departureTo, monthStep)) {
      const { x } = this.toPixel(t, minTimeOfFlight);
      ctx.fillRect(x, bottom, 1, 4);
      const iso = j2000DaysToDate(t).toISOString();
      ctx.fillText(monthStep >= 12 ? iso.slice(0, 4) : iso.slice(0, 7), x, bottom + 16);
    }
    ctx.fillText('departure date', MARGIN.left + this.plotWidth / 2, bottom + 34);

    ctx.textAlign = 'right';
    const span = maxTimeOfFlight - minTimeOfFlight;
    const inYears = maxTimeOfFlight > 2000;
    const unit = inYears ? 365.25 : 1;
    const step = unit * pickStep(inYears ? [1, 2, 5, 10] : [25, 50, 100, 200, 500], (s) => (s * unit * this.plotHeight) / span, 26);
    for (let tof = Math.ceil(minTimeOfFlight / step) * step; tof <= maxTimeOfFlight; tof += step) {
      const { y } = this.toPixel(departureFrom, tof);
      ctx.fillRect(MARGIN.left - 4, y, 4, 1);
      ctx.fillText(inYears ? `${Math.round(tof / unit)} y` : `${Math.round(tof)} d`, MARGIN.left - 7, y + 4);
    }
    ctx.save();
    ctx.translate(12, MARGIN.top + this.plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('flight time', 0, 0);
    ctx.restore();
  }

  private cellOrigin(col: number, row: number): { x: number; y: number } {
    return { x: MARGIN.left + col * CELL, y: MARGIN.top + (this.porkchop.spec.rows - 1 - row) * CELL };
  }

  private toPixel(departure: number, timeOfFlight: number): { x: number; y: number } {
    const { departureFrom, departureTo, minTimeOfFlight, maxTimeOfFlight, columns, rows } = this.porkchop.spec;
    const fx = (departure - departureFrom) / (departureTo - departureFrom);
    const fy = (timeOfFlight - minTimeOfFlight) / (maxTimeOfFlight - minTimeOfFlight);
    // Cell centres span the first to last sample, so map onto that span.
    return {
      x: MARGIN.left + CELL / 2 + fx * (columns - 1) * CELL,
      y: MARGIN.top + CELL / 2 + (1 - fy) * (rows - 1) * CELL,
    };
  }

  private hitTest(e: MouseEvent): CellRef | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left - MARGIN.left) / CELL);
    const rowFromTop = Math.floor((e.clientY - rect.top - MARGIN.top) / CELL);
    const row = this.porkchop.spec.rows - 1 - rowFromTop;
    if (col < 0 || row < 0 || col >= this.porkchop.spec.columns || row >= this.porkchop.spec.rows) return undefined;
    return { col, row, cell: this.porkchop.cell(col, row) };
  }
}

function deltaVRange(porkchop: Porkchop): { min: number; maxFeasible: number } {
  let min = Infinity;
  let maxFeasible = 0;
  for (let row = 0; row < porkchop.spec.rows; row++) {
    for (let col = 0; col < porkchop.spec.columns; col++) {
      const cell = porkchop.cell(col, row);
      if (!cell) continue;
      min = Math.min(min, cell.option.totalDeltaV);
      if (cell.feasible) maxFeasible = Math.max(maxFeasible, cell.option.totalDeltaV);
    }
  }
  return Number.isFinite(min) ? { min, maxFeasible: Math.max(maxFeasible, min) } : { min: 1, maxFeasible: 1 };
}

function hatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 6;
  const t = tile.getContext('2d')!;
  t.fillStyle = INK.surface;
  t.fillRect(0, 0, 6, 6);
  t.strokeStyle = INK.hatch;
  t.beginPath();
  t.moveTo(0, 6);
  t.lineTo(6, 0);
  t.stroke();
  return ctx.createPattern(tile, 'repeat') ?? INK.surface;
}

/** Smallest step whose on-screen spacing is at least `minPixels`. */
function pickStep(ladder: readonly number[], pixelsFor: (step: number) => number, minPixels: number): number {
  return ladder.find((step) => pixelsFor(step) >= minPixels) ?? ladder[ladder.length - 1]!;
}

/** J2000-day timestamps of month starts within [from, to] whose month index is a multiple of `monthStep`. */
function monthStarts(from: number, to: number, monthStep: number): number[] {
  const start = j2000DaysToDate(from);
  const result: number[] = [];
  for (let m = start.getUTCMonth() + 1; ; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), m, 1));
    const t = from + (d.getTime() - start.getTime()) / 86_400_000;
    if (t > to) break;
    const monthIndex = d.getUTCFullYear() * 12 + d.getUTCMonth();
    if (monthIndex % monthStep === 0) result.push(t);
  }
  return result;
}
