import React, { useEffect } from 'react';
import { useAppContext } from '../store/AppContext';

export default function Settings() {
  const { theme, setTheme, resetData, data, startTutorial } = useAppContext();

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
      const confirmMsgVi = 'Xóa toàn bộ dữ liệu ứng dụng?';
      const confirmMsgEn = 'Delete all application data?';
      if (window.confirm(document.documentElement.lang === 'en' ? confirmMsgEn : confirmMsgVi)) {
        resetData();
      }
    };

    resetButton.addEventListener('click', handleReset);
    return () => resetButton.removeEventListener('click', handleReset);
  }, [resetData]);

  useEffect(() => {
    const tutorialBtn = document.getElementById('btn-tutorial');
    if (!tutorialBtn) return;

    const handleTutorial = () => {
      document.querySelector('m3e-dialog#settings-dialog')?.removeAttribute('open');
      
      // Force splash screen to show immediately
      const opening = document.querySelector('.opening-title-screen');
      if (opening) {
        opening.classList.remove('hidden');
        opening.style.opacity = '1'; // Final override
      }

      startTutorial();
    };

    tutorialBtn.addEventListener('click', handleTutorial);
    return () => tutorialBtn.removeEventListener('click', handleTutorial);
  }, [startTutorial]);

  useEffect(() => {
    document.querySelectorAll('#opening-savedata').forEach((node) => {
      const name = data?.name || '';
      if (!name) {
        node.innerHTML = '<span class="vi">Chưa chọn</span><span class="en">Not selected</span>';
      } else {
        node.textContent = name;
      }
    });
  }, [data?.name]);

  return null;
}
