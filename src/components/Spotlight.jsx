import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';

const Spotlight = ({ 
  targetId, 
  messageVi, 
  messageEn, 
  onNext, 
  onSkip,
  onClose,
  showNext = true,
  showSkip = true,
  showClose = false,
  isLast = false,
  position = 'bottom'
}) => {
  const [rect, setRect] = useState(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const updateRect = () => {
      const el = document.getElementById(targetId);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();
    const interval = setInterval(updateRect, 100); // Poll for position changes (e.g. scrolling/dialogs)
    
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [targetId]);

  const spotlightStyle = useMemo(() => {
    if (!rect) return { display: 'none' };
    
    const padding = 8;
    const top = rect.top - padding;
    const left = rect.left - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    return {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000000000,
      pointerEvents: 'none',
      maskImage: `radial-gradient(circle at ${left + width/2}px ${top + height/2}px, transparent ${Math.max(width, height)/2}px, black ${Math.max(width, height)/2 + 2}px)`,
      WebkitMaskImage: `radial-gradient(circle at ${left + width/2}px ${top + height/2}px, transparent ${Math.max(width, height)/2}px, black ${Math.max(width, height)/2 + 2}px)`,
      transition: 'mask-image 0.3s ease-out, -webkit-mask-image 0.3s ease-out'
    };
  }, [rect]);

  const tooltipStyle = useMemo(() => {
    if (!rect) return { display: 'none' };

    const gap = 16;
    let top = 0;
    let left = rect.left + rect.width / 2;

    if (position === 'bottom') {
        top = rect.bottom + gap;
    } else if (position === 'top') {
        top = rect.top - gap - 120; // estimate tooltip height
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--md-sys-color-surface-container-high)',
      color: 'var(--md-sys-color-on-surface)',
      padding: '16px',
      borderRadius: '16px',
      boxShadow: 'var(--md-sys-elevation-3)',
      zIndex: 1000000001,
      minWidth: '250px',
      maxWidth: '350px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'auto',
      animation: 'fadeInUp 0.3s ease-out'
    };
  }, [rect, position]);

  if (!rect && targetId) return null;

  // Fallback for global message (no target)
  const overlayStyle = !targetId ? {
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000000002,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto'
  } : null;

  const content = (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .tutorial-content {
          font-family: var(--md-sys-typescale-body-medium-font);
          line-height: 1.5;
        }
      `}</style>
      
      {targetId ? (
        <>
          <div style={spotlightStyle} />
          <div style={tooltipStyle} className="tutorial-tooltip">
            <div className="tutorial-content">
              <span className="vi">{messageVi}</span>
              <span className="en">{messageEn}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {showClose && (
                <m3e-button variant="text" onClick={onClose}>
                   <span className="vi">Đóng</span><span className="en">Close</span>
                </m3e-button>
              )}
              {showSkip && (
                <m3e-button variant="text" onClick={onSkip}>
                  <span className="vi">Bỏ qua</span><span className="en">Skip</span>
                </m3e-button>
              )}
              {showNext && (
                <m3e-button variant="filled" onClick={onNext}>
                  {isLast ? (
                    <><span className="vi">Hoàn tất</span><span className="en">Finish</span></>
                  ) : (
                    <><span className="vi">Tiếp theo</span><span className="en">Next</span></>
                  )}
                </m3e-button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={overlayStyle} className="tutorial-welcome-overlay" onClick={(e) => e.stopPropagation()}>
          <div style={{ 
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            padding: '24px',
            borderRadius: '28px',
            maxWidth: '400px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--md-sys-elevation-3)'
          }}>
             <img src="./ico/default_128_windows.png" style={{width: '64px', margin: '0 auto'}} />
             <div className="tutorial-content">
                <span className="vi" style={{fontSize: '18px', fontWeight: 'bold'}}>{messageVi}</span>
                <span className="en" style={{fontSize: '18px', fontWeight: 'bold'}}>{messageEn}</span>
             </div>
             <div style={{display: 'flex', justifyContent: 'center', gap: '8px'}}>
                <m3e-button variant="tonal" onClick={onClose}><span className="vi">Để sau</span><span className="en">Later</span></m3e-button>
                <m3e-button variant="filled" onClick={onNext}><span className="vi">Bắt đầu</span><span className="en">Get Started</span></m3e-button>
             </div>
          </div>
        </div>
      )}
    </>
  );

  return ReactDOM.createPortal(content, document.getElementById('tutorial-root'));
};

export default Spotlight;
