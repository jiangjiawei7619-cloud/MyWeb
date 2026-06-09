import { useMemo, useState, type CSSProperties } from 'react';
import BlogHudPanel from '@/components/blogs/BlogHudPanel';
import type { HeatmapDay } from '@/data/blogs';

export type CyberHeatmapProps = {
  title: string;
  subtitle?: string;
  totalLabel?: string;
  data: HeatmapDay[];
  variant: 'leetcode' | 'github';
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_LABELS = ['', 'MON', '', 'WED', '', 'FRI', ''];

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

export default function CyberHeatmap({ title, subtitle, totalLabel, data, variant }: CyberHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const weeks = useMemo(() => buildWeeks(data), [data]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);
  const gridStyle = {
    gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, var(--heatmap-cell-size))`,
  } as CSSProperties;
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
        <div className="relative" onMouseLeave={() => setHoveredDay(null)}>
          <div className={`cyber-heatmap-tooltip ${hoveredDay ? 'cyber-heatmap-tooltip--visible' : ''}`}>
            {hoveredDay ? `${hoveredDay.date} // ${hoveredDay.count}` : 'hover cell'}
          </div>

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

                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={`cyber-heatmap-cell level-${day.level}`}
                        title={`${day.date}: ${day.count}`}
                        aria-label={`${day.date}: ${day.count}`}
                        onMouseEnter={() => setHoveredDay(day)}
                        onFocus={() => setHoveredDay(day)}
                        onBlur={() => setHoveredDay(null)}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          <div className="cyber-heatmap-legend" aria-hidden>
            <span>LESS</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`cyber-heatmap-cell level-${level}`} />
            ))}
            <span>MORE</span>
          </div>
        </div>
      </BlogHudPanel>
    </div>
  );
}
