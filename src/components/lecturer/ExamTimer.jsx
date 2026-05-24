import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRemainingTimeMs } from '../../services/examService';

const formatTime = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const ExamTimer = ({ startedAt, durationMinutes, onTimeout }) => {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingTimeMs(startedAt, durationMinutes));
  const timeoutTriggeredRef = useRef(false);

  useEffect(() => {
    timeoutTriggeredRef.current = false;
    const tick = () => {
      const nextRemaining = getRemainingTimeMs(startedAt, durationMinutes);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0 && !timeoutTriggeredRef.current) {
        timeoutTriggeredRef.current = true;
        onTimeout?.();
      }
    };

    const interval = window.setInterval(tick, 1000);
    const initial = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(initial);
    };
  }, [startedAt, durationMinutes, onTimeout]);

  const tone = useMemo(() => {
    if (remainingMs <= 5 * 60 * 1000) return '#dc2626';
    if (remainingMs <= 10 * 60 * 1000) return '#f59e0b';
    return '#0d9488';
  }, [remainingMs]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: `${tone}14`,
        color: tone,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <i className="fas fa-clock"></i>
      <span>{formatTime(remainingMs)}</span>
    </div>
  );
};

export default ExamTimer;
