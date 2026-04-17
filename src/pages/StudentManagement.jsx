import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';

export default function StudentManagement() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppContext();
  
  const [selectedClassId, setSelectedClassId] = useState('');

  const activeClass = useMemo(() => {
    return data.classes.find(c => c.id === selectedClassId);
  }, [data, selectedClassId]);

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
      title.textContent = `Thêm học sinh vào lớp ${activeClass.name}`;
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
                  <img src="/empty-ui.webp" style={{ width: '256px' }} alt="" />
                  <m3e-heading variant="headline" size="small">Chưa có học sinh nào.</m3e-heading>
                </div>
              </md-data-table-cell>
           </md-data-table-row>
         ) : (
           activeClass.students.map((s, i) => (
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
                   <md-text-button onClick={() => deleteStudent(activeClass.id, s.id)} style={{'--md-text-button-label-text-color': 'var(--md-sys-color-error)'}}>Xóa</md-text-button>
                </md-data-table-cell>
             </md-data-table-row>
           ))
         ),
         portalList
      )}
    </>
  );
}
