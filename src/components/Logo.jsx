import { useState, useEffect, useRef } from 'react';

const EXPRESSIONS = [
  { name: 'normal', leftEyeScale: 1, rightEyeScale: 1, leftBrow: 0, rightBrow: 0 },
  { name: 'blink', leftEyeScale: 0.1, rightEyeScale: 0.1, leftBrow: 0, rightBrow: 0 },
  { name: 'wink-left', leftEyeScale: 0.1, rightEyeScale: 1, leftBrow: 0, rightBrow: 0 },
  { name: 'wink-right', leftEyeScale: 1, rightEyeScale: 0.1, leftBrow: 0, rightBrow: 0 },
  { name: 'surprised', leftEyeScale: 1.2, rightEyeScale: 1.2, leftBrow: -2, rightBrow: -2 },
  { name: 'skeptical', leftEyeScale: 1, rightEyeScale: 0.7, leftBrow: 0, rightBrow: 2 },
  { name: 'sleepy', leftEyeScale: 0.5, rightEyeScale: 0.5, leftBrow: 1, rightBrow: 1 },
];

export function Logo() {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [expression, setExpression] = useState(EXPRESSIONS[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const logoRef = useRef(null);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!logoRef.current) return;

      const rect = logoRef.current.getBoundingClientRect();
      const logoCenterX = rect.left + rect.width / 2;
      const logoCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - logoCenterX;
      const deltaY = e.clientY - logoCenterY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxOffset = 3;

      const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(maxOffset, distance / 50) : 0;
      const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(maxOffset, distance / 50) : 0;

      setEyeOffset({ x: normalizedX, y: normalizedY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Random expressions
  useEffect(() => {
    const doExpression = () => {
      if (isAnimating) return;

      setIsAnimating(true);

      // Pick a random expression (not normal)
      const funnyExpressions = EXPRESSIONS.filter(e => e.name !== 'normal');
      const randomExp = funnyExpressions[Math.floor(Math.random() * funnyExpressions.length)];

      setExpression(randomExp);

      // How long to hold the expression
      const holdTime = randomExp.name === 'blink' ? 150 :
                       randomExp.name.startsWith('wink') ? 300 :
                       800;

      setTimeout(() => {
        setExpression(EXPRESSIONS[0]); // Back to normal
        setIsAnimating(false);
      }, holdTime);
    };

    // Random interval between 2-6 seconds
    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 4000;
      return setTimeout(() => {
        doExpression();
        timerId = scheduleNext();
      }, delay);
    };

    let timerId = scheduleNext();

    return () => clearTimeout(timerId);
  }, [isAnimating]);

  const leftEyeScaleY = expression.leftEyeScale;
  const rightEyeScaleY = expression.rightEyeScale;

  return (
    <div ref={logoRef} className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Speech bubble body */}
        <path
          d="M4 6C4 4.89543 4.89543 4 6 4H30C31.1046 4 32 4.89543 32 6V24C32 25.1046 31.1046 26 30 26H12L6 32V26H6C4.89543 26 4 25.1046 4 24V6Z"
          fill="var(--bg-tertiary)"
          stroke="var(--accent-blue)"
          strokeWidth="2"
        />

        {/* Left eyebrow */}
        {expression.leftBrow !== 0 && (
          <line
            x1="10"
            y1={8 + expression.leftBrow}
            x2="16"
            y2={9 + expression.leftBrow}
            stroke="var(--accent-blue)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}

        {/* Right eyebrow */}
        {expression.rightBrow !== 0 && (
          <line
            x1="20"
            y1={9 + expression.rightBrow}
            x2="26"
            y2={8 + expression.rightBrow}
            stroke="var(--accent-blue)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}

        {/* Left eye white */}
        <ellipse
          cx="13"
          cy="14"
          rx="4"
          ry={4.5 * leftEyeScaleY}
          fill="white"
          style={{ transition: 'ry 0.1s ease' }}
        />
        {/* Left eye pupil */}
        {leftEyeScaleY > 0.3 && (
          <circle
            cx={13 + eyeOffset.x}
            cy={14 + eyeOffset.y}
            r={2 * Math.min(1, leftEyeScaleY)}
            fill="#1a1a2e"
            style={{ transition: 'r 0.1s ease' }}
          />
        )}

        {/* Right eye white */}
        <ellipse
          cx="23"
          cy="14"
          rx="4"
          ry={4.5 * rightEyeScaleY}
          fill="white"
          style={{ transition: 'ry 0.1s ease' }}
        />
        {/* Right eye pupil */}
        {rightEyeScaleY > 0.3 && (
          <circle
            cx={23 + eyeOffset.x}
            cy={14 + eyeOffset.y}
            r={2 * Math.min(1, rightEyeScaleY)}
            fill="#1a1a2e"
            style={{ transition: 'r 0.1s ease' }}
          />
        )}

        {/* Mouth - changes based on expression */}
        {expression.name === 'surprised' ? (
          <ellipse cx="18" cy="21" rx="2" ry="2.5" fill="var(--accent-blue)" />
        ) : (
          <path
            d="M12 20C12 20 14.5 22 18 22C21.5 22 24 20 24 20"
            stroke="var(--accent-blue)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Code lines decoration */}
        <line x1="8" y1="8" x2="12" y2="8" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" />
        <line x1="24" y1="8" x2="28" y2="8" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" />
      </svg>

      <span style={{
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap'
      }}>
        Gist Commenter
      </span>
    </div>
  );
}
