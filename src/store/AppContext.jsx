/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  PRESET_BEHAVIOR_RULES,
  DEFAULT_SCORING_CONFIG,
  DEFAULT_WEEK_CONFIG,
  DEFAULT_RANKINGS,
  createId,
  ensureAchievement,
  ensureClass,
  ensureLog,
  ensureRule,
  ensureScoringConfig,
  ensureStudent,
  ensureWeekConfig,
  getAcademicGrade,
} from '../utils/PointCalculator';

export const AppContext = createContext();

const LOCAL_STORAGE_KEY = 'classscore-pro-data-v3';
const THEME_STORAGE_KEY = 'classscore-pro-theme';

const createDataset = (overrides = {}) => ({
  id: overrides?.id || createId(),
  name: overrides?.name || `Savedata ${new Date().toLocaleDateString('vi-VN')}`,
  language: overrides?.language || 'Tiếng Việt (Vietnamese)',
  weekConfig: ensureWeekConfig(overrides?.weekConfig || DEFAULT_WEEK_CONFIG),
  scoring: ensureScoringConfig(overrides?.scoring || DEFAULT_SCORING_CONFIG),
  rules: Array.isArray(overrides?.rules) && overrides.rules.length
    ? overrides.rules.map(ensureRule)
    : PRESET_BEHAVIOR_RULES.map(ensureRule),
  classes: Array.isArray(overrides?.classes) ? overrides.classes.map(ensureClass) : [],
  selectedClassId: overrides?.selectedClassId || '',
  achievements: Array.isArray(overrides?.achievements) ? overrides.achievements.map(ensureAchievement) : [],
  rankings: Array.isArray(overrides?.rankings) ? overrides.rankings : DEFAULT_RANKINGS,
  studyRankings: Array.isArray(overrides?.studyRankings) 
    ? overrides.studyRankings 
    : (Array.isArray(overrides?.rankings) ? overrides.rankings : DEFAULT_RANKINGS),
  disciplineRankings: Array.isArray(overrides?.disciplineRankings) 
    ? overrides.disciplineRankings 
    : (Array.isArray(overrides?.rankings) ? overrides.rankings : DEFAULT_RANKINGS),
  semesters: Array.isArray(overrides?.semesters)
    ? overrides.semesters
    : [
      { id: 'sem-1', name: 'Học kì I' },
      { id: 'sem-2', name: 'Học kì II' }
    ],
  subjects: Array.isArray(overrides?.subjects)
    ? overrides.subjects
    : [
      { id: 'sub-1', name: 'Toán' },
      { id: 'sub-2', name: 'Văn' },
      { id: 'sub-3', name: 'Anh' }
    ],
  subjectScores: overrides?.subjectScores || {},
  selectedSemesterId: overrides?.selectedSemesterId || 'sem-1',
  selectedSubjectId: overrides?.selectedSubjectId || 'sub-1',
  createdAt: overrides?.createdAt || Date.now(),
  updatedAt: Date.now(),
});

const normalizeDatasetPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return createDataset();
  }

  if (Array.isArray(payload.datasets)) {
    const datasets = payload.datasets.map(createDataset);
    return {
      version: 3,
      datasets,
      activeDataId: payload.activeDataId || datasets[0]?.id || '',
      searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.filter(Boolean).slice(0, 12) : [],
      autoOpenEnabled: payload.autoOpenEnabled || false,
      preferredDataId: payload.preferredDataId || '',
      tutorialComplete: payload.tutorialComplete || false,
    };
  }

  const singleDataset = payload.id ? payload : (payload.dataset || payload);
  const migrated = createDataset({
    name: singleDataset.name || 'Savedata 1 (trống)',
    language: singleDataset.language,
    weekConfig: singleDataset.weekConfig,
    scoring: singleDataset.scoring,
    rules: singleDataset.rules || singleDataset.customRules,
    classes: singleDataset.classes,
    achievements: singleDataset.achievements,
    rankings: singleDataset.rankings,
    disciplineRankings: singleDataset.disciplineRankings || singleDataset.rankings,
    studyRankings: singleDataset.studyRankings || singleDataset.rankings,
    semesters: singleDataset.semesters,
    subjects: singleDataset.subjects,
    subjectScores: singleDataset.subjectScores,
    selectedSemesterId: singleDataset.selectedSemesterId,
    selectedSubjectId: singleDataset.selectedSubjectId,
    selectedClassId: singleDataset.selectedClassId,
  });

  return {
    version: 3,
    datasets: [migrated],
    activeDataId: migrated.id,
    searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.filter(Boolean).slice(0, 12) : [],
    autoOpenEnabled: payload.autoOpenEnabled || false,
    preferredDataId: payload.preferredDataId || '',
    tutorialComplete: payload.tutorialComplete || false,
  };
};

