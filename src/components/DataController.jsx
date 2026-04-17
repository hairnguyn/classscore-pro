import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../store/AppContext';
import { DEFAULT_SCORING_CONFIG, formatDate, getDatasetAnalytics, getWeekRanges } from '../utils/PointCalculator';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatPlainTextExport = (payload, selectedKeys) => {
  const lines = [];
  lines.push(`ClassScore Pro - ${payload.datasets?.[0]?.name || 'Export'}`);
  lines.push(`Ngon ngu: ${payload.datasets?.[0]?.language || '-'}`);
  lines.push(`Xuat luc: ${new Date().toLocaleString('vi-VN')}`);
  lines.push('');

  const dataset = payload.datasets?.[0] || {};
  if (selectedKeys.includes('analysis') && dataset.analysis) {
    lines.push('[Phan tich]');
    lines.push(`Tong hoc sinh: ${dataset.analysis.totalStudents}`);
    lines.push(`Xep loai lop: ${dataset.analysis.classRank}`);
    lines.push(`Diem TB lop: ${dataset.analysis.classAverageScore}`);
    lines.push('');
  }

  if (selectedKeys.includes('classes')) {
    lines.push('[Danh sach lop]');
    (dataset.classes || []).forEach((classItem, index) => {
      lines.push(`${index + 1}. ${classItem.name} (${(classItem.students || []).length} hoc sinh)`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('students')) {
    lines.push('[Hoc sinh]');
    (dataset.students || []).forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name} | Ngay sinh: ${student.dob || '-'} | Diem: ${student.score ?? '-'}`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('achievements')) {
    lines.push('[Thanh tich]');
    (dataset.achievements || []).forEach((achievement, index) => {
      lines.push(`${index + 1}. ${achievement.name} | Ngay nhan: ${achievement.certifiedDate || '-'}`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('week') && dataset.week) {
    lines.push('[Du lieu tuan]');
    lines.push(`Tuan: ${dataset.week.label || dataset.week.index}`);
    (dataset.week.students || []).forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name}: ${student.score}`);
    });
    lines.push('');
  }

  return lines.join('\n');
};

