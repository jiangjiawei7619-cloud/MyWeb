import { motion, useReducedMotion } from 'motion/react';

type RollingNumberProps = {
  value: number;
  className?: string;
  digitClassName?: string;
  delay?: number;
  loops?: number;
};

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ROLLING_NUMBER_DURATION_SCALE = 1.356;

function buildDigitSequence(target: number, loops: number): string[] {
  return [
    ...Array.from({ length: loops }, () => DIGITS).flat(),
    ...DIGITS.slice(0, target + 1),
  ];
}

export default function RollingNumber({
  value,
  className = '',
  digitClassName = '',
  delay = 0,
  loops = 2,
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
        const sequence = buildDigitSequence(digit, loops);
        const finalIndex = sequence.length - 1;

        return (
          <span
            key={`${character}-${index}-${characters.length}`}
            className={`leetcode-rolling-number__window ${digitClassName}`}
            aria-hidden
          >
            <motion.span
              className="leetcode-rolling-number__track"
              initial={{ y: '0em', opacity: 0.14, filter: 'blur(3px) brightness(1.6)' }}
              animate={{ y: `-${finalIndex}em`, opacity: 1, filter: 'blur(0px) brightness(1)' }}
              transition={{
                delay: delay + index * 0.07,
                duration: (1.34 + index * 0.12) * ROLLING_NUMBER_DURATION_SCALE,
                ease: [0.12, 0.82, 0.16, 1],
              }}
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
