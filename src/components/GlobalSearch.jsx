import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';

export default function GlobalSearch() {
  const { data } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const searchInput = document.getElementById('searchinput');
    const closeBtn = document.querySelector('.search_bar md-icon-button');

    const handleInput = (e) => setSearchTerm(e.target.value);
    
    const handleClose = (e) => {
       e.stopPropagation();
       setSearchTerm('');
       if (searchInput) searchInput.value = '';
       document.querySelector('.search_bar').classList.remove('active');
    };
    
    if (searchInput) searchInput.addEventListener('input', handleInput);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    
    return () => {
      if (searchInput) searchInput.removeEventListener('input', handleInput);
      if (closeBtn) closeBtn.removeEventListener('click', handleClose);
    };
  }, []);

  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const lower = searchTerm.toLowerCase();
    const hits = [];

    data.classes.forEach(c => {
      if (c.name.toLowerCase().includes(lower)) {
         hits.push({ type: 'class', text: `Lớp: ${c.name}`, target: '/classes' });
      }
      c.students.forEach(s => {
         if (s.name.toLowerCase().includes(lower)) {
            hits.push({ type: 'student', text: `Học sinh: ${s.name} (${c.name})`, target: '/students' });
         }
      });
    });

    return hits.slice(0, 10);
  }, [data, searchTerm]);

  const resultsContainer = document.getElementById('global-search-results');

  const navTo = (target) => {
     const nextUrl = new URL(window.location.href);
     nextUrl.hash = target;
     window.history.pushState(null, '', nextUrl);
     window.dispatchEvent(new HashChangeEvent('hashchange'));
     setSearchTerm('');
     const el = document.getElementById('searchinput');
     if (el) el.value = '';
     document.querySelector('.search_bar').classList.remove('active');
  };

  if (!resultsContainer) return null;

  return createPortal(
    <>
      {results.length === 0 ? (
         <m3e-list-action disabled>
            <span>{searchTerm ? 'Không tìm thấy kết quả.' : 'Nhập để tìm kiếm...'}</span>
         </m3e-list-action>
      ) : (
        results.map((hit, i) => (
          <m3e-list-action key={i} onClick={() => navTo(hit.target)}>
            <m3e-icon slot="leading" name={hit.type === 'class' ? 'school' : 'person'}></m3e-icon>
            <span>{hit.text}</span>
          </m3e-list-action>
        ))
      )}
    </>,
    resultsContainer
  );
}
