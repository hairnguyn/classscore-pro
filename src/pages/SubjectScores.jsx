import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../store/AppContext';

export default function SubjectScores() {
  const { 
    data, 
    updateSubjectScores,
    addSemester, selectSemester, deleteSemester, renameSemester,
    addSubject, selectSubject, deleteSubject, renameSubject,
    getAcademicGrade,
    currentTab
  } = useAppContext();

  const [sortConfig, setSortConfig] = useState({ key: 'name', asc: true });

  const semesters = data?.semesters || [];
  const subjects = data?.subjects || [];
  const selectedSemesterId = data?.selectedSemesterId || '';
  const selectedSubjectId = data?.selectedSubjectId || '';
  const subjectScores = data?.subjectScores || {};

  const activeClass = useMemo(
    () => data?.classes?.find((item) => item.id === data?.selectedClassId) || data?.classes?.[0] || null,
    [data?.classes, data?.selectedClassId],
  );

  const [scoresTableTarget, setScoresTableTarget] = useState(null);
  const [semesterChangerTarget, setSemesterChangerTarget] = useState(null);
  const [subjectSelTarget, setSubjectSelTarget] = useState(null);

  useEffect(() => {
    setScoresTableTarget(document.getElementById('subject-scores-table'));
    setSemesterChangerTarget(document.getElementById('semester-changer'));
    setSubjectSelTarget(document.getElementById('subj-sel'));
  }, [currentTab]);

  const students = useMemo(() => {
    const list = activeClass?.students || [];
    return [...list].sort((a, b) => {
      let valA, valB;
      
      if (sortConfig.key === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else if (sortConfig.key === 'gpa') {
        const sumA = getSubjectSummary(a.id);
        const sumB = getSubjectSummary(b.id);
        valA = Number(sumA.overallAvg) || 0;
        valB = Number(sumB.overallAvg) || 0;
      } else if (selectedSemesterId && selectedSubjectId) {
        const recA = subjectScores[selectedSemesterId]?.[selectedSubjectId]?.[a.id] || {};
        const recB = subjectScores[selectedSemesterId]?.[selectedSubjectId]?.[b.id] || {};
        
        if (sortConfig.key === 'midterm') {
          valA = recA.midterm || 0;
          valB = recB.midterm || 0;
        } else if (sortConfig.key === 'final') {
          valA = recA.final || 0;
          valB = recB.final || 0;
        } else {
          valA = a.name?.toLowerCase() || '';
          valB = b.name?.toLowerCase() || '';
        }
      } else {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      }
      
      if (valA < valB) return sortConfig.asc ? -1 : 1;
      if (valA > valB) return sortConfig.asc ? 1 : -1;
      return 0;
    });
  }, [activeClass, sortConfig, selectedSemesterId, selectedSubjectId, subjectScores, data?.studyRankings]);

  const addSemesterPopover = document.querySelector('forge-popover[anchor="add-semester"]');
  const addSubjectPopover = document.querySelector('forge-popover[anchor="add-subj"]');

  // Semester & Subject Management Tooltips/Click Logic
  useEffect(() => {
    if (!semesterChangerTarget && !subjectSelTarget) return;

    const handleContainerClick = (e) => {
      const btn = e.target.closest('m3e-button');
      if (!btn) return;
      
      const semId = btn.getAttribute('data-id');
      if (semId !== null && btn.closest('#semester-changer') && btn.id !== 'add-semester') {
        selectSemester(semId);
      }

      const subId = btn.getAttribute('data-id');
      if (subId && btn.closest('#subj-sel') && btn.id !== 'add-subj') {
        selectSubject(subId);
      }
    };

    const handleSave = (e) => {
      const saveBtn = e.target.closest('m3e-button[save-target="studentSubjectScores"]');
      if (!saveBtn) return;
      const popover = saveBtn.closest('forge-popover');
      if (!popover) return;

      const anchor = popover.getAttribute('anchor');
      if (anchor === 'add-semester') {
        const input = popover.querySelector('#semester-name');
        if (input?.value) {
          addSemester(input.value);
          input.value = '';
          popover.open = false;
        }
      } else if (anchor === 'add-subj') {
        const input = popover.querySelector('#subject-name');
        if (input?.value) {
          addSubject(input.value);
          input.value = '';
          popover.open = false;
        }
      }
    };

    const globalContextMenu = (e) => {
      const btn = e.composedPath().find(el => el.tagName === 'M3E-BUTTON');
      if (!btn) return;
      if (!btn.closest('#semester-changer') && !btn.closest('#subj-sel')) return;
      
      const id = btn.getAttribute('data-id');
      if (!id || btn.id === 'add-subj' || btn.id === 'add-semester') return;

      e.preventDefault();
      e.stopPropagation();

      const type = btn.closest('#semester-changer') ? 'semester' : 'subject';
      const currentName = btn.textContent.trim();
      const title = type === 'semester' 
        ? (document.documentElement.lang === 'en' ? 'Rename Semester' : 'Đổi tên học kỳ')
        : (document.documentElement.lang === 'en' ? 'Rename Subject' : 'Đổi tên môn học');

      window.showRenameDialog(title, currentName, (newName) => {
        if (type === 'semester') {
          renameSemester(id, newName);
        } else {
          renameSubject(id, newName);
        }
      });
    };

    if (semesterChangerTarget) {
      semesterChangerTarget.addEventListener('click', handleContainerClick);
    }
    if (subjectSelTarget) {
      subjectSelTarget.addEventListener('click', handleContainerClick);
    }
    window.addEventListener('contextmenu', globalContextMenu, { capture: true });
    document.addEventListener('click', handleSave);

    return () => {
      if (semesterChangerTarget) {
        semesterChangerTarget.removeEventListener('click', handleContainerClick);
      }
      if (subjectSelTarget) {
        subjectSelTarget.removeEventListener('click', handleContainerClick);
      }
      window.removeEventListener('contextmenu', globalContextMenu, { capture: true });
      document.removeEventListener('click', handleSave);
    };
  }, [addSemester, addSubject, renameSemester, renameSubject, selectSemester, selectSubject, semesterChangerTarget, subjectSelTarget]);

  // Key Bindings for Delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete') {
        const active = document.activeElement;
        if (active?.tagName === 'M3E-BUTTON' && active.hasAttribute('selected')) {
           const semId = active.getAttribute('data-id');
           if (semId && active.closest('#semester-changer')) {
             if (semesters.length > 1) {
               if (window.confirm(document.documentElement.lang === 'en' ? 'Delete this semester?' : 'Xóa học kỳ này?')) {
                 deleteSemester(semId);
               }
             }
           }
           const subId = active.getAttribute('data-id');
           if (subId && active.closest('#subj-sel')) {
             if (subjects.length > 1) {
               if (window.confirm(document.documentElement.lang === 'en' ? 'Delete this subject?' : 'Xóa môn học này?')) {
                 deleteSubject(subId);
               }
             }
           }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSemester, deleteSubject, semesters.length, subjects.length]);

  const calculateRating = (score) => {
    return getAcademicGrade(score, data?.studyRankings);
  };

  const calculateTotalRating = (midterm, final) => {
    const avg = (midterm + final * 2) / 3;
    return calculateRating(avg);
  };

  const getSubjectSummary = (studentId) => {
    let semesterAvgs = semesters.map(s => {
      let semTotal = 0;
      let semCount = 0;
      subjects.forEach(subj => {
        const r = subjectScores[s.id]?.[subj.id]?.[studentId];
        if (r?.final) {
          semTotal += r.final;
          semCount++;
        }
      });
      const avg = semCount > 0 ? semTotal / semCount : 0;
      return { id: s.id, name: s.name, avg };
    });

    const activeSemesters = semesterAvgs.filter(s => s.avg > 0);
    const overallAvg = activeSemesters.length > 0 ? (activeSemesters.reduce((acc, s) => acc + s.avg, 0) / activeSemesters.length).toFixed(1) : 0;
    
    return { 
      semesterAvgs,
      overallAvg: overallAvg || '-',
      overallRating: calculateRating(Number(overallAvg))
    };
  };

  useEffect(() => {
    if (!scoresTableTarget) return;
    
    const columns = scoresTableTarget.querySelectorAll('md-data-table-column');
    if (!selectedSemesterId) {
        if (columns[2]) columns[2].innerHTML = '<span class="vi">TB Học kì</span><span class="en">Semester Avg</span>';
        if (columns[3]) columns[3].innerHTML = '<span class="vi">Đánh giá năm</span><span class="en">Yearly Rating</span>';
        if (columns[4]) columns[4].innerHTML = '-';
        if (columns[5]) columns[5].innerHTML = '-';
        if (columns[6]) columns[6].innerHTML = '-';
        if (columns[7]) columns[7].innerHTML = '-';
      return;
    };

    const semName = semesters.find(s => s.id === selectedSemesterId)?.name || '';
    if (columns[2]) columns[2].innerHTML = `<span class="vi">Điểm TX</span><span class="en">Regular</span>`;
    if (columns[3]) columns[3].innerHTML = `<span class="vi">Giữa kì ${semName}</span><span class="en">Midterm</span>`;
    if (columns[4]) columns[4].innerHTML = `<span class="vi">Cuối kì ${semName}</span><span class="en">Final</span>`;
    if (columns[5]) columns[5].innerHTML = `<span class="vi">ĐG Giữa kì</span><span class="en">Mid. Rating</span>`;
    if (columns[6]) columns[6].innerHTML = `<span class="vi">ĐG Cuối kì</span><span class="en">Fin. Rating</span>`;
    if (columns[7]) columns[7].innerHTML = `<span class="vi">ĐG ${semName}</span><span class="en">Sem. Rating</span>`;

    const handleSort = (e) => {
      const { column, isDescending } = e.detail;
      const columnIndex = Array.from(columns).indexOf(column);
      
      let key = 'name';
      if (columnIndex === 1) key = 'name';
      else if (columnIndex === 3) key = 'midterm';
      else if (columnIndex === 4) key = 'final';
      else if (columnIndex === 8) key = 'gpa';
      
      if (key) {
        setSortConfig({ key, asc: !isDescending });
      }
    };

    scoresTableTarget.addEventListener('sorted', handleSort);
    return () => scoresTableTarget.removeEventListener('sorted', handleSort);
  }, [selectedSemesterId, selectedSubjectId, subjectScores, activeClass, semesters, scoresTableTarget]);

  return (
    <>
      {semesterChangerTarget && createPortal(
        <>
          <m3e-button 
            variant="tonal" 
            toggle 
            selected={!selectedSemesterId}
            onClick={() => selectSemester('')}
          >
            <span className="vi">Tổng kết năm</span>
            <span className="en">Year Summary</span>
          </m3e-button>
          {semesters.map(sem => (
            <m3e-button 
              key={sem.id} 
              id={`sem-btn-${sem.id}`}
              data-id={sem.id} 
              variant="tonal" 
              toggle 
              selected={sem.id === selectedSemesterId}
            >
              <span className="vi">{sem.name}</span>
              <span className="en">{sem.name}</span>
            </m3e-button>
          ))}
        </>,
        semesterChangerTarget
      )}
      {subjectSelTarget && createPortal(
        <>
          {subjects.map(sub => (
            <m3e-button 
              key={sub.id} 
              id={`sub-btn-${sub.id}`}
              data-id={sub.id} 
              variant="tonal" 
              toggle 
              selected={sub.id === selectedSubjectId}
            >
              {sub.name}
            </m3e-button>
          ))}
        </>,
        subjectSelTarget
      )}
      {scoresTableTarget && createPortal(
        <>
          {students.map(student => {
            const semesterData = subjectScores[selectedSemesterId] || {};
            const subjectData = semesterData[selectedSubjectId] || {};
            const scoreRecord = subjectData[student.id] || { regular: '', midterm: 0, final: 0 };
            const summary = getSubjectSummary(student.id);

            const handleScoreChange = (field, value) => {
              updateSubjectScores(selectedSemesterId, selectedSubjectId, student.id, { [field]: value });
            };

            return (
              <md-data-table-row key={student.id}>
                <md-data-table-cell type="checkbox"></md-data-table-cell>
                <md-data-table-cell>{student.name}</md-data-table-cell>
                {selectedSemesterId ? (
                  <>
                    <md-data-table-cell>
                      <ScoreInput 
                        type="text"
                        value={scoreRecord.regular || ''} 
                        onChange={(val) => handleScoreChange('regular', val)}
                      />
                    </md-data-table-cell>
                    <md-data-table-cell>
                      <ScoreInput 
                        type="number" 
                        value={scoreRecord.midterm || 0} 
                        onChange={(val) => handleScoreChange('midterm', val)}
                      />
                    </md-data-table-cell>
                    <md-data-table-cell>
                      <ScoreInput 
                        type="number" 
                        value={scoreRecord.final || 0} 
                        onChange={(val) => handleScoreChange('final', val)}
                      />
                    </md-data-table-cell>
                    <md-data-table-cell>{calculateRating(scoreRecord.midterm)}</md-data-table-cell>
                    <md-data-table-cell>{calculateRating(scoreRecord.final)}</md-data-table-cell>
                    <md-data-table-cell>{calculateTotalRating(scoreRecord.midterm, scoreRecord.final)}</md-data-table-cell>
                  </>
                ) : (
                  <>
                    <md-data-table-cell>{summary.overallAvg}</md-data-table-cell>
                    <md-data-table-cell>{summary.overallRating}</md-data-table-cell>
                    <md-data-table-cell>-</md-data-table-cell>
                    <md-data-table-cell>-</md-data-table-cell>
                    <md-data-table-cell>-</md-data-table-cell>
                    <md-data-table-cell>-</md-data-table-cell>
                  </>
                )}
              </md-data-table-row>
            );
          })}
        </>,
        scoresTableTarget
      )}
    </>
  );
}

function ScoreInput({ value, onChange, type = "number" }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = type === "number" ? Number(e.target.value) : e.target.value;
    setLocalValue(val);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val);
    }, 800); // 800ms debounce
  };

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <input 
      type={type} 
      className="value-editor" 
      value={localValue} 
      onInput={handleChange}
      onBlur={handleBlur}
    />
  );
}
