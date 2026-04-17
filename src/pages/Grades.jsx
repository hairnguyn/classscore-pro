import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';

export default function Grades() {
  const { data, updateStudent } = useAppContext();
  const [selectedClassId, setSelectedClassId] = useState('');

  // Default to first class
  useEffect(() => {
    if (!selectedClassId && data.classes.length > 0) {
      setSelectedClassId(data.classes[0].id);
    }
  }, [data.classes, selectedClassId]);

  // Headless listener for selecting class
  useEffect(() => {
    const el = document.getElementById('input-grades-class');
    if (!el) return;

    const handler = (e) => setSelectedClassId(e.target.value);
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [data.classes]);

  const activeClass = useMemo(() => {
    return data.classes.find(c => c.id === selectedClassId);
  }, [data, selectedClassId]);

  // Wrapper for maintaining ref logic per row for quick updates
  const ScoreRow = ({ student, classId }) => {
    const inputRef = useRef(null);
    const [localScore, setLocalScore] = useState(student.score.toString());

    useEffect(() => {
      setLocalScore(student.score.toString());
      if (inputRef.current) inputRef.current.value = student.score.toString();
    }, [student.score]);

    useEffect(() => {
      const el = inputRef.current;
      if (!el) return;
      const handleInput = (e) => {
        setLocalScore(e.target.value);
      };
      el.addEventListener('input', handleInput);
      return () => el.removeEventListener('input', handleInput);
    }, []);

    const saveScore = () => {
      const num = parseFloat(localScore);
      updateStudent(classId, student.id, {
        score: isNaN(num) ? 0 : num
      });
    };

    return (
      <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
        <td style={{ padding: '12px' }}>{student.name}</td>
        <td style={{ padding: '12px' }}>
          <md-outlined-text-field 
            ref={inputRef} 
            type="number" 
            style={{ width: '100px' }}
          ></md-outlined-text-field>
        </td>
        <td style={{ padding: '12px' }}>
          <md-filled-tonal-button onClick={saveScore}>Save</md-filled-tonal-button>
        </td>
      </tr>
    );
  };

  const portalOptions = document.getElementById('grades-class-options-portal');
  const portalList = document.getElementById('grades-list-portal');

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
          <tr><td colSpan="3" style={{ padding: '12px' }}>No students in this class.</td></tr>
        ) : (
          activeClass.students.map(s => (
            <ScoreRow key={s.id} student={s} classId={activeClass.id} />
          ))
        ),
        portalList
      )}
    </>
  );
}
