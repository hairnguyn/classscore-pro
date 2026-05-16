import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';

export default function StudentManagement() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppContext();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', asc: true });

  const activeClass = useMemo(() => {
    return data.classes.find(c => c.id === selectedClassId);
  }, [data, selectedClassId]);

  const students = useMemo(() => {
    const list = activeClass?.students || [];
    return [...list].sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortConfig.asc ? -1 : 1;
      if (valA > valB) return sortConfig.asc ? 1 : -1;
      return 0;
    });
  }, [activeClass, sortConfig]);

  // Headless listeners for class selection
  useEffect(() => {
    const el = document.getElementById('input-student-class');
    if (!el) return;
    const handler = (e) => setSelectedClassId(e.target.value);
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [data.classes]);

  // Visibility toggle
  useEffect(() => {
    const container = document.getElementById('students-active-class-container');
    const title = document.getElementById('student-add-title');
    if (container) {
      container.style.display = activeClass ? 'flex' : 'none';
    }
    if (title && activeClass) {
      title.innerHTML = `<span class="vi">Thêm học sinh vào lớp ${activeClass.name}</span><span class="en">Add student to class ${activeClass.name}</span>`;
    }
  }, [activeClass]);

  // Headless listener for adding student
  useEffect(() => {
    const btn = document.getElementById('btn-add-student');
    if (!btn || !activeClass) return;

    const handleAdd = () => {
      const nameEl = document.getElementById('input-student-name');
      const dobEl = document.getElementById('input-student-dob');
      const pobEl = document.getElementById('input-student-pob');
      
      const newName = nameEl?.value;
      if (!newName || !newName.trim()) return;
      
      addStudent(activeClass.id, {
        id: Date.now().toString(),
        name: newName.trim(),
        dob: dobEl?.value || '',
        pob: pobEl?.value || ''
      });
      
      // Clear inputs
      if (nameEl) nameEl.value = '';
      if (dobEl) dobEl.value = '';
      if (pobEl) pobEl.value = '';
    };

    btn.addEventListener('click', handleAdd);
    return () => btn.removeEventListener('click', handleAdd);
  }, [activeClass, addStudent]);

  const portalOptions = document.getElementById('students-class-options-portal');
  const portalList = document.getElementById('students-list-portal');

  return (
    <>
      {portalOptions && createPortal(
        data.classes.map(c => (
          <md-select-option key={c.id} value={c.id} headline={c.name} selected={c.id === selectedClassId ? true : undefined}></md-select-option>
        )),
        portalOptions
      )}
      
      {activeClass && portalList && createPortal(
         activeClass.students.length === 0 ? (
           <md-data-table-row>
              <md-data-table-cell colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src="./empty-ui.webp" style={{ width: '256px' }} alt="" />
                  <m3e-heading variant="headline" size="small"><span className="vi">Chưa có học sinh nào.</span><span className="en">No students yet.</span></m3e-heading>
                </div>
              </md-data-table-cell>
           </md-data-table-row>
         ) : (
          students.map((s, i) => (
             <md-data-table-row key={s.id}>
                <md-data-table-cell>{i + 1}</md-data-table-cell>
                <md-data-table-cell 
                   contentEditable suppressContentEditableWarning 
                   onBlur={(e) => updateStudent(activeClass.id, s.id, { name: e.target.textContent })}
                >{s.name}</md-data-table-cell>
                <md-data-table-cell 
                   contentEditable suppressContentEditableWarning 
                   onBlur={(e) => updateStudent(activeClass.id, s.id, { dob: e.target.textContent })}
                >{s.dob || 'N/A'}</md-data-table-cell>
                <md-data-table-cell 
                   contentEditable suppressContentEditableWarning 
                   onBlur={(e) => updateStudent(activeClass.id, s.id, { pob: e.target.textContent })}
                >{s.pob || 'N/A'}</md-data-table-cell>
                <md-data-table-cell>
                   <md-text-button onClick={() => deleteStudent(activeClass.id, s.id)} style={{'--md-text-button-label-text-color': 'var(--md-sys-color-error)'}}><span className="vi">Xóa</span><span className="en">Delete</span></md-text-button>
                </md-data-table-cell>
             </md-data-table-row>
           ))
         ),
         portalList
      )}
      
      {/* Sorting listener */}
      <SortingListener portalListId="students-list-portal" setSortConfig={setSortConfig} />
    </>
  );
}

function SortingListener({ portalListId, setSortConfig }) {
  useEffect(() => {
    const portal = document.getElementById(portalListId);
    if (!portal) return;
    const table = portal.closest('md-data-table');
    if (!table) return;

    const handleSort = (e) => {
      const { column, isDescending } = e.detail;
      const columns = Array.from(table.querySelectorAll('md-data-table-column'));
      const columnIndex = columns.indexOf(column);
      
      let key = '';
      if (columnIndex === 1) key = 'name';
      else if (columnIndex === 2) key = 'dob';
      else if (columnIndex === 3) key = 'pob';
      
      if (key) {
        setSortConfig({ key, asc: !isDescending });
      }
    };

    table.addEventListener('sorted', handleSort);
    return () => table.removeEventListener('sorted', handleSort);
  }, [portalListId, setSortConfig]);

  return null;
}
