class MorphBut 
{
    constructor() 
    {
        this.actelm=null;
        this.orgrect=null;
        this.isanim=false;
        this.overlay=document.getElementById('morph-overlay');
        
        // Auto-create overlay if missing
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'morph-overlay';
            document.body.appendChild(this.overlay);
        }

        this.init();
    }

    init() 
    {
        document.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('keydown', (e) => this.handleKey(e));
        this.overlay.addEventListener('click', () => this.close());
    }

    handleClick(e) 
    {
        if (this.isanim) return;
        if (this.actelm && this.actelm.contains(e.target)) 
        {
            return;
        }
        const target = e.target.closest('.morph-element');

        if (target) 
            {
            if (this.actelm === target) 
            {
                this.close();
            } 
            else if (!this.actelm) 
            {
                let passedTrigger = null;
                // Check if strict triggers exist
                const triggers = target.querySelectorAll('.triggerer');
                if (triggers.length > 0) {
                    const clickedTrigger = e.target.closest('.triggerer');
                    // If not clicked on a trigger, or trigger is outside this element (safety), ignore
                    if (!clickedTrigger || !target.contains(clickedTrigger)) {
                        return;
                    }
                    passedTrigger = clickedTrigger;
                } else {
                    // Non-strict mode: check if clicked element specifies a target content
                    passedTrigger = e.target.closest('[data-morph-target-content]');
                }
                this.expand(target, passedTrigger);
            }
            return;
        }
        if (this.actelm) 
        {
            this.close();
        }
    }

    handleKey(e) 
    {
        if (e.key === 'Escape' && this.actelm) 
        {
            this.close();
        }
    }

    expand(el, trigger = null) 
    {
        if (this.isanim) return;
        this.isanim = true;
        this.actelm = el;

        let activeContent = null;

        // Handle specific content targeting
        if (trigger && trigger.hasAttribute('data-morph-target-content')) {
            const selector = trigger.getAttribute('data-morph-target-content');
            const targetContent = el.querySelector(selector);
            if (targetContent) {
                const allContents = el.querySelectorAll('.morph-content');
                allContents.forEach(c => c.style.display = 'none');
                targetContent.style.display = '';
                activeContent = targetContent;
            }
        } else {
            // Find the visible content
            activeContent = Array.from(el.querySelectorAll('.morph-content')).find(c => window.getComputedStyle(c).display !== 'none');
        }

        const rect = el.getBoundingClientRect();
        this.orgrect = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
        this.spacer = document.createElement('div');
        this.spacer.style.width = rect.width + 'px';
        this.spacer.style.height = rect.height + 'px';
        this.spacer.style.margin = getComputedStyle(el).margin;
        this.spacer.style.display = getComputedStyle(el).display;
        this.spacer.style.opacity = '0';
        el.parentNode.insertBefore(this.spacer, el);
        
        // Handle put-body attribute
        if(el.hasAttribute('put-body')) {
            document.body.appendChild(el);
        }

        el.style.position = 'fixed';
        el.style.top = this.orgrect.top + 'px';
        el.style.left = this.orgrect.left + 'px';
        el.style.width = this.orgrect.width + 'px';
        el.style.height = this.orgrect.height + 'px';
        el.style.margin = '0';
        el.style.zIndex = '9999';
        el.offsetHeight;
        
        const config = this.getConfig(el);

        // Auto-measure if width/height needed
        if (activeContent && (!config.width || !config.height)) {
            // Measure the content's natural size
            const prevCss = activeContent.style.cssText;
            activeContent.style.position = 'fixed';
            activeContent.style.visibility = 'hidden';
            activeContent.style.display = 'block';
            activeContent.style.width = 'fit-content';
            activeContent.style.height = 'fit-content';
            activeContent.style.top = '0';
            activeContent.style.left = '0';
            
            // Unset max constraints temporarily if needed, though they might be relevant
            
            if (!config.width) config.width = activeContent.offsetWidth + 'px';
            if (!config.height) config.height = activeContent.offsetHeight + 'px';
            
            // Restore
            activeContent.style.cssText = prevCss;
            // Ensure display is correct if we just set it
            if (activeContent.style.display === 'none') activeContent.style.display = '';
        }

        const targetRect = this.calculateTarget(config, this.orgrect);
        el.classList.add('expanded');
        el.style.top = targetRect.top + 'px';
        el.style.left = targetRect.left + 'px';
        el.style.width = targetRect.width + 'px';
        el.style.height = targetRect.height + 'px';
        this.overlay.classList.add('active');
        this.waitForTransition(el, () => 
        {
            this.isanim = false;
        });
    }

    close() 
    {
        if (!this.actelm || this.isanim) return;
        const el = this.actelm;
        this.isanim = true;
        el.classList.remove('expanded');
        el.style.top = this.orgrect.top + 'px';
        el.style.left = this.orgrect.left + 'px';
        el.style.width = this.orgrect.width + 'px';
        el.style.height = this.orgrect.height + 'px';
        this.overlay.classList.remove('active');

        this.waitForTransition(el, () => 
        {
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.width = '';
            el.style.height = '';
            el.style.margin = '';
            el.style.zIndex = '';
            if (this.spacer && this.spacer.parentNode) 
            {
                // Restore element to original position (before spacer)
                this.spacer.parentNode.insertBefore(el, this.spacer);
                this.spacer.parentNode.removeChild(this.spacer);
            }
            
            // Reset content visibility
            const allContents = el.querySelectorAll('.morph-content');
            allContents.forEach(c => c.style.display = '');

            this.actelm = null;
            this.spacer = null;
            this.isanim = false;
        });
    }

    getConfig(el) 
    {
        const origin = el.dataset.morphOrigin || 'center';
        // Return undefined if missing so we can auto-calc
        const wAttr = el.dataset.morphWidth; 
        const hAttr = el.dataset.morphHeight;

        return { origin, width: wAttr, height: hAttr };
    }

    calculateTarget(config, startRect) 
    {
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        // Default to 300px if strictly missing and calculation failed
        let targetW = this.parseDimension(config.width || '300px', viewportW);
        let targetH = this.parseDimension(config.height || '300px', viewportH);
        targetW = Math.min(targetW, viewportW - 32);
        targetH = Math.min(targetH, viewportH - 32);
        let top, left;
        switch (config.origin) 
        {
            case 'top-left':
                top = startRect.top;
                left = startRect.left;
                break;
            case 'top-right':
                top = startRect.top;
                left = (startRect.left + startRect.width) - targetW;
                break;
            case 'bottom-left':
                top = (startRect.top + startRect.height) - targetH;
                left = startRect.left;
                break;
            case 'bottom-right':
                top = (startRect.top + startRect.height) - targetH;
                left = (startRect.left + startRect.width) - targetW;
                break;
            case 'center':
            default:
                top = (viewportH - targetH) / 2;
                left = (viewportW - targetW) / 2;
                break;
        }
        if (left < 16) left = 16;
        if (top < 16) top = 16;
        if (left + targetW > viewportW - 16) left = viewportW - targetW - 16;
        if (top + targetH > viewportH - 16) top = viewportH - targetH - 16;

        return { top, left, width: targetW, height: targetH };
    }

    parseDimension(val, viewportRef) 
    {
        if (typeof val === 'string' && val.endsWith('%')) {
            return (parseFloat(val) / 100) * viewportRef;
        }
        return parseFloat(val);
    }

    waitForTransition(el, callback) 
    {
        const handler = (e) => 
        {
            if (e.target !== el) return;
            el.removeEventListener('transitionend', handler);
            callback();
        };
        el.addEventListener('transitionend', handler);
    }
}
//init
document.addEventListener('DOMContentLoaded', () => 
{
    window.morphSystem = new MorphBut();
});