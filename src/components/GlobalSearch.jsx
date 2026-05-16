import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';
import { getWeekRanges } from '../utils/PointCalculator';

const setOpen = (selector, open) => {
  const dialog = document.querySelector(selector);
  if (!dialog) return;
  if (open) dialog.setAttribute('open', '');
  else dialog.removeAttribute('open');
};

export default function GlobalSearch() {
  const { data, selectSavedData } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const weekRanges = useMemo(() => getWeekRanges(data?.weekConfig), [data?.weekConfig]);

  useEffect(() => {
    const searchInput = document.getElementById('searchinput');
    const closeBtn = document.querySelector('.search_bar md-icon-button');

    const handleInput = (e) => setSearchTerm(e.target.value);
    
    const handleClose = (e) => {
       e.stopPropagation();
       setSearchTerm('');
       if (searchInput) searchInput.value = '';
       document.querySelector('.search_bar')?.classList.remove('active');
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
    
    const lower = searchTerm.toLowerCase().trim();
    const hits = [];

    // Week search: "tuần 1", "tuan 2", "week 3"
    const weekMatch = lower.match(/(?:tu[âa]n|week)\s*(\d+)/);
    if (weekMatch) {
      const weekNo = parseInt(weekMatch[1], 10);
      const week = weekRanges.find(w => w.index === weekNo);
      if (week) {
        hits.push({
          type: 'week',
          text: week.label,
          subText: week.fromTo,
          weekIndex: week.index,
          icon: 'calendar_month',
        });
      }
    }

    // Class search
    data.classes.forEach(c => {
      if (c.name.toLowerCase().includes(lower)) {
        hits.push({
          type: 'class',
          text: c.name,
          subText: `${(c.students || []).length} học sinh`,
          classId: c.id,
          icon: 'school',
        });
      }
      // Student search
      c.students.forEach(s => {
        if (s.name.toLowerCase().includes(lower)) {
          hits.push({
            type: 'student',
            text: s.name,
            subText: c.name,
            studentId: s.id,
            classId: c.id,
            icon: 'person',
          });
        }
      });
    });

    return hits.slice(0, 10);
  }, [data, searchTerm, weekRanges]);

  const dismissSearch = () => {
    setSearchTerm('');
    const el = document.getElementById('searchinput');
    if (el) el.value = '';
    document.querySelector('.search_bar')?.classList.remove('active');
  };

  const navTo = (hash) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = hash;
    window.history.pushState(null, '', nextUrl);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    dismissSearch();
  };

  const handleResultClick = (hit) => {
    if (hit.type === 'week') {
      dismissSearch();
      // dispatch custom event that DataController listens to
      window.dispatchEvent(new CustomEvent('open-week-analysis', { detail: hit.weekIndex }));
      return;
    }

    if (hit.type === 'class') {
      // Switch to that class, then navigate
      if (hit.classId) {
        window.dispatchEvent(new CustomEvent('select-class', { detail: hit.classId }));
      }
      navTo('#/classes');
      return;
    }

    if (hit.type === 'student') {
      // Navigate to classes first, then open student info
      if (hit.classId) {
        window.dispatchEvent(new CustomEvent('select-class', { detail: hit.classId }));
      }
      navTo('#/classes');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('select-student', { detail: hit.studentId }));
      }, 80);
    }
  };

  const resultsContainer = document.getElementById('global-search-results');
  if (!resultsContainer) return null;

  return createPortal(
    <>
      {(results.length === 0 && !!searchTerm) ? (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', pointerEvents: 'none'}}>
              <img src="./EMP_STATE_SEARCH_RES_NOTFOUND.png" className="static-empty" style={{width: '256px'}} alt=""/>
              <m3e-heading variant="headline" size="small">Không tìm thấy kết quả</m3e-heading>
          </div>
      ) : results.length === 0 ? (
         <m3e-list-action disabled>
            <span>Nhập để tìm kiếm...</span>
         </m3e-list-action>
      ) : (
        results.map((hit, i) => (
          <m3e-list-action key={i} onClick={() => handleResultClick(hit)}>
            <m3e-icon slot="leading" name={hit.icon}></m3e-icon>
            <span>{hit.text}</span>
            {hit.subText && <span slot="supporting-text">{hit.subText}</span>}
          </m3e-list-action>
        ))
      )}
    </>,
    resultsContainer
  );
}