const initialState = normalizeDatasetPayload({
  datasets: [createDataset({ name: 'Savedata 1 (trống)' })],
});

const parseImportedText = (text) => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('Tệp rỗng.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const rawText = fencedMatch?.[1]?.trim() || trimmed;
  return JSON.parse(rawText);
};

const parseStudentTable = (rows) => {
  let headerRowIdx = -1;
  let nameColIdx = -1;
  let dobColIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    
    const nameIdx = row.findIndex(cell => {
      const s = String(cell || '').toLowerCase().trim();
      return s === 'họ và tên' || s === 'họ tên' || s === 'tên' || s === 'hoten' || s === 'name';
    });
    const dobIdx = row.findIndex(cell => {
      const s = String(cell || '').toLowerCase().trim();
      return s.includes('ngày sinh') || s === 'ngaysinh' || s === 'dob' || s === 'birth';
    });

    if (nameIdx !== -1 && dobIdx !== -1) {
      headerRowIdx = i;
      nameColIdx = nameIdx;
      dobColIdx = dobIdx;
      break;
    }
  }

  if (headerRowIdx === -1) return null;

  const students = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    const name = String(row[nameColIdx] || '').trim();
    if (!name || name.toLowerCase() === 'họ và tên' || name.toLowerCase() === 'họ tên') continue;

    let dobValue = row[dobColIdx];
    let dob = '';
    
    if (typeof dobValue === 'number' && dobValue > 30000) {
      const date = new Date((dobValue - 25569) * 86400 * 1000);
      dob = date.toISOString().split('T')[0];
    } else {
      dob = String(dobValue || '').trim();
    }

    students.push({ name, dob });
  }

  return students.length > 0 ? students : null;
};

