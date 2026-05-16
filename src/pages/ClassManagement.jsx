import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateStudentStatus, normalizeDateInput } from '../utils/PointCalculator';

export default function ClassManagement() {
  const { data, addStudent, updateStudent, deleteStudent, selectClass, currentTab } = useAppContext();
  const [sortConfig, setSortConfig] = useState({ key: 'name', asc: true });

  const activeClass = useMemo(
    () => data?.classes?.find((item) => item.id === data?.selectedClassId) || data?.classes?.[0] || null,
    [data?.classes, data?.selectedClassId],
  );

  const students = useMemo(() => {
    const arr = (activeClass?.students || []).map((s) => calculateStudentStatus(s, data?.disciplineRankings, data?.studyRankings));
    const sorted = [...arr].sort((left, right) => {
      let l = left[sortConfig.key];
      let r = right[sortConfig.key];
      if (typeof l === 'string') l = l.toLowerCase();
      if (typeof r === 'string') r = r.toLowerCase();
      if (l < r) return sortConfig.asc ? -1 : 1;
      if (l > r) return sortConfig.asc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [activeClass?.students, sortConfig.asc, sortConfig.key]);

  useEffect(() => {
    if (activeClass?.id && data?.selectedClassId !== activeClass.id) {
      selectClass(activeClass.id);
    }
  }, [activeClass?.id, data?.selectedClassId, selectClass]);

  useEffect(() => {
    if (currentTab !== '#/classes' && currentTab !== '/classes') return;

    document.querySelectorAll('#classes .class').forEach((node) => {
      node.textContent = activeClass?.name || '';
    });

    const rankingCards = document.querySelectorAll('#classes m3e-card');
    const totalStudentsHead = rankingCards[0]?.querySelector('.heading');
    if (totalStudentsHead) totalStudentsHead.textContent = String(students.length);

    const rankings = data?.disciplineRankings || [];
    const top3 = rankings.slice(0, 3);

    top3.forEach((rank, i) => {
      const card = rankingCards[i + 1];
      if (!card) return;
      
      const header = card.querySelector('[slot="header"]');
      const countHead = card.querySelector('.heading');
      const filteredStudents = students.filter(s => s.behaviorGrade === rank.name);

      if (header) {
        header.innerHTML = `<span class="vi">Số học sinh ${rank.name}</span><span class="en">${rank.name} students</span>`;
      }
      if (countHead) {
        countHead.textContent = String(filteredStudents.length);
      }

      // Add click handler for the dialog
      card.onclick = () => {
        const dialog = document.getElementById('nums-ranking-students');
        if (!dialog) return;

        const titleEl = dialog.querySelector('.title');
        const countEl = dialog.querySelector('.count');
        const labelEl = dialog.querySelector('.label');
        const list = dialog.querySelector('m3e-list');

        if (titleEl) titleEl.innerHTML = `<span class="vi">Danh sách học sinh ${rank.name}</span><span class="en">${rank.name} students list</span>`;
        if (countEl) countEl.textContent = String(filteredStudents.length);
        if (labelEl) labelEl.innerHTML = `<span class="vi">Học sinh ${rank.name}</span><span class="en">${rank.name} students</span>`;
        
        if (list) {
          list.innerHTML = filteredStudents.length 
            ? filteredStudents.map(s => `
                <m3e-list-action onclick="window.dispatchEvent(new CustomEvent('select-student', { detail: '${s.id}' }))">
                  <m3e-icon name="person" slot="leading"></m3e-icon>
                  <span>${s.name}</span>
                </m3e-list-action>
              `).join('')
            : `
              <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                <img src="./EMP_STA_NOFILE.png" style="width: 128px; opacity: 0.8;" alt="">
                <m3e-heading variant="headline" size="small" style="margin-top: 10px; color: var(--md-sys-color-on-surface-variant);"><span class="vi">Lớp chưa có học sinh ${rank.name}</span><span class="en">No ${rank.name} students in this class</span></m3e-heading>
              </div>
            `;
        }

        dialog.setAttribute('open', '');
      };
    });
  }, [activeClass?.name, data?.disciplineRankings, students, currentTab]);

  useEffect(() => {
    const saveButton = document.querySelector('forge-popover[anchor="add-student"] m3e-button[save-target="studentWeekRating"]');
    if (!saveButton || !activeClass) return;

    const handleAdd = () => {
      const name = document.getElementById('student-name')?.value?.trim();
      if (!name) return;

      addStudent(activeClass.id, {
        name,
        dob: document.getElementById('student-dob')?.value || '',
        score: Number(document.getElementById('student-points')?.value || 100),
        studyRank: document.getElementById('student-studies')?.value || '',
        disciplineRank: document.getElementById('student-discipline')?.value || '',
      });

      ['student-name', 'student-dob', 'student-points', 'student-studies', 'student-discipline'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
    };

    saveButton.addEventListener('click', handleAdd);
    return () => saveButton.removeEventListener('click', handleAdd);
  }, [activeClass, addStudent]);

  useEffect(() => {
    const table = document.getElementById('class-student-table');
    if (!table) return;

    const handleSort = (e) => {
      const { column, isDescending } = e.detail;
      const columns = Array.from(table.querySelectorAll('md-data-table-column'));
      const columnIndex = columns.indexOf(column);
      
      const keys = [null, 'name', 'dob', 'calculatedScore', 'behaviorGrade', 'academicGrade'];
      const key = keys[columnIndex];
      
      if (key) {
        setSortConfig({ key, asc: !isDescending });
      }
    };

    table.addEventListener('sorted', handleSort);
    return () => table.removeEventListener('sorted', handleSort);
  }, []);

  useEffect(() => {
    if (currentTab !== '#/classes' && currentTab !== '/classes') return;

    const table = document.querySelector('#classes md-data-table');
    if (!table) return;
    // Optimize: Only re-render if essential data changed
    const currentRows = table.querySelectorAll('md-data-table-row[data-generated="true"]');
    const needsUpdate = currentRows.length !== students.length || 
                        students.some((s, i) => currentRows[i]?.getAttribute('data-student-id') !== s.id);

    let emptyStateContainer = document.querySelector('#classes .class-empty-container');
    if (!emptyStateContainer) {
      emptyStateContainer = document.createElement('div');
      emptyStateContainer.className = 'class-empty-container';
      emptyStateContainer.style.display = 'none';
      emptyStateContainer.style.flexDirection = 'column';
      emptyStateContainer.style.alignItems = 'center';
      emptyStateContainer.style.justifyContent = 'center';
      emptyStateContainer.style.margin = '40px 0';
      emptyStateContainer.innerHTML = `
        <img src="./EMP_STA_ERROR.png" style="width: 256px;" alt="">
        <m3e-heading variant="headline" size="small"><span class="vi">Chưa có học sinh</span><span class="en">No students yet</span></m3e-heading>
      `;
      table.parentNode.insertBefore(emptyStateContainer, table);
    }

    if (needsUpdate) {
      currentRows.forEach((row) => row.remove());

      if (!students.length) {
        table.style.display = 'none';
        emptyStateContainer.style.display = 'flex';
        return;
      }

      table.style.display = '';
      emptyStateContainer.style.display = 'none';

      const fragment = document.createDocumentFragment();
      students.forEach((student) => {
        const row = document.createElement('md-data-table-row');
        row.setAttribute('data-generated', 'true');
        row.setAttribute('data-student-id', student.id);
        row.innerHTML = `
          <md-data-table-cell type="checkbox"></md-data-table-cell>
          <md-data-table-cell><input type="text" class="value-editor" data-field="name" value="${student.name || ''}"></md-data-table-cell>
          <md-data-table-cell><input type="date" class="value-editor" data-field="dob" value="${normalizeDateInput(student.dob || '')}"></md-data-table-cell>
          <md-data-table-cell type="numeric" style="text-align: start;"><input type="number" class="value-editor" data-field="score" value="${Number(student.score ?? 100)}"></md-data-table-cell>
          <md-data-table-cell><input type="text" class="value-editor" data-field="disciplineRank" value="${student.behaviorGrade || ''}"></md-data-table-cell>
          <md-data-table-cell><input type="text" class="value-editor" data-field="studyRank" value="${student.academicGrade || ''}"></md-data-table-cell>
          <md-data-table-cell>
            <m3e-icon-button data-action="save"><m3e-icon name="save"></m3e-icon></m3e-icon-button>
            <m3e-icon-button data-action="delete"><m3e-icon style="color:var(--md-sys-color-error);" name="delete"></m3e-icon></m3e-icon-button>
          </md-data-table-cell>
        `;
        row.addEventListener('click', (event) => {
          const action = event.target.closest('[data-action]')?.getAttribute('data-action');
          if (!action) return;

          // Helper to check if a row is selected
          const isRowSelected = (r) => r.selected || r.hasAttribute('selected') || r.classList.contains('selected') || (r.querySelector('md-checkbox') && r.querySelector('md-checkbox').checked) || (r.shadowRoot && r.shadowRoot.querySelector('md-checkbox')?.checked);
          
          let rowsToProcess = [row];
          if (isRowSelected(row)) {
            // Apply to all selected rows
            rowsToProcess = Array.from(table.querySelectorAll('md-data-table-row')).filter(r => isRowSelected(r));
          }

          rowsToProcess.forEach(r => {
            const currentStudentId = r.getAttribute('data-student-id');
            if (action === 'save') {
              const updates = {};
              r.querySelectorAll('input[data-field]').forEach((input) => {
                const field = input.getAttribute('data-field');
                updates[field] = (field === 'score' || field === 'disciplineScore') ? Number(input.value || 100) : input.value;
              });
              updateStudent(activeClass.id, currentStudentId, updates);
            }
            if (action === 'delete') {
              deleteStudent(activeClass.id, currentStudentId);
            }
          });
        });
        fragment.appendChild(row);
      });
      table.appendChild(fragment);
    }
  }, [activeClass?.id, deleteStudent, students, updateStudent, currentTab]);

  return null;
}
