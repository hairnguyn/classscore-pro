import React, { useEffect } from 'react';
import { useAppContext } from '../store/AppContext';

export default function Settings() {
  const { theme, setTheme, resetData, data } = useAppContext();

  useEffect(() => {
    const themeToggle = document.getElementById('btn-toggle-theme');
    if (!themeToggle) return;

    const getResolvedTheme = () => theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    const isDark = getResolvedTheme() === 'dark';
    
    if (isDark) {
      themeToggle.setAttribute('checked', '');
      themeToggle.checked = true;
    } else {
      themeToggle.removeAttribute('checked');
      themeToggle.checked = false;
    }

    const handleChange = () => setTheme(themeToggle.checked ? 'dark' : 'light');
    themeToggle.addEventListener('change', handleChange);
    return () => themeToggle.removeEventListener('change', handleChange);
  }, [setTheme, theme]);

  useEffect(() => {
    const resetButton = document.getElementById('btn-reset');
    if (!resetButton) return;

    const handleReset = () => {
      if (window.confirm('Xóa toàn bộ dữ liệu ứng dụng?')) {
        resetData();
      }
    };

    resetButton.addEventListener('click', handleReset);
    return () => resetButton.removeEventListener('click', handleReset);
  }, [resetData]);

  useEffect(() => {
    document.querySelectorAll('#opening-savedata').forEach((node) => {
      node.textContent = data?.name || 'Chưa chọn';
    });
  }, [data?.name]);

  return null;
}
