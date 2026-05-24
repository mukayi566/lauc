import React, { useCallback, useEffect, useRef, useState } from 'react';

const warningText = {
  1: 'Warning: stay on this exam tab and remain in fullscreen.',
  2: 'Final warning: one more violation will auto-submit this exam.',
};

const ExamSecurityWrapper = ({
  enabled,
  violationCount,
  onViolation,
  onAutoSubmit,
  children,
}) => {
  const [banner, setBanner] = useState('');
  const [fullscreenReady, setFullscreenReady] = useState(() => !enabled || Boolean(document.fullscreenElement));
  const lastViolationAtRef = useRef(0);

  const syncFullscreenState = useCallback(() => {
    const inFullscreen = Boolean(document.fullscreenElement);
    setFullscreenReady(!enabled || inFullscreen);
    return inFullscreen;
  }, [enabled]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenReady(true);
    } catch {
      setFullscreenReady(false);
    }
  }, []);

  const registerViolation = useCallback(async (reason) => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastViolationAtRef.current < 1500) return;
    lastViolationAtRef.current = now;

    const nextCount = await onViolation?.(reason);
    if (nextCount >= 3) {
      setBanner('Exam auto-submitted after repeated security violations.');
      onAutoSubmit?.('security');
      return;
    }

    setBanner(warningText[nextCount] || 'Security warning.');
    window.setTimeout(() => setBanner(''), 5000);
  }, [enabled, onAutoSubmit, onViolation]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation('visibilitychange');
      }
    };

    const handleBlur = () => {
      registerViolation('blur');
    };

    const handleFullscreenChange = () => {
      const inFullscreen = syncFullscreenState();
      if (!inFullscreen) {
        registerViolation('fullscreen-exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, registerViolation, syncFullscreenState]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (violationCount >= 3) {
      onAutoSubmit?.('security');
    }
  }, [enabled, violationCount, onAutoSubmit]);

  return (
    <div style={{ position: 'relative' }}>
      {enabled && !fullscreenReady && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            background: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            <i className="fas fa-expand" style={{ marginRight: 8 }}></i>
            Fullscreen required
          </div>
          <p style={{ margin: '0 0 12px' }}>
            Anti-cheat is enabled for this exam. Enter fullscreen to continue.
          </p>
          <button className="sd-btn sd-btn-primary" onClick={requestFullscreen}>
            Enter Fullscreen
          </button>
        </div>
      )}

      {(banner || (enabled && violationCount > 0 && violationCount < 3)) && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: violationCount >= 2 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${violationCount >= 2 ? '#fca5a5' : '#fcd34d'}`,
            color: violationCount >= 2 ? '#b91c1c' : '#92400e',
            fontWeight: 600,
          }}
        >
          {banner || warningText[violationCount]}
        </div>
      )}

      {children}
    </div>
  );
};

export default ExamSecurityWrapper;
