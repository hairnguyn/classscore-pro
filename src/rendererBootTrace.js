/**
 * Log khởi động renderer: luôn in console (DevTools) + gửi main ghi file classscore-debug.log.
 * Cài sớm global error / unhandledrejection khi module được load.
 */

export function bootTrace(msg, detail) {
  const t = typeof performance !== 'undefined' && performance.now ? Math.round(performance.now()) : 0;
  const extra =
    detail !== undefined
      ? ` ${typeof detail === 'object' ? JSON.stringify(detail) : String(detail)}`
      : '';
  const line = `[+${t}ms] ${msg}${extra}`;
  // eslint-disable-next-line no-console
  console.log('[ClassScore boot]', line);
  try {
    if (typeof window !== 'undefined' && window.api && typeof window.api.rendererLog === 'function') {
      window.api.rendererLog(line);
    }
  } catch {
    /* ignore */
  }
}

(function installGlobalBootTrace() {
  if (typeof window === 'undefined') return;
  if (window.__CLASSSCORE_BOOT_TRACE__) return;
  window.__CLASSSCORE_BOOT_TRACE__ = true;

  window.addEventListener(
    'error',
    (e) => {
      bootTrace('window.error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error && e.error.stack,
      });
    },
    true,
  );

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    bootTrace('unhandledrejection', {
      message: r && (r.message || String(r)),
      stack: r && r.stack,
    });
  });

  bootTrace('rendererBootTrace.js installed (global error listeners)');
})();
