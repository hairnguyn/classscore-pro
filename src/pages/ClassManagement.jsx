import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateStudentStatus } from '../utils/PointCalculator';

export default function ClassManagement() {
  const { data, addStudent, updateStudent, deleteStudent, selectClass } = useAppContext();
  const [sortConfig, setSortConfig] = useState({ key: 'name', asc: true });

  const activeClass = useMemo(
    () => data?.classes?.find((item) => item.id === data?.selectedClassId) || data?.classes?.[0] || null,
    [data?.classes, data?.selectedClassId],
  );

  const students = useMemo(() => {
    const arr = (activeClass?.students || []).map(calculateStudentStatus);
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
    document.querySelectorAll('#classes .class').forEach((node) => {
      node.textContent = activeClass?.name || '';
    });

    const cards = document.querySelectorAll('#classes m3e-card .heading');
    if (cards[0]) cards[0].textContent = String(students.length);
    if (cards[1]) cards[1].textContent = String(students.filter((student) => student.overallGrade === 'Xuất sắc').length);
    if (cards[2]) cards[2].textContent = String(students.filter((student) => student.overallGrade === 'Tốt').length);
    if (cards[3]) cards[3].textContent = String(students.filter((student) => student.overallGrade === 'Khá').length);
  }, [activeClass?.name, students]);

  useEffect(() => {
    const saveButton = document.querySelector('forge-popover[anchor="add-student"] m3e-button[save-target="studentWeekRating"]');
    if (!saveButton || !activeClass) return;

    const handleAdd = () => {
      const name = document.getElementById('student-name')?.value?.trim();
      if (!name) return;

      addStudent(activeClass.id, {
        name,
        dob: document.getElementById('student-dob')?.value || '',
        score: Number(document.getElementById('student-points')?.value || 0),
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
    const table = document.querySelector('#classes md-data-table');
    if (!table) return;
    const columns = table.querySelectorAll('md-data-table-column');
    const handlers = [
      () => setSortConfig((prev) => ({ key: 'name', asc: prev.key === 'name' ? !prev.asc : true })),
      () => setSortConfig((prev) => ({ key: 'dob', asc: prev.key === 'dob' ? !prev.asc : true })),
      () => setSortConfig((prev) => ({ key: 'calculatedScore', asc: prev.key === 'calculatedScore' ? !prev.asc : false })),
      () => setSortConfig((prev) => ({ key: 'behaviorGrade', asc: prev.key === 'behaviorGrade' ? !prev.asc : true })),
      () => setSortConfig((prev) => ({ key: 'academicGrade', asc: prev.key === 'academicGrade' ? !prev.asc : true })),
    ];
    const pairs = [1, 2, 3, 4, 5].map((idx, i) => ({ col: columns[idx], handler: handlers[i] }));
    pairs.forEach(({ col, handler }) => col?.addEventListener('click', handler));
    return () => pairs.forEach(({ col, handler }) => col?.removeEventListener('click', handler));
  }, []);

  useEffect(() => {
    const table = document.querySelector('#classes md-data-table');
    if (!table) return;
    table.querySelectorAll('md-data-table-row[data-generated="true"]').forEach((row) => row.remove());

    if (!students.length) {
      const row = document.createElement('md-data-table-row');
      row.setAttribute('data-generated', 'true');
      row.innerHTML = `
        <md-data-table-cell colSpan="7" style="text-align: center; padding: 40px;">
          <div class="empty-state" style="display: flex; flex-direction: column; align-items: center;">
            <img src="/empty-ui.webp" style="width: 256px;" alt="">
            <m3e-heading variant="headline" size="small">Chưa có học sinh</m3e-heading>
          </div>
        </md-data-table-cell>
      `;
      table.appendChild(row);
      return;
    }

    students.forEach((student) => {
      const row = document.createElement('md-data-table-row');
      row.setAttribute('data-generated', 'true');
      row.setAttribute('data-student-id', student.id);
      row.innerHTML = `
        <md-data-table-cell type="checkbox"></md-data-table-cell>
        <md-data-table-cell><input type="text" class="value-editor" data-field="name" value="${student.name || ''}"></md-data-table-cell>
        <md-data-table-cell><input type="date" class="value-editor" data-field="dob" value="${student.dob || ''}"></md-data-table-cell>
        <md-data-table-cell type="numeric" style="text-align: start;"><input type="number" class="value-editor" data-field="score" value="${Number(student.score || 0)}"></md-data-table-cell>
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
        if (action === 'save') {
          const updates = {};
          row.querySelectorAll('input[data-field]').forEach((input) => {
            const field = input.getAttribute('data-field');
            updates[field] = field === 'score' ? Number(input.value || 0) : input.value;
          });
          updateStudent(activeClass.id, student.id, updates);
        }
        if (action === 'delete') {
          deleteStudent(activeClass.id, student.id);
        }
      });
      table.appendChild(row);
    });
  }, [activeClass?.id, deleteStudent, students, updateStudent]);

  return null;
}
