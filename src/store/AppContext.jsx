/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  PRESET_BEHAVIOR_RULES,
  DEFAULT_SCORING_CONFIG,
  DEFAULT_WEEK_CONFIG,
  createId,
  ensureAchievement,
  ensureClass,
  ensureRule,
  ensureScoringConfig,
  ensureStudent,
  ensureWeekConfig,
} from '../utils/PointCalculator';

const AppContext = createContext();

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
    };
  }

  const migrated = createDataset({
    name: payload.name || 'Savedata 1',
    language: payload.language,
    weekConfig: payload.weekConfig,
    scoring: payload.scoring,
    rules: payload.rules || payload.customRules,
    classes: payload.classes,
    achievements: payload.achievements,
  });

  return {
    version: 3,
    datasets: [migrated],
    activeDataId: migrated.id,
    searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.filter(Boolean).slice(0, 12) : [],
  };
};

const initialState = normalizeDatasetPayload({
  datasets: [createDataset({ name: 'Savedata 1' })],
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
      console.error('Failed to parse saved data', error);
      return initialState;
    }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'system');

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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

  const activeData = useMemo(
    () => state.datasets.find((item) => item.id === state.activeDataId) || state.datasets[0] || null,
    [state],
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
          weekConfig: ensureWeekConfig(nextValue.weekConfig),
          scoring: ensureScoringConfig(nextValue.scoring),
          rules: (nextValue.rules || []).map(ensureRule),
          classes: (nextValue.classes || []).map(ensureClass),
          achievements: (nextValue.achievements || []).map(ensureAchievement),
          selectedClassId: nextValue.selectedClassId || nextValue.classes?.[0]?.id || '',
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

  const selectSavedData = (id) => {
    setState((prev) => ({ ...prev, activeDataId: id }));
  };

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
      selectedClassId:
        dataset.selectedClassId === id
          ? dataset.classes.filter((item) => item.id !== id)[0]?.id || ''
          : dataset.selectedClassId,
    }));
  };

  const selectClass = (classId) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      selectedClassId: classId,
    }));
  };

  const addStudent = (classId, student) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? {
              ...item,
              students: [...item.students, ensureStudent(student)],
            }
          : item,
      ),
    }));
  };

  const updateStudent = (classId, studentId, updatedFields) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? {
              ...item,
              students: item.students.map((student) =>
                student.id === studentId ? ensureStudent({ ...student, ...updatedFields }) : student,
              ),
            }
          : item,
      ),
    }));
  };

  const deleteStudent = (classId, studentId) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? {
              ...item,
              students: item.students.filter((student) => student.id !== studentId),
            }
          : item,
      ),
    }));
  };

  const addBehaviorLog = (classId, studentId, logEntry) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      classes: dataset.classes.map((item) =>
        item.id === classId
          ? {
              ...item,
              students: item.students.map((student) =>
                student.id === studentId
                  ? {
                      ...student,
                      logs: [...(student.logs || []), logEntry],
                    }
                  : student,
              ),
            }
          : item,
      ),
    }));
  };

  const updateWeekConfig = (config) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      weekConfig: ensureWeekConfig({ ...dataset.weekConfig, ...config }),
    }));
  };

  const updateLanguage = (language) => {
    updateActiveDataset((dataset) => ({ ...dataset, language }));
  };

  const updateScoring = (scoring) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      scoring: ensureScoringConfig({ ...dataset.scoring, ...scoring }),
    }));
  };

  const addRule = (rule) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      rules: [...dataset.rules, ensureRule(rule)],
    }));
  };

  const removeRule = (ruleId) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      rules: dataset.rules.filter((rule) => rule.id !== ruleId),
    }));
  };

  const addAchievement = (achievement) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      achievements: [...dataset.achievements, ensureAchievement(achievement)],
    }));
  };

  const removeAchievement = (achievementId) => {
    updateActiveDataset((dataset) => ({
      ...dataset,
      achievements: dataset.achievements.filter((achievement) => achievement.id !== achievementId),
    }));
  };

  const mergeImportedPayload = (payload) => {
    const normalized = normalizeDatasetPayload(payload);
    const incoming = normalized.datasets[0];

    updateActiveDataset((dataset) => ({
      ...dataset,
      language: incoming.language || dataset.language,
      weekConfig: ensureWeekConfig(incoming.weekConfig || dataset.weekConfig),
      scoring: ensureScoringConfig(incoming.scoring || dataset.scoring),
      rules: mergeUniqueById(dataset.rules, incoming.rules || [], ensureRule),
      achievements: mergeUniqueById(dataset.achievements, incoming.achievements || [], ensureAchievement),
      classes: mergeUniqueById(dataset.classes, incoming.classes || [], ensureClass),
    }));
  };

  const importFromFile = async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'json', 'txt', 'md'].includes(ext)) {
      throw new Error('Chỉ hỗ trợ .xlsx, .json, .txt, .md');
    }

    if (ext === 'xlsx') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const jsonSheet = workbook.Sheets['data'] || workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(jsonSheet, { header: 1, blankrows: false });
      const joined = rows.flat().filter(Boolean).join('\n');
      mergeImportedPayload(parseImportedText(joined));
      return;
    }

    const text = await file.text();
    mergeImportedPayload(parseImportedText(text));
  };

  const addSearchHistory = (term) => {
    const trimmed = (term || '').trim();
    if (!trimmed) {
      return;
    }

    setState((prev) => ({
      ...prev,
      searchHistory: [trimmed, ...prev.searchHistory.filter((item) => item !== trimmed)].slice(0, 12),
    }));
  };

  const resetData = () => {
    setState(initialState);
  };

  const value = {
    state,
    data: activeData,
    allData: state.datasets,
    activeDataId: state.activeDataId,
    setData,
    theme,
    setTheme,
    createSavedData,
    selectSavedData,
    renameSavedData,
    deleteSavedData,
    addClass,
    selectClass,
    updateClass,
    deleteClass,
    addStudent,
    updateStudent,
    deleteStudent,
    addBehaviorLog,
    updateWeekConfig,
    updateLanguage,
    updateScoring,
    addRule,
    removeRule,
    addAchievement,
    removeAchievement,
    importFromFile,
    addSearchHistory,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
