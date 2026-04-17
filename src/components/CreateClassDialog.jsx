import React, { useEffect } from 'react';
import { useAppContext } from '../store/AppContext';

const closeDialog = () => {
  const dlg = document.getElementById('create-class-dialog');
  if (dlg) {
    dlg.removeAttribute('open');
  }
};

export default function CreateClassDialog() {
  const { addClass } = useAppContext();

  useEffect(() => {
    window.openCreateClassDialog = () => {
      const dlg = document.getElementById('create-class-dialog');
      if (dlg) {
        dlg.setAttribute('open', '');
      }
    };

    const btn = document.getElementById('btn-create-classes');
    if (!btn) return undefined;

    const handleCreate = () => {
      const singleEl = document.getElementById('input-create-class-name');
      const name = (singleEl?.value || '').trim();

      if (!name) {
        singleEl?.setAttribute('error', '');
        singleEl?.setAttribute('error-text', 'Vui lòng nhập tên lớp');
        return;
      }

      singleEl?.removeAttribute('error');
      singleEl?.removeAttribute('error-text');
      addClass({ name });
      if (singleEl) {
        singleEl.value = '';
      }
      closeDialog();
    };

    btn.addEventListener('click', handleCreate);
    return () => btn.removeEventListener('click', handleCreate);
  }, [addClass]);

  return null;
}
