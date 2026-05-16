(function() {
    let activeDrag = null;
    let offset = { x: 0, y: 0 };

    window.toggleDialog = function(selector) {
        const dialog = document.querySelector(selector);
        if (!dialog) return;

        if (dialog.classList.contains('open')) {
            // Apply fly-out effect if it was dragged (has inline positioning)
            if (dialog.style.left && dialog.style.left !== '') {
                dialog.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                dialog.style.opacity = '0';
                dialog.style.transform = 'translateY(-40px) scale(1)';
                dialog.style.pointerEvents = 'none';
            }
            
            dialog.classList.remove('open');
            
            // Reset position after animation completes
            setTimeout(() => {
                if (!dialog.classList.contains('open')) {
                    dialog.style.left = '';
                    dialog.style.top = '';
                    dialog.style.transform = '';
                    dialog.style.margin = '';
                    dialog.style.opacity = '';
                    dialog.style.transition = '';
                    dialog.style.pointerEvents = '';
                }
            }, 300);
        } else {
            dialog.classList.add('open');
        }
    };

    document.addEventListener('mousedown', function(e) {
        const titleBar = e.target.closest('.dialog .title-bar');
        if (titleBar) {
            const dialog = titleBar.closest('.dialog');
            activeDrag = dialog;
            
            // Get current absolute position
            const rect = dialog.getBoundingClientRect();
            
            // Calculate mouse offset relative to dialog top-left
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;
            
            // Freeze dialog at current screen position and remove transform to prevent glitches
            dialog.style.transition = 'none'; // Disable transition during drag
            dialog.style.left = rect.left + 'px';
            dialog.style.top = rect.top + 'px';
            dialog.style.transform = 'none';
            dialog.style.margin = '0';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (activeDrag) {
            const x = e.clientX - offset.x;
            const y = e.clientY - offset.y;
            
            activeDrag.style.left = x + 'px';
            activeDrag.style.top = y + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
        if (activeDrag) {
            activeDrag.style.transition = ''; // Restore transitions
            activeDrag = null;
        }
    });

    document.addEventListener('click', function(e) {
        const closeBtn = e.target.closest('.dialog .macos-control-btns #close');
        const genericCloseBtn = e.target.closest('.dialog button#close-dialog');
        
        if (closeBtn || genericCloseBtn) {
            const dialog = (closeBtn || genericCloseBtn).closest('.dialog');
            window.toggleDialog('#' + dialog.id);
            return;
        }

        const returnBtn = e.target.closest('.dialog [return-value]');
        if (returnBtn) {
            const dialog = returnBtn.closest('.dialog');
            const value = returnBtn.getAttribute('return-value');
            
            const event = new CustomEvent('dialog-return', {
                detail: { value: value, dialogId: dialog.id }
            });
            dialog.dispatchEvent(event);
            
            window.toggleDialog('#' + dialog.id);
            console.log(`Dialog ${dialog.id} returned: ${value}`);
        }
    });
})();
