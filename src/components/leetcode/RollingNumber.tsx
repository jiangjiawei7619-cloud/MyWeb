import { motion, useReducedMotion } from 'motion/react';

type RollingNumberProps = {
  value: number;
  className?: string;
  digitClassName?: string;
  delay?: number;
  loops?: number;
  rollDistance?: number;
  durationScale?: number;
  digitDelay?: number;
  initialOpacity?: number;
};

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ROLLING_NUMBER_DURATION_SCALE = 1.356;
const CYCLE_OFFSETS = [3, 7, 1, 5, 9, 2, 6, 0, 4, 8];

function buildCyclePart(loops: number, cycleOffset: number): string[] {
  if (loops <= 0) return [];

  const fullCycle = Array.from({ length: loops }, () => DIGITS).flat();
  const offset = ((cycleOffset % 10) + 10) % 10;
  return [...fullCycle.slice(offset), ...fullCycle.slice(0, offset)];
}

function buildNearTargetSequence(target: number, rollDistance: number): string[] {
  const steps = Math.max(1, rollDistance);
  const start = (target - steps + 10) % 10;

  if (start <= target) {
    return DIGITS.slice(start, target + 1);
  }

  return [...DIGITS.slice(start), ...DIGITS.slice(0, target + 1)];
}

function buildForwardLanding(fromDigit: number, target: number): string[] {
  const sequence = [String(fromDigit)];
  let current = fromDigit;

  while (current !== target) {
    current = (current + 1) % 10;
    sequence.push(String(current));
  }

  return sequence;
}

function buildDigitSequence(
  target: number,
  loops: number,
  rollDistance: number,
  cycleOffset: number,
): string[] {
  const cyclePart = buildCyclePart(loops, cycleOffset);

  if (cyclePart.length === 0) {
    return buildNearTargetSequence(target, rollDistance);
  }

  const cycleEnd = Number(cyclePart[cyclePart.length - 1]);
  const landing = buildForwardLanding(cycleEnd, target);

  if (landing[0] === String(cycleEnd)) {
    return [...cyclePart, ...landing.slice(1)];
  }

  return [...cyclePart, ...landing];
}

export default function RollingNumber({
  value,
  className = '',
  digitClassName = '',
  delay = 0,
  loops = 1,
  rollDistance = 4,
  durationScale = ROLLING_NUMBER_DURATION_SCALE,
  digitDelay = 0.07,
  initialOpacity = 0.14,
}: RollingNumberProps) {
  const reducedMotion = useReducedMotion();
  const characters = String(Math.max(0, Math.trunc(value))).split('');

  if (reducedMotion) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={`leetcode-rolling-number ${className}`} aria-label={String(value)}>
      {characters.map((character, index) => {
        const digit = Number(character);
        const cycleOffset = CYCLE_OFFSETS[(index + digit) % CYCLE_OFFSETS.length];
        const sequence = buildDigitSequence(digit, loops, rollDistance, cycleOffset);
        const finalIndex = sequence.length - 1;

        return (
          <span
            key={`${character}-${index}-${characters.length}`}
            className={`leetcode-rolling-number__window ${digitClassName}`}
            aria-hidden
          >
            <motion.span
              className="leetcode-rolling-number__track"
              initial={{ y: '0em', opacity: initialOpacity }}
              animate={{ y: `-${finalIndex}em`, opacity: 1 }}
              transition={{
                delay: delay + index * digitDelay,
                duration: (1.34 + index * 0.12) * durationScale,
                ease: [0.08, 0.86, 0.14, 1],
              }}
              style={{ willChange: 'transform, opacity' }}
            >
              {sequence.map((item, sequenceIndex) => (
                <span key={`${item}-${sequenceIndex}`} className="leetcode-rolling-number__digit">
                  {item}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