const mergeUniqueById = (currentItems, incomingItems, normalizer) => {
  const map = new Map(currentItems.map((item) => [item.id, normalizer(item)]));
  incomingItems.forEach((item) => {
    const normalized = normalizer(item);
    map.set(normalized.id, normalized);
  });
  return [...map.values()];
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
      return initialState;
    }

    try {
      return normalizeDatasetPayload(JSON.parse(saved));
    } catch (error) {
      console.error('[AppContext] Failed to parse saved data', error);
      return initialState;
    }
  });

  const [hasSelectedSavedata, setHasSelectedSavedata] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved);
      return !!(parsed.autoOpenEnabled && parsed.preferredDataId);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (state.autoOpenEnabled && state.preferredDataId && state.activeDataId !== state.preferredDataId) {
       setState(prev => ({ ...prev, activeDataId: prev.preferredDataId }));
    }
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');
  const [tutorialStep, setTutorialStep] = useState(1);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => window.location.hash || '#/');

  useEffect(() => {
    const handleHash = () => setCurrentTab(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    // Debounce localStorage save
    const saveTimeout = setTimeout(() => {
      // Show "Saving..." status only when save starts
      const snackbar = document.getElementById('app-snackbar');
      if (snackbar) {
        snackbar.innerHTML = '<span class="vi">Đang lưu dữ liệu...</span><span class="en">Saving data...</span>';
        if (typeof snackbar.show === 'function') snackbar.show();
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      
      if (snackbar) {
        snackbar.innerHTML = '<span class="vi">Đã tự động lưu dữ liệu.</span><span class="en">Data auto-saved.</span>';
        if (typeof snackbar.show === 'function') snackbar.show();
      }
    }, 3000);

    return () => clearTimeout(saveTimeout);
  }, [state]);

  useEffect(() => {
    // Auto-load default preset if not already initialized
    const isPresetInitialized = localStorage.getItem('classscore_preset1_initialized');
    if (!isPresetInitialized) {
      fetch('./Preset1.cspreset')
        .then(res => res.json())
        .then(presetData => {
          setState(prev => {
            // Check if this preset already exists in datasets to avoid duplicates
            if (prev.datasets.some(d => d.id === presetData.id)) {
              localStorage.setItem('classscore_preset1_initialized', 'true');
              return prev;
            }
            
            const normalized = createDataset({
              ...presetData,
              name: 'Preset1',
            });
            
            localStorage.setItem('classscore_preset1_initialized', 'true');
            return {
              ...prev,
              datasets: [...prev.datasets, normalized]
            };
          });
        })
        .catch(err => console.error('[AppContext] Failed to fetch default preset', err));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);

    const resolvedTheme =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

    document.body.classList.toggle('dark', resolvedTheme === 'dark');
    document.body.classList.toggle('light', resolvedTheme !== 'dark');
  }, [theme]);

  const completeTutorial = () => {
    setIsTutorialActive(false);
    setState((prev) => ({ ...prev, tutorialComplete: true }));
  };

  const startTutorial = () => {
    setTutorialStep(1);
    setIsTutorialActive(true);
    setHasSelectedSavedata(false);
    window.location.hash = '/';
  };

  const activeData = useMemo(
    () => state.datasets.find((item) => item.id === state.activeDataId) || state.datasets[0] || null,
    [state.datasets, state.activeDataId],
  );

  const updateActiveDataset = (updater) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.map((item) => {
        if (item.id !== prev.activeDataId) {
          return item;
        }
        const nextValue = updater(item);
        return {
          ...nextValue,
          updatedAt: Date.now(),
        };
      }),
    }));
  };

  const setData = (nextValue) => setState(normalizeDatasetPayload(nextValue));

  const createSavedData = ({ name, importedPayload } = {}) => {
    const dataset = createDataset({
      name,
      ...(importedPayload && normalizeDatasetPayload(importedPayload).datasets[0]),
    });
    setState((prev) => ({
      ...prev,
      activeDataId: dataset.id,
      datasets: [...prev.datasets, dataset],
    }));
    return dataset;
  };

  const selectSavedData = (id) => setState((prev) => ({ ...prev, activeDataId: id }));

  const renameSavedData = (id, name) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.map((item) => (item.id === id ? { ...item, name: name.trim() || item.name } : item)),
    }));
  };

  const deleteSavedData = (id) => {
    setState((prev) => {
      const datasets = prev.datasets.filter((item) => item.id !== id);
      const fallback = datasets[0]?.id || '';
      return {
        ...prev,
        datasets,
        activeDataId: prev.activeDataId === id ? fallback : prev.activeDataId,
      };
    });
  };

  const addClass = (newClass) => {
    const normalized = ensureClass(newClass);
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: [...dataset.classes, normalized],
      selectedClassId: dataset.selectedClassId || normalized.id,
    }));
  };

  const updateClass = (id, updatedFields) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) => (item.id === id ? ensureClass({ ...item, ...updatedFields }) : item)),
    }));
  };

  const deleteClass = (id) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.filter((item) => item.id !== id),
      selectedClassId: dataset.selectedClassId === id ? (dataset.classes.filter((item) => item.id !== id)[0]?.id || '') : dataset.selectedClassId,
    }));
  };

  const selectClass = (classId) => updateActiveDataset((dataset) => ({ ...dataset, selectedClassId: classId }));

  const addStudent = (classId, student) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId ? { ...item, students: [...item.students, ensureStudent(student)] } : item,
      ),
    }));
  };

  const updateStudent = (classId, studentId, updatedFields) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? { ...item, students: item.students.map((student) => (student.id === studentId ? ensureStudent({ ...student, ...updatedFields }) : student)) }
          : item,
      ),
    }));
  };

  const deleteStudent = (classId, studentId) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId ? { ...item, students: item.students.filter((student) => student.id !== studentId) } : item,
      ),
    }));
  };

  const addBehaviorLog = (classId, studentId, logEntry) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? { ...item, students: item.students.map((student) => (student.id === studentId ? { ...student, logs: [...(student.logs || []), logEntry] } : student)) }
          : item,
      ),
    }));
  };

  const updateWeekConfig = (config) => updateActiveDataset((dataset) => ({ ...dataset, weekConfig: ensureWeekConfig({ ...dataset.weekConfig, ...config }) }));

  const updateLanguage = (language) => updateActiveDataset((dataset) => ({ ...dataset, language }));

  const updateScoring = (scoring) => updateActiveDataset((dataset) => ({ ...dataset, scoring: ensureScoringConfig({ ...dataset.scoring, ...scoring }) }));

  const addRule = (rule) => {
    updateActiveDataset((dataset) => {
      const normalized = ensureRule(rule);
      const reason = normalized.reason || normalized.name || 'Quy tắc mới';
      return { ...dataset, rules: [...(dataset.rules || []), { ...normalized, reason }] };
    });
  };

  const removeRule = (ruleId) => updateActiveDataset((dataset) => ({ ...dataset, rules: dataset.rules.filter((rule) => rule.id !== ruleId) }));

  const addAchievement = (achievement) => updateActiveDataset((dataset) => ({ ...dataset, achievements: [...dataset.achievements, ensureAchievement(achievement)] }));

  const removeAchievement = (achievementId) => updateActiveDataset((dataset) => ({ ...dataset, achievements: dataset.achievements.filter((achievement) => achievement.id !== achievementId) }));

  const updateDisciplineRankings = (disciplineRankings) => updateActiveDataset((dataset) => ({ 
    ...dataset, 
    disciplineRankings: [...disciplineRankings].sort((a, b) => b.min - a.min) 
  }));

  const updateStudyRankings = (studyRankings) => updateActiveDataset((dataset) => ({ 
    ...dataset, 
    studyRankings: [...studyRankings].sort((a, b) => b.min - a.min) 
  }));

  const bulkAddLogs = (studentIds, logTemplate) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((cls) => ({
        ...cls,
        students: cls.students.map((s) => {
          if (studentIds !== 'all' && !studentIds.includes(s.id)) return s;
          return { ...s, logs: [...(s.logs || []), ensureLog({ ...logTemplate, timestamp: Date.now() })] };
        }),
      })),
    }));
  };

  const addAchievementWithBonus = (achievement, bonusConfig = {}) => {
    const { studentId, studentPoints, awardClass, classPoints } = bonusConfig;
    
    updateActiveDataset((dataset) => {
      let nextDataset = { 
        ...dataset, 
        achievements: [...(dataset.achievements || []), ensureAchievement(achievement)] 
      };

      // Award to student
      if (studentId && !studentId.startsWith('new:')) {
        nextDataset = {
          ...nextDataset,
          classes: nextDataset.classes.map(cls => ({
            ...cls,
            students: cls.students.map(s => {
              if (s.id !== studentId) return s;
              return { 
                ...s, 
                logs: [...(s.logs || []), ensureLog({
                  category: 'Thành tích',
                  reason: `Đạt thành tích: ${achievement.name}`,
                  points: studentPoints || 0,
                  source: 'achievement',
                  timestamp: Date.now()
                })] 
              };
            })
          }))
        };
      }

      // Award to class
      if (awardClass) {
        nextDataset = {
          ...nextDataset,
          classes: nextDataset.classes.map(cls => ({
            ...cls,
            students: cls.students.map(s => ({
              ...s,
              logs: [...(s.logs || []), ensureLog({
                category: 'Thành tích',
                reason: `Lớp đạt thành tích: ${achievement.name}`,
                points: classPoints || 0,
                source: 'achievement',
                timestamp: Date.now()
              })]
            }))
          }))
        };
      }

      return nextDataset;
    });
  };

  const updateAutoOpen = (enabled, preferredId) => {
    setState(prev => ({ ...prev, autoOpenEnabled: enabled, preferredDataId: preferredId || prev.preferredDataId }));
  };

  const updateSubjectScores = (semesterId, subjectId, studentId, scores) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      subjectScores: {
        ...(dataset.subjectScores || {}),
        [semesterId]: {
          ...(dataset.subjectScores?.[semesterId] || {}),
          [subjectId]: {
            ...(dataset.subjectScores?.[semesterId]?.[subjectId] || {}),
            [studentId]: { ...(dataset.subjectScores?.[semesterId]?.[subjectId]?.[studentId] || {}), ...scores }
          }
        }
      }
    }));
  };

  const addSemester = (name) => updateActiveDataset((dataset) => ({ ...dataset, semesters: [...(dataset.semesters || []), { id: `sem-${Date.now()}`, name }] }));

  const deleteSemester = (id) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      semesters: (dataset.semesters || []).length > 1 ? (dataset.semesters || []).filter(s => s.id !== id) : dataset.semesters,
      selectedSemesterId: dataset.selectedSemesterId === id ? (dataset.semesters[0]?.id || '') : dataset.selectedSemesterId
    }));
  };

  const renameSemester = (id, name) => updateActiveDataset((dataset) => ({ ...dataset, semesters: (dataset.semesters || []).map(s => s.id === id ? { ...s, name } : s) }));

  const selectSemester = (id) => updateActiveDataset((dataset) => ({ ...dataset, selectedSemesterId: id }));

  const addSubject = (name) => updateActiveDataset((dataset) => ({ ...dataset, subjects: [...(dataset.subjects || []), { id: `sub-${Date.now()}`, name }] }));

  const deleteSubject = (id) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      subjects: (dataset.subjects || []).length > 1 ? (dataset.subjects || []).filter(s => s.id !== id) : dataset.subjects,
      selectedSubjectId: dataset.selectedSubjectId === id ? (dataset.subjects[0]?.id || '') : dataset.selectedSubjectId
    }));
  };

  const renameSubject = (id, name) => updateActiveDataset((dataset) => ({ ...dataset, subjects: (dataset.subjects || []).map(s => s.id === id ? { ...s, name } : s) }));

  const selectSubject = (id) => updateActiveDataset((dataset) => ({ ...dataset, selectedSubjectId: id }));

  const importFromFile = async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'json', 'txt', 'md', 'cspreset'].includes(ext)) throw new Error('Chỉ hỗ trợ .xlsx, .json, .txt, .md, .cspreset');
    if (ext === 'xlsx') {
      const buffer = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets['data'] || workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true });
      const studentData = parseStudentTable(rows);
      if (studentData) { mergeStudentsIntoActiveClass(studentData); return; }
      const joined = rows.flat().filter(Boolean).join('\n');
      try { mergeImportedPayload(parseImportedText(joined)); } catch (e) { throw new Error('Không nhận diện được định dạng bảng học sinh trong tệp XLSX.'); }
      return;
    }
    const text = await file.text();
    mergeImportedPayload(parseImportedText(text));
  };
  
  const mergeImportedPayload = (payload) => {
    const normalized = normalizeDatasetPayload(payload);
    const incoming = normalized.datasets[0];
    updateActiveDataset((dataset) => {
      // 1. Cleanly merge subject scores using a true deep merge
      const newSubjectScores = JSON.parse(JSON.stringify(dataset.subjectScores || {}));
      
      if (incoming.subjectScores) {
        Object.entries(incoming.subjectScores).forEach(([semId, subjects]) => {
          if (!newSubjectScores[semId]) newSubjectScores[semId] = {};
          
          Object.entries(subjects).forEach(([subId, students]) => {
            if (!newSubjectScores[semId][subId]) newSubjectScores[semId][subId] = {};
            
            // Merge student scores - this is the critical part
            Object.entries(students).forEach(([studentId, scores]) => {
               newSubjectScores[semId][subId][studentId] = {
                 ...(newSubjectScores[semId][subId][studentId] || {}),
                 ...(scores || {})
               };
            });
          });
        });
      }

      return {
        ...dataset,
        language: incoming.language || dataset.language,
        weekConfig: ensureWeekConfig(incoming.weekConfig || dataset.weekConfig),
        scoring: ensureScoringConfig(incoming.scoring || dataset.scoring),
        rules: mergeUniqueById(dataset.rules, incoming.rules || [], ensureRule),
        achievements: mergeUniqueById(dataset.achievements, incoming.achievements || [], ensureAchievement),
        classes: mergeUniqueById(dataset.classes, incoming.classes || [], ensureClass),
        disciplineRankings: [...(incoming.disciplineRankings || incoming.rankings || dataset.disciplineRankings || [])].sort((a,b) => b.min - a.min),
        studyRankings: [...(incoming.studyRankings || dataset.studyRankings || [])].sort((a,b) => b.min - a.min),
        semesters: Array.isArray(incoming.semesters) && incoming.semesters.length ? incoming.semesters : dataset.semesters,
        subjects: Array.isArray(incoming.subjects) && incoming.subjects.length ? incoming.subjects : dataset.subjects,
        subjectScores: newSubjectScores,
        selectedSemesterId: incoming.selectedSemesterId || dataset.selectedSemesterId,
        selectedSubjectId: incoming.selectedSubjectId || dataset.selectedSubjectId,
        selectedClassId: incoming.selectedClassId || dataset.selectedClassId,
        id: dataset.id, // CRITICAL: Preserve the active dataset's ID so we don't lose the selection
      };
    });
  };

  const mergeStudentsIntoActiveClass = (studentData) => {
    updateActiveDataset((dataset) => {
      const activeClassId = dataset.selectedClassId || dataset.classes[0]?.id;
      if (!activeClassId) return dataset;
      return {
        ...dataset,
        classes: dataset.classes.map(c => c.id === activeClassId ? { ...c, students: mergeXlsxStudents(c.students, studentData) } : c)
      };
    });
  };

  const mergeXlsxStudents = (currentStudents, incomingData) => {
    const updated = [...currentStudents];
    incomingData.forEach(student => {
      const existingIdx = updated.findIndex(s => s.name === student.name);
      if (existingIdx !== -1) {
        updated[existingIdx] = { ...updated[existingIdx], dob: student.dob, updatedAt: Date.now() };
      } else {
        updated.push(ensureStudent({ name: student.name, dob: student.dob, createdAt: Date.now() }, updated.length));
      }
    });
    return updated;
  };

  const addSearchHistory = (term) => {
    const trimmed = (term || '').trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, searchHistory: [trimmed, ...prev.searchHistory.filter((item) => item !== trimmed)].slice(0, 12) }));
  };

  const resetData = () => setState(initialState);

  const value = useMemo(() => ({
    state, data: activeData, allData: state.datasets, activeDataId: state.activeDataId, setData, theme, setTheme, createSavedData, selectSavedData, renameSavedData, deleteSavedData, addClass, selectClass, updateClass, deleteClass, addStudent, updateStudent, deleteStudent, addBehaviorLog, bulkAddLogs, addAchievementWithBonus, updateWeekConfig, updateLanguage, updateScoring, addRule, removeRule, addAchievement, removeAchievement, updateDisciplineRankings, updateStudyRankings, updateAutoOpen, updateSubjectScores, getAcademicGrade, addSemester, deleteSemester, renameSemester, selectSemester, addSubject, deleteSubject, renameSubject, selectSubject, importFromFile, addSearchHistory, resetData, hasSelectedSavedata, setHasSelectedSavedata, autoOpenEnabled: state.autoOpenEnabled, preferredDataId: state.preferredDataId, tutorialComplete: state.tutorialComplete, tutorialStep, setTutorialStep, isTutorialActive, setIsTutorialActive, completeTutorial, startTutorial, currentTab,
  }), [state, activeData, theme, tutorialStep, isTutorialActive, hasSelectedSavedata, currentTab]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
