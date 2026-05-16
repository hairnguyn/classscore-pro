(function() {
    let activeSwitch = null;
    let startX = 0;
    let initialLogicalLeft = 0; // 0 to maxRange
    let hasMoved = false;
    let bounds = { off: 2, on: 30, range: 28 };
    let holdTimeout = null;
    
    const DRAG_THRESHOLD = 3;
    const HOLD_DELAY = 150; // ms to Wait before expanding if not moving

    function getBounds(sw, knob) {
        const swWidth = sw.offsetWidth;
        const knobWidth = knob.offsetWidth;
        const off = 2; 
        const on = swWidth - knobWidth - 2;
        return { off, on, range: on - off };
    }

    function expandKnob(sw) {
        const knob = sw.querySelector('.knob');
        if (knob) knob.classList.add('expanding');
    }

    function updateSwitchUI(sw, percent) {
        const knob = sw.querySelector('.knob');
        if (!knob) return;
        const currentLeft = bounds.off + (bounds.range * percent);
        knob.style.transition = 'none';
        knob.style.left = currentLeft + 'px';
        const isDark = document.body.classList.contains('dark');
        const startColor = isDark ? [68, 68, 68] : [224, 224, 224];
        const endColor = [11, 87, 208];
        const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * percent);
        const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * percent);
        const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * percent);
        sw.style.background = `rgb(${r}, ${g}, ${b})`;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
                const sw = mutation.target;
                if (activeSwitch && sw === activeSwitch) return;
                const knob = sw.querySelector('.knob');
                if (knob) {
                    knob.style.left = '';
                    knob.style.transition = '';
                    sw.style.background = '';
                }
            }
        });
    });

    function initSwitch(sw) {
        if (sw._initialized) return;
        observer.observe(sw, { attributes: true });
        sw._initialized = true;
    }

    document.addEventListener('mouseover', function(e) {
        const sw = e.target.closest('.switch');
        if (sw) initSwitch(sw);
    });

    document.addEventListener('mousedown', function(e) {
        const sw = e.target.closest('.switch');
        if (!sw) return;
        initSwitch(sw);
        
        const knob = sw.querySelector('.knob');
        activeSwitch = sw;
        startX = e.clientX;
        bounds = getBounds(sw, knob);
        const actualLeft = parseFloat(getComputedStyle(knob).left) || bounds.off;
        initialLogicalLeft = actualLeft - bounds.off;
        hasMoved = false;
        
        sw.style.transition = 'none';
        
        // Start hold timer
        clearTimeout(holdTimeout);
        holdTimeout = setTimeout(() => {
            if (activeSwitch === sw) expandKnob(sw);
        }, HOLD_DELAY);
    });

    document.addEventListener('mousemove', function(e) {
        if (!activeSwitch) return;
        
        const deltaX = e.clientX - startX;
        if (!hasMoved && Math.abs(deltaX) > DRAG_THRESHOLD) {
            hasMoved = true;
            expandKnob(activeSwitch);
        }

        if (hasMoved) {
            let newLogicalLeft = initialLogicalLeft + deltaX;
            if (newLogicalLeft < 0) newLogicalLeft = 0;
            if (newLogicalLeft > bounds.range) newLogicalLeft = bounds.range;
            updateSwitchUI(activeSwitch, newLogicalLeft / bounds.range);
        }
    });

    document.addEventListener('mouseup', function(e) {
        clearTimeout(holdTimeout);
        if (!activeSwitch) return;
        
        const sw = activeSwitch;
        const knob = sw.querySelector('.knob');
        
        sw.style.transition = '';
        sw.style.background = '';
        knob.style.transition = '';
        
        const oldChecked = sw.hasAttribute('checked');
        let newChecked = oldChecked;

        if (hasMoved) {
            const actualLeft = parseFloat(knob.style.left) || bounds.off;
            const logicalLeft = actualLeft - bounds.off;
            newChecked = logicalLeft > bounds.range / 2;
        } else {
            newChecked = !oldChecked;
        }

        knob.classList.remove('expanding');
        knob.style.left = '';

        if (newChecked) {
            sw.setAttribute('checked', '');
        } else {
            sw.removeAttribute('checked');
        }
        
        if (oldChecked !== newChecked) {
            sw.dispatchEvent(new CustomEvent('change', { detail: { checked: newChecked }, bubbles: true }));
        }
        
        activeSwitch = null;
        hasMoved = false;
    });

    // Touch Support
    document.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const sw = e.target.closest('.switch');
        if (!sw) return;
        initSwitch(sw);
        const knob = sw.querySelector('.knob');
        activeSwitch = sw;
        startX = touch.clientX;
        bounds = getBounds(sw, knob);
        const actualLeft = parseFloat(getComputedStyle(knob).left) || bounds.off;
        initialLogicalLeft = actualLeft - bounds.off;
        hasMoved = false;
        
        clearTimeout(holdTimeout);
        holdTimeout = setTimeout(() => {
            if (activeSwitch === sw) expandKnob(sw);
        }, HOLD_DELAY);
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!activeSwitch) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        
        if (!hasMoved && Math.abs(deltaX) > DRAG_THRESHOLD) {
            hasMoved = true;
            expandKnob(activeSwitch);
        }

        if (hasMoved) {
            e.preventDefault();
            let newLogicalLeft = initialLogicalLeft + deltaX;
            if (newLogicalLeft < 0) newLogicalLeft = 0;
            if (newLogicalLeft > bounds.range) newLogicalLeft = bounds.range;
            updateSwitchUI(activeSwitch, newLogicalLeft / bounds.range);
        }
    }, { passive: false });

    document.addEventListener('touchend', function() {
        clearTimeout(holdTimeout);
        if (activeSwitch) {
            const event = new MouseEvent('mouseup', { bubbles: true });
            document.dispatchEvent(event);
        }
    });

})();
