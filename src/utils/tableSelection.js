export function initTableSelection() {
    document.addEventListener('click', (e) => {
        const table = e.target.closest('md-data-table');
        if (!table) return;

        const headerColumnClicked = e.target.closest('md-data-table-column[type="checkbox"]');
        if (headerColumnClicked) {
            // Header checkbox was clicked
            const rows = Array.from(table.querySelectorAll('md-data-table-row:not([style*="display: none"])'));
            let hCb = headerColumnClicked.querySelector('md-checkbox');
            if (!hCb && headerColumnClicked.shadowRoot) hCb = headerColumnClicked.shadowRoot.querySelector('md-checkbox');

            setTimeout(() => {
                const currentSelectedCount = rows.filter(r => r.selected || r.hasAttribute('selected') || (r.querySelector('md-checkbox')?.checked)).length;
                
                let willCheckAll = true;
                if (currentSelectedCount > 0 && currentSelectedCount < rows.length) {
                    willCheckAll = true; // indeterminate -> select all
                } else if (currentSelectedCount === rows.length) {
                    willCheckAll = false; // all -> none
                } else {
                    willCheckAll = true; // none -> all
                }

                rows.forEach(r => {
                    let rCb = r.querySelector('md-checkbox');
                    if (!rCb) {
                        const cell = r.querySelector('md-data-table-cell[type="checkbox"]');
                        if (cell) {
                            rCb = cell.querySelector('md-checkbox');
                            if (!rCb && cell.shadowRoot) rCb = cell.shadowRoot.querySelector('md-checkbox');
                        }
                    }
                    if (rCb) rCb.checked = willCheckAll;
                    if (willCheckAll) {
                        r.setAttribute('selected', '');
                        r.classList.add('selected');
                        r.selected = true;
                    } else {
                        r.removeAttribute('selected');
                        r.classList.remove('selected');
                        r.selected = false;
                    }
                });

                if (hCb) {
                    hCb.checked = willCheckAll;
                    hCb.indeterminate = false;
                }
                headerColumnClicked.removeAttribute('indeterminate');
                if (willCheckAll) headerColumnClicked.setAttribute('checked', '');
                else headerColumnClicked.removeAttribute('checked');

            }, 50); // Delay slightly to let internal handlers finish
            return;
        }

        // Row checkbox was clicked
        setTimeout(() => {
            const rows = Array.from(table.querySelectorAll('md-data-table-row:not([style*="display: none"])'));
            const headerColumn = table.querySelector('md-data-table-column[type="checkbox"]');
            
            if (headerColumn) {
                // Sync properties from nested checkboxes back to row attributes
                let selectedCount = 0;
                rows.forEach(r => {
                    let cb = null;
                    const cell = r.querySelector('md-data-table-cell[type="checkbox"]');
                    if (cell) {
                        cb = cell.querySelector('md-checkbox');
                        if (!cb && cell.shadowRoot) cb = cell.shadowRoot.querySelector('md-checkbox');
                    }
                    // It could also be that the whole row was clicked and handled internally
                    const isChecked = (cb && cb.checked) || r.hasAttribute('selected') || r.selected;
                    
                    if (isChecked) {
                        r.setAttribute('selected', '');
                        r.classList.add('selected');
                        r.selected = true;
                        selectedCount++;
                    } else {
                        r.removeAttribute('selected');
                        r.classList.remove('selected');
                        r.selected = false;
                    }
                });

                let hCb = headerColumn.querySelector('md-checkbox');
                if (!hCb && headerColumn.shadowRoot) hCb = headerColumn.shadowRoot.querySelector('md-checkbox');
                
                if (selectedCount === 0) {
                    if (hCb) { hCb.checked = false; hCb.indeterminate = false; }
                    headerColumn.removeAttribute('indeterminate');
                    headerColumn.removeAttribute('checked');
                } else if (selectedCount === rows.length && rows.length > 0) {
                    if (hCb) { hCb.checked = true; hCb.indeterminate = false; }
                    headerColumn.removeAttribute('indeterminate');
                    headerColumn.setAttribute('checked', '');
                } else {
                    if (hCb) { hCb.checked = false; hCb.indeterminate = true; }
                    headerColumn.setAttribute('indeterminate', '');
                    headerColumn.removeAttribute('checked');
                }
            }
        }, 50);
    });
}
