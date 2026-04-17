
/**
 * Replaces m3e-ripple with md-ripple if the parent has position: relative.
 * Traverses Shadow DOMs recursively.
 */

function replaceRippleInRoot(root) {
  if (!root) return;

  // 1. Find and replace m3e-ripple in the current root
  const m3eRipples = root.querySelectorAll('m3e-ripple');
  m3eRipples.forEach(m3eRipple => {
    const parent = m3eRipple.parentElement;
    if (parent) {
      const style = getComputedStyle(parent);
      if (style.position === 'relative') {
        // Special logic for m3e-nav-rail items
        let targetContainer = null;
        let shouldReplace = true;

        if (root.host && root.host.tagName.includes('NAV-ITEM')) {
            const navRail = root.host.closest('m3e-nav-rail');
            if (navRail && !navRail.classList.contains('-compact')) {
                const stateLayer = root.querySelector('m3e-state-layer');
                if (stateLayer) {
                    targetContainer = stateLayer;
                    shouldReplace = false;
                }
            }
        }

        // Check if md-ripple already exists
        const existingMdRipple = parent.querySelector('md-ripple') || (targetContainer && targetContainer.querySelector('md-ripple'));

        if (!existingMdRipple) {
          const mdRipple = document.createElement('md-ripple');
          
          if (targetContainer) {
              targetContainer.appendChild(mdRipple);
              m3eRipple.remove();
          } else {
              m3eRipple.replaceWith(mdRipple);
          }
        } else {
             m3eRipple.remove(); // Just remove if md-ripple is already there
        }
      }
    }
  });

  // 2. Traverse children to find Shadow Roots
  const allElements = root.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.shadowRoot) {
      replaceRippleInRoot(el.shadowRoot);
      observeRoot(el.shadowRoot); // Observe new shadow roots
    }
  });
}

function observeRoot(root) {
    if (root.__rippleObserverAttached) return;
    root.__rippleObserverAttached = true;

    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                shouldScan = true;
                break;
            }
        }
        if (shouldScan) {
           replaceRippleInRoot(root);
        }
    });

    observer.observe(root, { childList: true, subtree: true });
    // Audit existing nodes immediately
    replaceRippleInRoot(root);
}

// Start observing the main document
observeRoot(document.body);
