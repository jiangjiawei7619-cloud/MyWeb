import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import type { HeatmapDay } from '@/data/blogs';

export type CyberHeatmapProps = {
  title: string;
  subtitle?: string;
  totalLabel?: string;
  data: HeatmapDay[];
  variant: 'leetcode' | 'github';
};

export type CyberHeatmapGridProps = Pick<CyberHeatmapProps, 'data' | 'variant'>;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_LABELS = ['', 'MON', '', 'WED', '', 'FRI', ''];
const HEATMAP_BOOT_BASE_STEP_MS = 2.64;
const HEATMAP_BOOT_SLOW_TAIL_MS = 2080;
const HEATMAP_CELL_APPEAR_MS = 220;
const HEATMAP_FLASH_MIN_DELAY_MS = 0;
const HEATMAP_FLASH_MAX_DELAY_MS = 360;
const HEATMAP_FLASH_FAST_MS = 420;
const HEATMAP_FLASH_SLOW_MS = 1040;
const LEETCODE_HEATMAP_TIMING_SCALE = 0.9025;
const GITHUB_HEATMAP_TIMING_SCALE = 0.87;

function parseUTCDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function buildWeeks(data: HeatmapDay[]): Array<Array<HeatmapDay | null>> {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const firstDate = parseUTCDate(sorted[0].date);
  const leadingEmptyCells = firstDate.getUTCDay();
  const cells: Array<HeatmapDay | null> = [...Array.from({ length: leadingEmptyCells }, () => null), ...sorted];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<HeatmapDay | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function buildMonthLabels(weeks: Array<Array<HeatmapDay | null>>): string[] {
  let previousMonth = -1;

  return weeks.map((week, index) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return '';

    const date = parseUTCDate(firstDay.date);
    const month = date.getUTCMonth();
    const shouldShow = index === 0 || month !== previousMonth;
    previousMonth = month;
    return shouldShow ? MONTHS[month] : '';
  });
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function scaleHeatmapTiming(value: number, variant: CyberHeatmapProps['variant']): number {
  if (variant === 'leetcode') return Math.round(value * LEETCODE_HEATMAP_TIMING_SCALE);
  if (variant === 'github') return Math.round(value * GITHUB_HEATMAP_TIMING_SCALE);
  return value;
}

function getHeatmapCellAppearMs(variant: CyberHeatmapProps['variant']): number {
  return scaleHeatmapTiming(HEATMAP_CELL_APPEAR_MS, variant);
}

function getHeatmapBootDelay(index: number, total: number, variant: CyberHeatmapProps['variant']): number {
  if (total <= 1) return 0;
  const progress = index / (total - 1);
  return scaleHeatmapTiming(
    index * HEATMAP_BOOT_BASE_STEP_MS + progress * progress * progress * HEATMAP_BOOT_SLOW_TAIL_MS,
    variant,
  );
}

function getHeatmapFlashDelay(day: HeatmapDay, variant: CyberHeatmapProps['variant']): number {
  const random = seededUnit(`${variant}:${day.date}:flash-delay`);
  return scaleHeatmapTiming(
    HEATMAP_FLASH_MIN_DELAY_MS + random * (HEATMAP_FLASH_MAX_DELAY_MS - HEATMAP_FLASH_MIN_DELAY_MS),
    variant,
  );
}

function getHeatmapFlashDuration(day: HeatmapDay, variant: CyberHeatmapProps['variant']): number {
  const random = seededUnit(`${variant}:${day.date}:flash`);
  return scaleHeatmapTiming(HEATMAP_FLASH_FAST_MS + random * (HEATMAP_FLASH_SLOW_MS - HEATMAP_FLASH_FAST_MS), variant);
}

function getHeatmapFlashProfile(day: HeatmapDay, variant: CyberHeatmapProps['variant']): number {
  return Math.min(5, Math.floor(seededUnit(`${variant}:${day.date}:flash-profile`) * 6));
}

function toPx(value: number): string {
  return `${Number(value.toFixed(2))}px`;
}

function getHeatmapMotionVars(day: HeatmapDay, variant: CyberHeatmapProps['variant']): CSSProperties {
  const levelEnergy = 0.58 + day.level * 0.08;
  const xASeed = seededUnit(`${variant}:${day.date}:motion-x-a`) * 2 - 1;
  const yASeed = seededUnit(`${variant}:${day.date}:motion-y-a`) * 2 - 1;
  const xBSeed = seededUnit(`${variant}:${day.date}:motion-x-b`) * 2 - 1;
  const yBSeed = seededUnit(`${variant}:${day.date}:motion-y-b`) * 2 - 1;
  const scaleSeed = seededUnit(`${variant}:${day.date}:motion-scale`);
  const opacitySeed = seededUnit(`${variant}:${day.date}:motion-opacity`);
  const shiftBase = variant === 'leetcode' ? 1.38 : 1.06;
  const crossAxis = variant === 'leetcode' ? 0.86 : 0.68;
  const scaleBoost = variant === 'leetcode' ? 0.036 : 0.026;

  return {
    '--heatmap-shift-x-a': toPx(xASeed * shiftBase),
    '--heatmap-shift-y-a': toPx(yASeed * crossAxis),
    '--heatmap-shift-x-b': toPx(xBSeed * shiftBase * 0.78),
    '--heatmap-shift-y-b': toPx(yBSeed * crossAxis * 0.72),
    '--heatmap-shift-x-c': toPx(-xASeed * shiftBase * 0.46),
    '--heatmap-shift-y-c': toPx(-yBSeed * crossAxis * 0.54),
    '--heatmap-pulse-scale-a': (1 + scaleBoost + scaleSeed * scaleBoost + day.level * 0.004).toFixed(3),
    '--heatmap-pulse-scale-b': (1 + scaleBoost * 0.45 + (1 - scaleSeed) * scaleBoost * 0.52).toFixed(3),
    '--heatmap-dim-opacity-a': Math.max(0.5, 0.82 - levelEnergy * 0.19 - opacitySeed * 0.1).toFixed(3),
    '--heatmap-dim-opacity-b': Math.max(0.62, 0.9 - levelEnergy * 0.12 - (1 - opacitySeed) * 0.08).toFixed(3),
  } as CSSProperties;
}

type HeatmapCellProps = {
  day: HeatmapDay;
  variant: CyberHeatmapProps['variant'];
  bootDelay: number;
  flashDelay: number;
  flashDuration: number;
  cellAppearMs: number;
  booting: boolean;
  onHover: (day: HeatmapDay) => void;
  onClear: () => void;
};

const HeatmapCell = memo(function HeatmapCell({
  day,
  variant,
  bootDelay,
  flashDelay,
  flashDuration,
  cellAppearMs,
  booting,
  onHover,
  onClear,
}: HeatmapCellProps) {
  const flashProfile = getHeatmapFlashProfile(day, variant);

  return (
    <button
      type="button"
      className={`cyber-heatmap-cell cyber-heatmap-cell--motion-${flashProfile} ${
        booting ? 'cyber-heatmap-cell--boot' : ''
      } level-${day.level}`}
      aria-label={`${day.date}: ${day.count}`}
      style={
        booting
          ? ({
              animationDelay: `${bootDelay}ms, ${bootDelay + cellAppearMs + flashDelay}ms`,
              '--heatmap-cell-appear-duration': `${cellAppearMs}ms`,
              '--heatmap-flash-duration': `${flashDuration}ms`,
              ...getHeatmapMotionVars(day, variant),
            } as CSSProperties)
          : undefined
      }
      onMouseEnter={() => onHover(day)}
      onFocus={() => onHover(day)}
      onBlur={onClear}
    />
  );
});

export function CyberHeatmapGrid({ data, variant }: CyberHeatmapGridProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [bootingCells, setBootingCells] = useState(true);
  const weeks = useMemo(() => buildWeeks(data), [data]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);
  const handleHoverDay = useCallback((day: HeatmapDay) => setHoveredDay(day), []);
  const clearHoveredDay = useCallback(() => setHoveredDay(null), []);
  const gridStyle = {
    gridTemplateColumns:
      variant === 'github'
        ? `repeat(${Math.max(weeks.length, 1)}, minmax(0, 1fr))`
        : `repeat(${Math.max(weeks.length, 1)}, var(--heatmap-cell-size))`,
  } as CSSProperties;
  const cellAppearMs = getHeatmapCellAppearMs(variant);
  const maxBootDelay = useMemo(
    () => getHeatmapBootDelay(Math.max(data.length - 1, 0), data.length, variant),
    [data.length, variant],
  );

  useEffect(() => {
    setBootingCells(true);
    const bootDoneTimer = window.setTimeout(
      () => setBootingCells(false),
      maxBootDelay +
        cellAppearMs +
        scaleHeatmapTiming(HEATMAP_FLASH_MAX_DELAY_MS, variant) +
        scaleHeatmapTiming(HEATMAP_FLASH_SLOW_MS, variant),
    );
    return () => {
      window.clearTimeout(bootDoneTimer);
    };
  }, [cellAppearMs, data, maxBootDelay, variant]);

  let visibleCellIndex = 0;

  return (
    <div className="relative" onMouseLeave={() => setHoveredDay(null)}>
      <div className="cyber-heatmap-body">
        <div className="cyber-heatmap-weekdays" aria-hidden>
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>

        <div className="cyber-heatmap-scroll">
          <div className="cyber-heatmap-months" style={gridStyle} aria-hidden>
            {monthLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="cyber-heatmap-cells" style={gridStyle}>
            {weeks.flatMap((week, weekIndex) =>
              week.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <span
                      key={`empty-${weekIndex}-${dayIndex}`}
                      className="cyber-heatmap-cell cyber-heatmap-cell--empty"
                      aria-hidden
                    />
                  );
                }

                const bootDelay = getHeatmapBootDelay(visibleCellIndex, data.length, variant);
                const flashDelay = getHeatmapFlashDelay(day, variant);
                const flashDuration = getHeatmapFlashDuration(day, variant);
                visibleCellIndex += 1;

                return (
                  <HeatmapCell
                    key={day.date}
                    day={day}
                    variant={variant}
                    bootDelay={bootDelay}
                    flashDelay={flashDelay}
                    flashDuration={flashDuration}
                    cellAppearMs={cellAppearMs}
                    booting={bootingCells}
                    onHover={handleHoverDay}
                    onClear={clearHoveredDay}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div className="cyber-heatmap-footer">
        <div className="cyber-heatmap-legend" aria-hidden>
          <span>LESS</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`cyber-heatmap-cell level-${level}`} />
          ))}
          <span>MORE</span>
        </div>

        <div className={`cyber-heatmap-tooltip ${hoveredDay ? 'cyber-heatmap-tooltip--visible' : ''}`}>
          {hoveredDay ? `${hoveredDay.date} // ${hoveredDay.count}` : 'hover cell'}
        </div>
      </div>
    </div>
  );
}

export default function CyberHeatmap({ title, subtitle, totalLabel, data, variant }: CyberHeatmapProps) {
  const panelVariant = variant === 'leetcode' ? 'red' : 'cyan';

  return (
    <div className={`cyber-heatmap cyber-heatmap--${variant}`} data-variant={variant}>
      <BlogHudPanel
        variant={panelVariant}
        header={
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/90" aria-hidden>
                  {variant === 'leetcode' ? 'code_blocks' : 'hub'}
                </span>
                <h3 className="m-0 font-mono text-[13px] font-bold uppercase text-[#9cf8ff]">
                  {title}
                </h3>
              </div>
              {subtitle && (
                <p className="mt-1 font-mono text-[10px] uppercase text-white/42">{subtitle}</p>
              )}
            </div>
            {totalLabel && (
              <div className="font-mono text-[10px] font-bold uppercase text-white/55">
                {totalLabel}
              </div>
            )}
          </div>
        }
      >
        <CyberHeatmapGrid data={data} variant={variant} />
      </BlogHudPanel>
    </div>
  );
}