const formatMarkdownExport = (payload, selectedKeys) => {
  const dataset = payload.datasets?.[0] || {};
  const lines = [];
  lines.push(`# ${dataset.name || 'ClassScore Export'}`);
  lines.push('');
  lines.push(`- Ngon ngu: ${dataset.language || '-'}`);
  lines.push(`- Xuat luc: ${new Date().toLocaleString('vi-VN')}`);
  lines.push('');

  if (selectedKeys.includes('analysis') && dataset.analysis) {
    lines.push('## Phan tich');
    lines.push('');
    lines.push(`- Tong hoc sinh: ${dataset.analysis.totalStudents}`);
    lines.push(`- Xep loai lop: ${dataset.analysis.classRank}`);
    lines.push(`- Diem TB lop: ${dataset.analysis.classAverageScore}`);
    lines.push('');
  }

  if (selectedKeys.includes('classes')) {
    lines.push('## Danh sach lop');
    lines.push('');
    (dataset.classes || []).forEach((classItem, index) => {
      lines.push(`${index + 1}. **${classItem.name}** - ${(classItem.students || []).length} hoc sinh`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('students')) {
    lines.push('## Hoc sinh');
    lines.push('');
    lines.push('| # | Ho ten | Ngay sinh | Diem |');
    lines.push('|---|---|---|---|');
    (dataset.students || []).forEach((student, index) => {
      lines.push(`| ${index + 1} | ${student.name || ''} | ${student.dob || '-'} | ${student.score ?? '-'} |`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('achievements')) {
    lines.push('## Thanh tich');
    lines.push('');
    (dataset.achievements || []).forEach((achievement, index) => {
      lines.push(`${index + 1}. ${achievement.name} _(Ngay nhan: ${achievement.certifiedDate || '-'})_`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('week') && dataset.week) {
    lines.push('## Du lieu tuan');
    lines.push('');
    lines.push(`- Tuan: ${dataset.week.label || dataset.week.index}`);
    (dataset.week.students || []).forEach((student, index) => {
      lines.push(`  - ${index + 1}. ${student.name}: ${student.score}`);
    });
    lines.push('');
  }

  return lines.join('\n');
};

const formatHtmlExport = (payload, selectedKeys) => {
  const dataset = payload.datasets?.[0] || {};
  const studentRows = (dataset.students || [])
    .map(
      (student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${student.name || ''}</td>
        <td>${student.dob || '-'}</td>
        <td>${student.score ?? '-'}</td>
      </tr>`,
    )
    .join('');
  const classRows = (dataset.classes || [])
    .map(
      (classItem, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${classItem.name || ''}</td>
        <td>${(classItem.students || []).length}</td>
      </tr>`,
    )
    .join('');
  const achievementRows = (dataset.achievements || [])
    .map(
      (achievement, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${achievement.name || ''}</td>
        <td>${achievement.certifiedDate || '-'}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${dataset.name || 'ClassScore Export'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
    h1, h2 { margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .meta { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>${dataset.name || 'ClassScore Export'}</h1>
  <div class="meta">
    <div>Ngon ngu: ${dataset.language || '-'}</div>
    <div>Xuat luc: ${new Date().toLocaleString('vi-VN')}</div>
  </div>
  ${selectedKeys.includes('analysis') && dataset.analysis ? `
    <h2>Phan tich</h2>
    <table>
      <tr><th>Tong hoc sinh</th><td>${dataset.analysis.totalStudents}</td></tr>
      <tr><th>Xep loai lop</th><td>${dataset.analysis.classRank}</td></tr>
      <tr><th>Diem TB lop</th><td>${dataset.analysis.classAverageScore}</td></tr>
    </table>
  ` : ''}
  ${selectedKeys.includes('classes') ? `
    <h2>Danh sach lop</h2>
    <table>
      <thead><tr><th>#</th><th>Ten lop</th><th>So hoc sinh</th></tr></thead>
      <tbody>${classRows}</tbody>
    </table>
  ` : ''}
  ${selectedKeys.includes('students') ? `
    <h2>Hoc sinh</h2>
    <table>
      <thead><tr><th>#</th><th>Ho ten</th><th>Ngay sinh</th><th>Diem</th></tr></thead>
      <tbody>${studentRows}</tbody>
    </table>
  ` : ''}
  ${selectedKeys.includes('achievements') ? `
    <h2>Thanh tich</h2>
    <table>
      <thead><tr><th>#</th><th>Ten thanh tich</th><th>Ngay nhan</th></tr></thead>
      <tbody>${achievementRows}</tbody>
    </table>
  ` : ''}
</body>
</html>`;
};

const setOpen = (selector, open) => {
  const dialog = document.querySelector(selector);
  if (!dialog) return;
  if (open) {
    dialog.setAttribute('open', '');
  } else {
    dialog.removeAttribute('open');
  }
};

export default function DataController() {
  const {
    data,
    allData,
    activeDataId,
    createSavedData,
    selectSavedData,
    renameSavedData,
    deleteSavedData,
    importFromFile,
    updateWeekConfig,
    updateLanguage,
    updateScoring,
    addRule,
    removeRule,
    addAchievement,
  } = useAppContext();
  const [selectedFile, setSelectedFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedExportWeek, setSelectedExportWeek] = useState(1);
  const [studentAchievementName, setStudentAchievementName] = useState('');
  const [hasSelectedSavedata, setHasSelectedSavedata] = useState(false);
  const fileInputRef = useRef(null);
  const createDataImportRef = useRef(null);

  const analytics = useMemo(() => getDatasetAnalytics(data), [data]);
  const weekRanges = useMemo(() => getWeekRanges(data?.weekConfig), [data?.weekConfig]);

  useEffect(() => {
    const opening = document.querySelector('.opening-title-screen');
    if (!opening) return;
    opening.classList.toggle('hidden', hasSelectedSavedata);
  }, [hasSelectedSavedata]);

  useEffect(() => {
    document.querySelectorAll('#opening-savedata').forEach((node) => {
      node.textContent = data?.name || 'Chưa chọn';
    });
  }, [data?.name]);

  useEffect(() => {
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
      languageSelect.value = data?.language || 'Tiếng Việt (Vietnamese)';
    }

    const addedPoints = document.getElementById('added-points');
    const subtractedPoints = document.getElementById('subtracted-points');
    if (addedPoints) addedPoints.value = data?.scoring?.addedPoints ?? DEFAULT_SCORING_CONFIG.addedPoints;
    if (subtractedPoints) subtractedPoints.value = data?.scoring?.subtractedPoints ?? DEFAULT_SCORING_CONFIG.subtractedPoints;

    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    const numsOfWeek = document.getElementById('nums-of-week');
    if (startDate) startDate.value = data?.weekConfig?.startDate || '';
    if (endDate) endDate.value = data?.weekConfig?.endDate || '';
    if (numsOfWeek) numsOfWeek.value = data?.weekConfig?.totalWeeks || 1;
  }, [data]);

  useEffect(() => {
    const managerList = document.querySelector('#data-manager m3e-list');
    if (!managerList) return;
    managerList.querySelectorAll('[data-generated-savedata="true"]').forEach((node) => node.remove());

    const addAction = managerList.querySelector('#add-new-savedata');
    allData.forEach((item) => {
      const row = document.createElement('m3e-list-item');
      row.setAttribute('data-generated-savedata', 'true');
      row.setAttribute('data-savedata-id', item.id);
      row.innerHTML = `
        <span class="savedata-open" data-action="open">${item.name}</span>
        <span slot="supporting-text">${item.id === activeDataId ? 'Dữ liệu đang sử dụng' : ''}</span>
        <m3e-icon-button slot="trailing" data-action="rename" data-id="${item.id}">
          <m3e-icon name="edit"></m3e-icon>
        </m3e-icon-button>
        <m3e-icon-button slot="trailing" data-action="delete" data-id="${item.id}">
          <m3e-icon name="delete"></m3e-icon>
        </m3e-icon-button>
      `;
      managerList.insertBefore(row, addAction || null);
    });
  }, [allData, activeDataId]);

  useEffect(() => {
    const rulesList = document.querySelector('.rules-list');
    if (!rulesList) return;

    const ruleItems = (data?.rules || []).map((rule) => `
      <m3e-list-item data-rule-id="${rule.id}">
        <span>${rule.reason}</span>
        <div slot="trailing" style="display:flex; gap: 10px; align-items:center;">
          <span class="points">${rule.defaultPoints > 0 ? '+' : ''}${rule.defaultPoints} điểm</span>
          <m3e-icon-button data-rule-delete="${rule.id}">
            <m3e-icon name="delete"></m3e-icon>
          </m3e-icon-button>
        </div>
      </m3e-list-item>
    `).join('');

    const addRuleItem = `
      <m3e-list-action id="add-rule">
        <m3e-icon name="add" slot="leading"></m3e-icon>
        Thêm quy tắc
      </m3e-list-action>
    `;

    rulesList.innerHTML = `${ruleItems}${addRuleItem}`;
  }, [data?.rules]);

  useEffect(() => {
    const achievementList = document.querySelector('.achievements');
    if (!achievementList) return;

    const items = (data?.achievements || []).map((achievement) => `
      <m3e-list-action data-achievement-id="${achievement.id}">
        <m3e-icon name="trophy" slot="leading"></m3e-icon>
        <span class="achievement-name">${achievement.name}</span>
        <span slot="supporting-text">Đã nhận vào ngày <span class="certified-date">${formatDate(achievement.certifiedDate)}</span></span>
      </m3e-list-action>
    `).join('');

    achievementList.innerHTML = `${items}
      <m3e-list-action id="achievement-add-trigger">
        <m3e-icon name="add" slot="leading"></m3e-icon>
        <span>Thêm thành tích</span>
      </m3e-list-action>`;
  }, [data?.achievements]);

  useEffect(() => {
    document.querySelectorAll('.d-total-students').forEach((node) => {
      node.textContent = String(analytics.totalStudents);
    });
  }, [analytics.totalStudents]);

  useEffect(() => {
    document.querySelectorAll('.selected-week').forEach((node) => {
      node.textContent = ` ${selectedExportWeek}`;
    });
  }, [selectedExportWeek]);

  useEffect(() => {
    const handleClick = async (event) => {
      const target = event.target.closest('[data-action],[data-rule-delete],[data-achievement-id],#add-new-savedata,#achievement-add-trigger,#export-with-selected');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const savedataId = target.getAttribute('data-id') || target.closest('[data-savedata-id]')?.getAttribute('data-savedata-id');

      if (action === 'open' && savedataId) {
        if (window.confirm('Mở data này?')) {
          selectSavedData(savedataId);
          setHasSelectedSavedata(true);
          setOpen('m3e-dialog#data-manager', false);
        }
        return;
      }

      if (action === 'rename' && savedataId) {
        const nextName = window.prompt('Tên dữ liệu mới', allData.find((item) => item.id === savedataId)?.name || '');
        if (nextName !== null) {
          renameSavedData(savedataId, nextName);
        }
        return;
      }

      if (action === 'delete' && savedataId) {
        if (window.confirm('Xóa dữ liệu này?')) {
          deleteSavedData(savedataId);
        }
        return;
      }

      const ruleDeleteId = target.getAttribute('data-rule-delete');
      if (ruleDeleteId) {
        removeRule(ruleDeleteId);
        return;
      }

      if (target.id === 'achievement-add-trigger') {
        setOpen('#add-achievement', true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [allData, deleteSavedData, removeRule, renameSavedData, selectSavedData]);

  useEffect(() => {
    const manager = document.getElementById('data-manager');
    if (!manager) return undefined;

    const getOrCreateImportInput = () => {
      if (createDataImportRef.current) return createDataImportRef.current;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.json,.txt,.md';
      input.style.display = 'none';
      document.body.appendChild(input);
      createDataImportRef.current = input;
      return input;
    };

    const handleClick = (event) => {
      const trigger = event.target.closest('#add-new-savedata');
      const addExistingBtn = event.target.closest('#add-data');
      const saveBtn = event.target.closest('m3e-button[save-target="dataManager"]');

      if (trigger) {
        return;
      }

      if (addExistingBtn) {
        const input = getOrCreateImportInput();
        input.onchange = async (changeEvent) => {
          const file = changeEvent.target.files?.[0];
          if (!file) return;
          try {
            await importFromFile(file);
            window.alert('Đã nhập dữ liệu vào savedata hiện tại.');
          } catch (error) {
            window.alert(error.message || 'Không thể nhập dữ liệu.');
          } finally {
            input.value = '';
          }
        };
        input.click();
        return;
      }

      if (saveBtn) {
        const popover = saveBtn.closest('forge-popover');
        const inputName = popover?.querySelector('#data-name');
        const name = inputName?.value?.trim() || '';
        if (!name) {
          window.alert('Vui lòng nhập tên dữ liệu.');
          return;
        }
        createSavedData({ name });
        setHasSelectedSavedata(true);
        if (inputName) inputName.value = '';
        setOpen('m3e-dialog#data-manager', false);
      }
    };

    manager.addEventListener('click', handleClick);
    return () => manager.removeEventListener('click', handleClick);
  }, [createSavedData, importFromFile]);

  useEffect(() => {
    const languageSelect = document.getElementById('language');
    if (!languageSelect) return;

    const handler = (event) => updateLanguage(event.target.value || 'Tiếng Việt (Vietnamese)');
    languageSelect.addEventListener('change', handler);
    return () => languageSelect.removeEventListener('change', handler);
  }, [updateLanguage]);

  useEffect(() => {
    const addedPoints = document.getElementById('added-points');
    const subtractedPoints = document.getElementById('subtracted-points');

    const handleAdded = (event) => updateScoring({ addedPoints: Number(event.target.value || DEFAULT_SCORING_CONFIG.addedPoints) });
    const handleSubtracted = (event) => updateScoring({ subtractedPoints: Number(event.target.value || DEFAULT_SCORING_CONFIG.subtractedPoints) });

    addedPoints?.addEventListener('change', handleAdded);
    subtractedPoints?.addEventListener('change', handleSubtracted);

    return () => {
      addedPoints?.removeEventListener('change', handleAdded);
      subtractedPoints?.removeEventListener('change', handleSubtracted);
    };
  }, [updateScoring]);

  useEffect(() => {
    const addRuleTrigger = document.querySelector('#rules-manager');
    if (!addRuleTrigger) return;

    const handleClick = (event) => {
      const saveBtn = event.target.closest('m3e-button[save-target="studentWeekRating"]');
      if (!saveBtn) return;
      const popover = saveBtn.closest('forge-popover');
      const ruleName = popover?.querySelector('#rule-name')?.value?.trim();
      const rulePoints = Number(popover?.querySelector('#rule-points')?.value || 0);
      if (!ruleName) {
        window.alert('Vui lòng nhập tên quy tắc.');
        return;
      }
      addRule({
        reason: ruleName,
        defaultPoints: rulePoints,
      });
      const nameInput = popover?.querySelector('#rule-name');
      const pointsInput = popover?.querySelector('#rule-points');
      if (nameInput) nameInput.value = '';
      if (pointsInput) pointsInput.value = '';
    };

    addRuleTrigger.addEventListener('click', handleClick);
    return () => addRuleTrigger.removeEventListener('click', handleClick);
  }, [addRule]);

  useEffect(() => {
    const saveAchievement = document.getElementById('save-achievement');
    if (!saveAchievement) return undefined;

    const handleSave = () => {
      const achievementName = document.getElementById('achievement-name')?.value?.trim();
      const achievementDate = document.getElementById('achievement-date')?.value || '';
      const certifiedDate = document.getElementById('certified-date')?.value || '';

      if (!achievementName) {
        return;
      }

      addAchievement({
        name: achievementName,
        achievementDate,
        certifiedDate,
      });
      setStudentAchievementName(achievementName);
      setOpen('#add-achievement', false);
    };

    const delegated = (event) => {
      if (event.target.closest('#save-achievement')) {
        handleSave();
      }
    };
    saveAchievement.addEventListener('click', handleSave);
    document.addEventListener('click', delegated);
    return () => {
      saveAchievement.removeEventListener('click', handleSave);
      document.removeEventListener('click', delegated);
    };
  }, [addAchievement]);

  useEffect(() => {
    const handleQuickExport = (event) => {
      const button = event.target.closest('m3e-button');
      if (!button) return;
      const text = (button.textContent || '').trim();
      if (text.includes('Xuất dữ liệu')) {
        setOpen('#export-data-dialog', true);
      }
    };
    document.addEventListener('click', handleQuickExport);
    return () => document.removeEventListener('click', handleQuickExport);
  }, []);

  useEffect(() => {
    document.querySelectorAll('.achievement-name').forEach((node) => {
      if (!node.closest('.achievements') && studentAchievementName) {
        node.textContent = studentAchievementName;
      }
    });
  }, [studentAchievementName, data?.achievements]);

  useEffect(() => {
    const uploadRange = document.querySelector('.upload-range');
    const input = uploadRange?.querySelector('input[type="file"]');
    if (!input || !uploadRange) return;

    const onInput = (event) => {
      setSelectedFile(event.target.files?.[0] || null);
    };

    const onClick = () => fileInputRef.current?.click();
    input.style.display = 'none';
    fileInputRef.current = input;
    input.addEventListener('change', onInput);
    uploadRange.addEventListener('click', onClick);

    return () => {
      input.removeEventListener('change', onInput);
      uploadRange.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    const dialog = document.getElementById('import-data-dialog');
    if (!dialog) return;

    const handleDrop = async (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    };

    const handleDragOver = (event) => event.preventDefault();
    dialog.addEventListener('drop', handleDrop);
    dialog.addEventListener('dragover', handleDragOver);
    return () => {
      dialog.removeEventListener('drop', handleDrop);
      dialog.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  useEffect(() => {
    const importDialog = document.getElementById('import-data-dialog');
    const importingProgress = importDialog?.querySelector('.importing-progress');
    const status = importDialog?.querySelector('.import-status');
    const indicator = importDialog?.querySelector('m3e-linear-progress-indicator');
    if (!importingProgress || !status || !indicator) return;

    const renderProgress = (value) => {
      importingProgress.style.display = value > 0 ? 'flex' : 'none';
      status.textContent = `Đang nhập... (${value}%)`;
      indicator.setAttribute('value', String(value));
    };

    renderProgress(importProgress);
  }, [importProgress]);

  useEffect(() => {
    if (!selectedFile) return;

    let cancelled = false;
    const runImport = async () => {
      try {
        setImportProgress(15);
        await new Promise((resolve) => setTimeout(resolve, 120));
        setImportProgress(45);
        await importFromFile(selectedFile);
        if (cancelled) return;
        setImportProgress(100);
        setTimeout(() => {
          setImportProgress(0);
          setSelectedFile(null);
          setOpen('#import-data-dialog', false);
        }, 350);
      } catch (error) {
        console.error(error);
        setImportProgress(0);
        window.alert(error.message || 'Không thể nhập dữ liệu.');
      }
    };

    runImport();
    return () => {
      cancelled = true;
    };
  }, [importFromFile, selectedFile]);

  useEffect(() => {
    const exportMenu = document.getElementById('selected-week');
    if (!exportMenu) return;

    exportMenu.innerHTML = weekRanges
      .map((week) => `<m3e-menu-item-radio data-week-choice="${week.index}">${week.label}</m3e-menu-item-radio>`)
      .join('');

    const handler = (event) => {
      const item = event.target.closest('[data-week-choice]');
      if (!item) return;
      setSelectedExportWeek(Number(item.getAttribute('data-week-choice')));
    };

    exportMenu.addEventListener('click', handler);
    return () => exportMenu.removeEventListener('click', handler);
  }, [weekRanges]);

  useEffect(() => {
    const customize = document.getElementById('this-week-customize');
    if (!customize) return;

    const handler = () => {
      const startDate = document.getElementById('start-date')?.value || data?.weekConfig?.startDate;
      const endDate = document.getElementById('end-date')?.value || data?.weekConfig?.endDate;
      const totalWeeks = Number(document.getElementById('nums-of-week')?.value || data?.weekConfig?.totalWeeks || 1);
      updateWeekConfig({ startDate, endDate, totalWeeks });
    };

    customize.addEventListener('click', handler);
    return () => customize.removeEventListener('click', handler);
  }, [data?.weekConfig?.endDate, data?.weekConfig?.startDate, data?.weekConfig?.totalWeeks, updateWeekConfig]);

  useEffect(() => {
    const exportBtn = document.getElementById('export-with-selected');
    if (!exportBtn) return;

    const handleExport = () => {
      const dialog = document.getElementById('export-data-dialog');
      const checkboxes = [...dialog.querySelectorAll('md-checkbox')];
      const labels = [
        'analysis',
        'classes',
        'students',
        'achievements',
        'week',
      ];
      const selected = labels.filter((label, index) => checkboxes[index]?.checked);
      if (!selected.length) {
        window.alert('Chọn ít nhất 1 dữ liệu để xuất.');
        return;
      }

      const format = document.getElementById('file-format')?.value || 'Tệp JSON (.json)';
      const exportWeek = weekRanges.find((week) => week.index === selectedExportWeek);
      const exportedDataset = {
        id: data?.id,
        name: data?.name,
        language: data?.language,
        weekConfig: data?.weekConfig,
        scoring: data?.scoring,
        selectedClassId: data?.selectedClassId || data?.classes?.[0]?.id || '',
        rules: data?.rules || [],
        classes: [],
        achievements: [],
      };

      if (selected.includes('analysis')) exportedDataset.analysis = analytics;
      if (selected.includes('classes')) exportedDataset.classes = data?.classes || [];
      if (selected.includes('students')) {
        const students = (data?.classes || []).flatMap((item) => item.students || []);
        exportedDataset.students = students;
        if (!selected.includes('classes')) {
          exportedDataset.classes = (data?.classes || []).map((classItem) => ({
            id: classItem.id,
            name: classItem.name,
            students: (classItem.students || []).map((student) => ({ id: student.id })),
          }));
        }
      }
      if (selected.includes('achievements')) exportedDataset.achievements = data?.achievements || [];
      if (selected.includes('week') && exportWeek) {
        exportedDataset.week = {
          ...exportWeek,
          students: analytics.students.map((student) => ({
            id: student.id,
            name: student.name,
            score: student.calculatedScore,
          })),
        };
      }
      const payload = {
        version: 3,
        activeDataId: exportedDataset.id,
        datasets: [exportedDataset],
      };

      if (format.includes('.xlsx')) {
        const workbook = XLSX.utils.book_new();
        const dataset = payload.datasets[0] || {};
        if (selected.includes('analysis') && dataset.analysis) {
          const analysisSheet = XLSX.utils.json_to_sheet([
            {
              TongHocSinh: dataset.analysis.totalStudents,
              XepLoaiLop: dataset.analysis.classRank,
              DiemTrungBinh: dataset.analysis.classAverageScore,
            },
          ]);
          XLSX.utils.book_append_sheet(workbook, analysisSheet, 'PhanTich');
        }
        if (selected.includes('classes')) {
          const classesSheet = XLSX.utils.json_to_sheet(
            (dataset.classes || []).map((classItem) => ({
              Lop: classItem.name,
              SoHocSinh: (classItem.students || []).length,
            })),
          );
          XLSX.utils.book_append_sheet(workbook, classesSheet, 'DanhSachLop');
        }
        if (selected.includes('students')) {
          const studentsSheet = XLSX.utils.json_to_sheet(
            (dataset.students || []).map((student) => ({
              HoTen: student.name,
              NgaySinh: student.dob,
              Diem: student.score,
              XepLoaiThiDua: student.disciplineRank,
              XepLoaiHocTap: student.studyRank,
            })),
          );
          XLSX.utils.book_append_sheet(workbook, studentsSheet, 'HocSinh');
        }
        if (selected.includes('achievements')) {
          const achievementsSheet = XLSX.utils.json_to_sheet(
            (dataset.achievements || []).map((achievement) => ({
              ThanhTich: achievement.name,
              NgayDat: achievement.achievementDate,
              NgayNhan: achievement.certifiedDate,
            })),
          );
          XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'ThanhTich');
        }
        if (selected.includes('week') && dataset.week) {
          const weekSheet = XLSX.utils.json_to_sheet(
            (dataset.week.students || []).map((student) => ({
              Tuan: dataset.week.label || dataset.week.index,
              HocSinh: student.name,
              Diem: student.score,
            })),
          );
          XLSX.utils.book_append_sheet(workbook, weekSheet, 'DuLieuTuan');
        }
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        downloadBlob(new Blob([buffer]), `${data?.name || 'classscore'}.xlsx`);
      } else if (format.includes('.txt')) {
        downloadBlob(new Blob([formatPlainTextExport(payload, selected)], { type: 'text/plain;charset=utf-8' }), `${data?.name || 'classscore'}.txt`);
      } else if (format.includes('.md')) {
        downloadBlob(new Blob([formatMarkdownExport(payload, selected)], { type: 'text/markdown;charset=utf-8' }), `${data?.name || 'classscore'}.md`);
      } else if (format.includes('.html')) {
        downloadBlob(new Blob([formatHtmlExport(payload, selected)], { type: 'text/html;charset=utf-8' }), `${data?.name || 'classscore'}.html`);
      } else {
        downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${data?.name || 'classscore'}.json`);
      }

      setOpen('#export-data-dialog', false);
    };

    exportBtn.addEventListener('click', handleExport);
    return () => exportBtn.removeEventListener('click', handleExport);
  }, [analytics, data, selectedExportWeek, weekRanges]);

  return null;
}
