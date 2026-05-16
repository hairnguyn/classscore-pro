import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../store/AppContext';
import { DEFAULT_SCORING_CONFIG as POINT_DEFAULT_SCORING, formatDate, getDatasetAnalytics, getWeekRanges, getStudentWeekScore, getClassWeekDisciplineScore, getLogsForWeek, toNumber, isPastFinalWeek } from '../utils/PointCalculator';

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
  lines.push(`Ngôn Ngữ: ${payload.datasets?.[0]?.language || '-'}`);
  lines.push(`Tạo lúc: ${new Date().toLocaleString('vi-VN')}`);
  lines.push('');

  const dataset = payload.datasets?.[0] || {};
  if (selectedKeys.includes('analysis') && dataset.analysis) {
    lines.push('[Phân tích]');
    lines.push(`Tổng học sinh: ${dataset.analysis.totalStudents}`);
    lines.push(`Xếp loại lớp: ${dataset.analysis.classRank}`);
    lines.push(`Điểm TB lớp: ${dataset.analysis.classAverageScore}`);
    lines.push('');
  }

  if (selectedKeys.includes('classes')) {
    lines.push('[Danh sách lớp]');
    (dataset.classes || []).forEach((classItem, index) => {
      lines.push(`${index + 1}. ${classItem.name} (${(classItem.students || []).length} hoc sinh)`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('students')) {
    lines.push('[Học sinh]');
    (dataset.students || []).forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name} | Ngày sinh: ${student.dob || '-'} | Diem: ${student.score ?? '-'}`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('achievements')) {
    lines.push('[Thành tích]');
    (dataset.achievements || []).forEach((achievement, index) => {
      lines.push(`${index + 1}. ${achievement.name} | Ngày nhận: ${achievement.certifiedDate || '-'}`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('week') && dataset.week) {
    lines.push('[Dữ liệu tuần]');
    lines.push(`Tuần: ${dataset.week.label || dataset.week.index}`);
    (dataset.week.students || []).forEach((student, index) => {
      lines.push(`${index + 1}. ${student.name}: ${student.score}`);
    });
    lines.push('');
  }

  if (selectedKeys.includes('subjectScores')) {
    lines.push('[Điểm môn học]');
    const semesters = dataset.semesters || [];
    const subjects = dataset.subjects || [];
    const subjectScores = dataset.subjectScores || {};

    semesters.forEach(sem => {
      lines.push(`--- ${sem.name} ---`);
      (dataset.students || []).forEach(student => {
        const studentScores = [];
        subjects.forEach(sub => {
          const score = subjectScores[sem.id]?.[sub.id]?.[student.id];
          if (score) {
            studentScores.push(`${sub.name}: ${score.regular || '-'}(TX), ${score.midterm ?? '-'}(GK), ${score.final ?? '-'}(CK)`);
          }
        });
        if (studentScores.length > 0) {
          lines.push(`${student.name}:`);
          studentScores.forEach(s => lines.push(`  + ${s}`));
        }
      });
      lines.push('');
    });
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

  if (selectedKeys.includes('subjectScores')) {
    lines.push('## Diem mon hoc');
    const semesters = dataset.semesters || [];
    const subjects = dataset.subjects || [];
    const subjectScores = dataset.subjectScores || {};

    semesters.forEach(sem => {
      lines.push(`### ${sem.name}`);
      lines.push('| Hoc sinh | ' + subjects.map(s => s.name).join(' | ') + ' |');
      lines.push('|---|' + subjects.map(() => '---|').join(''));
      
      (dataset.students || []).forEach(student => {
        const row = [student.name];
        subjects.forEach(sub => {
          const score = subjectScores[sem.id]?.[sub.id]?.[student.id];
          if (score) {
            row.push(`${score.regular || '-'}<br>${score.midterm ?? '-'}<br>${score.final ?? '-'}`);
          } else {
            row.push('-');
          }
        });
        lines.push('| ' + row.join(' | ') + ' |');
      });
      lines.push('');
    });
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
      <thead><tr><th>#</th><th>Ten</th><th>Ngay nhan</th></tr></thead>
      <tbody>${achievementRows}</tbody>
    </table>
  ` : ''}
  ${selectedKeys.includes('subjectScores') ? `
    <h2>Diem mon hoc</h2>
    ${(dataset.semesters || []).map(sem => `
      <h3>${sem.name}</h3>
      <table>
        <thead>
          <tr>
            <th>Hoc sinh</th>
            ${(dataset.subjects || []).map(sub => `<th>${sub.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(dataset.students || []).map(student => `
            <tr>
              <td>${student.name}</td>
              ${(dataset.subjects || []).map(sub => {
                const score = (dataset.subjectScores || {})[sem.id]?.[sub.id]?.[student.id];
                return `<td>${score ? `${score.regular || '-'}(TX)<br>${score.midterm ?? '-'}(GK)<br>${score.final ?? '-'}(CK)` : '-'}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  ` : ''}
</body>
</html>`;
};

const formatCsPresetExport = (data) => {
  return JSON.stringify(data, null, 2);
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
    removeAchievement,
    addAchievementWithBonus,
    updateDisciplineRankings,
    updateStudyRankings,
    bulkAddLogs,
    updateAutoOpen,
    hasSelectedSavedata,
    setHasSelectedSavedata,
    autoOpenEnabled,
    preferredDataId,
    currentTab,
    selectClass,
  } = useAppContext();

  const showSnackbar = (msgEn, msgVi) => {
    const snackbar = document.getElementById('app-snackbar');
    if (snackbar) {
      snackbar.innerHTML = `<span class="vi">${msgVi}</span><span class="en">${msgEn}</span>`;
      if (typeof snackbar.show === 'function') snackbar.show();
      else if (typeof snackbar.open === 'function') snackbar.open();
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedExportWeeks, setSelectedExportWeeks] = useState([1]);
  const [studentAchievementName, setStudentAchievementName] = useState('');
  const fileInputRef = useRef(null);
  const createDataImportRef = useRef(null);

  const [analytics, setAnalytics] = useState(() => getDatasetAnalytics(data));
  const weekRanges = useMemo(() => getWeekRanges(data?.weekConfig), [data?.weekConfig]);

  useEffect(() => {
    setAnalytics(getDatasetAnalytics(data));
  }, [data]);

  // Wire global search events for week analysis and class switching
  useEffect(() => {
    const handleOpenWeekAnalysis = (e) => {
      openWeeklyAnalysis(e.detail);
    };
    const handleSelectClass = (e) => {
      const classId = e.detail;
      if (classId && selectClass) selectClass(classId);
    };
    window.addEventListener('open-week-analysis', handleOpenWeekAnalysis);
    window.addEventListener('select-class', handleSelectClass);
    return () => {
      window.removeEventListener('open-week-analysis', handleOpenWeekAnalysis);
      window.removeEventListener('select-class', handleSelectClass);
    };
  }, [selectClass, weekRanges, data]);

  /* One-shot: show app shell (hide loading overlay, reveal tab/search CSS hooks). */
  useEffect(() => {
    document.body.classList.add('ready');
  }, []);

  useEffect(() => {
    const opening = document.querySelector('.opening-title-screen');
    if (!opening) return;
    opening.classList.toggle('hidden', hasSelectedSavedata);
  }, [hasSelectedSavedata]);

  useEffect(() => {
    document.querySelectorAll('#opening-savedata').forEach((node) => {
      const name = data?.name || '';
      if (!name) {
        node.innerHTML = '<span class="vi">Chưa chọn</span><span class="en">Not selected</span>';
      } else {
        node.textContent = name;
      }
    });
  }, [data?.name]);

  useEffect(() => {
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
      languageSelect.value = data?.language || 'Tiếng Việt (Vietnamese)';
    }

    const addedPoints = document.getElementById('added-points');
    const subtractedPoints = document.getElementById('subtracted-points');
    const defaultClassScore = document.getElementById('default-class-score');
    if (addedPoints) addedPoints.value = data?.scoring?.addedPoints ?? POINT_DEFAULT_SCORING.addedPoints;
    if (subtractedPoints) subtractedPoints.value = data?.scoring?.subtractedPoints ?? POINT_DEFAULT_SCORING.subtractedPoints;
    if (defaultClassScore) defaultClassScore.value = data?.scoring?.defaultClassDisciplineScore ?? 100;

    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    const numsOfWeek = document.getElementById('nums-of-week');
    if (startDate) startDate.value = data?.weekConfig?.startDate || '';
    if (endDate) endDate.value = data?.weekConfig?.endDate || '';
    if (numsOfWeek) numsOfWeek.value = data?.weekConfig?.totalWeeks || 1;
  }, [
    data?.id, // Sync when dataset changes
    data?.language,
    data?.scoring?.addedPoints,
    data?.scoring?.subtractedPoints,
    data?.weekConfig?.startDate,
    data?.weekConfig?.endDate,
    data?.weekConfig?.totalWeeks
  ]);

  useEffect(() => {
    const managerList = document.querySelector('#data-manager m3e-list');
    if (!managerList) return;

    const renderManagerList = () => {
      const isDataManagerOpen = document.getElementById('data-manager')?.hasAttribute('open');
      if (!isDataManagerOpen && currentTab !== '#/settings' && currentTab !== '/settings') return;

      managerList.querySelectorAll('[data-generated-savedata="true"]').forEach((node) => node.remove());

      const addAction = managerList.querySelector('#add-new-savedata');
      allData.forEach((item) => {
        const row = document.createElement('m3e-list-action');
        row.setAttribute('data-generated-savedata', 'true');
        row.setAttribute('data-savedata-id', item.id);
        row.setAttribute('data-action', 'open');
        row.innerHTML = `
          <m3e-icon name="database" slot="leading"></m3e-icon>
          <span class="savedata-open">${item.name}</span>
          <span slot="supporting-text">${item.id === activeDataId ? '<span class="vi">Dữ liệu đang sử dụng</span><span class="en">Data in use</span>' : ''}</span>
          <m3e-icon-button slot="trailing" data-action="rename" data-id="${item.id}">
            <m3e-icon name="edit"></m3e-icon>
          </m3e-icon-button>
          <m3e-icon-button slot="trailing" data-action="delete" data-id="${item.id}">
            <m3e-icon name="delete"></m3e-icon>
          </m3e-icon-button>
        `;
        managerList.insertBefore(row, addAction || null);
      });
    };

    renderManagerList();

    const dataManagerDialog = document.getElementById('data-manager');
    const observer = new MutationObserver(() => {
      if (dataManagerDialog.hasAttribute('open')) {
        renderManagerList();
      }
    });

    if (dataManagerDialog) {
      observer.observe(dataManagerDialog, { attributes: true, attributeFilter: ['open'] });
    }

    return () => observer.disconnect();
  }, [
    allData, 
    activeDataId, 
    currentTab
  ]);

  useEffect(() => {
    const renderRankList = (listSelector, rankingsData, type) => {
      const list = document.querySelector(listSelector);
      if (!list) return;

      const isRanksOpen = document.getElementById('ranking-options')?.hasAttribute('open');
      if (!isRanksOpen && currentTab !== '#/settings' && currentTab !== '/settings') return;

      list.querySelectorAll('[data-generated-rank="true"]').forEach((node) => node.remove());

      const addAction = list.querySelector(type === 'discipline' ? '#add-new-ranking' : '#add-new-studying-ranking');
      (rankingsData || []).forEach((rank, index) => {
        const item = document.createElement('m3e-list-item');
        item.setAttribute('data-generated-rank', 'true');
        item.setAttribute('data-rank-id', rank.id || `${type}-rank-${index}`);
        item.setAttribute('data-rank-type', type);
        item.innerHTML = `
          <div slot="leading" class="rank-color-btn" data-action="pick-color" style="position: relative; width: 40px; height: 40px; border-radius: 8px; overflow: hidden; border: 1px solid var(--md-sys-color-outline-variant);">
            <div class="rank-color-preview" style="width: 100%; height: 100%; background: ${rank.color || '#0073f7'}; pointer-events: none;"></div>
            <input type="color" class="rank-color-input" value="${rank.color || '#0073f7'}" onmousedown="event.stopPropagation()" oninput="this.previousElementSibling.style.background = this.value" style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; border: none; cursor: pointer; opacity: 0;">
          </div>
          <span contenteditable="true" class="rank-name-editable" style="margin-left: 12px; outline: none;">${rank.name}</span>
          <div style="display: flex; align-items: center; gap: 10px; " slot="trailing">
            <span><span class="vi">điểm từ</span><span class="en">minimum score: </span></span>
            <md-outlined-text-field style="width: 80px;" type="number" class="rank-min-score-input" value="${rank.min}"></md-outlined-text-field>
            <m3e-icon-button data-action="delete-rank" data-rank-type="${type}" data-rank-index="${index}"><m3e-icon name="delete"></m3e-icon></m3e-icon-button>
          </div>
        `;
        list.insertBefore(item, addAction || null);
      });
    };

    renderRankList('#ranks-list', data?.disciplineRankings, 'discipline');
    renderRankList('#studying-ranks-list', data?.studyRankings, 'study');

    // Add a check on dialog open
    const ranksDialog = document.getElementById('ranking-options');
    const observer = new MutationObserver(() => {
      if (ranksDialog.hasAttribute('open')) {
        renderRankList('#ranks-list', data?.disciplineRankings, 'discipline');
        renderRankList('#studying-ranks-list', data?.studyRankings, 'study');
      }
    });

    if (ranksDialog) {
      observer.observe(ranksDialog, { attributes: true, attributeFilter: ['open'] });
    }

    return () => observer.disconnect();
  }, [data?.disciplineRankings, data?.studyRankings, currentTab, activeDataId]);

  useEffect(() => {
    const rulesList = document.querySelector('.rules-list');
    if (!rulesList) return;

    const renderRules = () => {
      rulesList.querySelectorAll('[data-generated-rule="true"]').forEach((node) => node.remove());
      const addRuleNode = rulesList.querySelector('#add-rule');
      (data?.rules || []).forEach((rule) => {
        const item = document.createElement('m3e-list-item');
        item.setAttribute('data-rule-id', rule.id);
        item.setAttribute('data-generated-rule', 'true');
        item.innerHTML = `
          <span>${rule.reason}</span>
          <div slot="trailing" style="display:flex; gap: 10px; align-items:center;">
            <span class="points">${rule.defaultPoints > 0 ? '+' : ''}${rule.defaultPoints} <span class="vi">điểm</span><span class="en">pts</span></span>
            <m3e-icon-button data-rule-delete="${rule.id}">
              <m3e-icon name="delete"></m3e-icon>
            </m3e-icon-button>
          </div>
        `;
        rulesList.insertBefore(item, addRuleNode || null);
      });
    };

    renderRules();

    const rulesDialog = document.getElementById('rules-manager');
    const observer = new MutationObserver(() => {
      if (rulesDialog.hasAttribute('open')) {
        renderRules();
      }
    });

    if (rulesDialog) {
      observer.observe(rulesDialog, { attributes: true, attributeFilter: ['open'] });
    }

    return () => observer.disconnect();
  }, [data?.rules, currentTab]);

  useEffect(() => {
    const list = document.querySelector('.achievements');
    if (!list) return undefined;

    const render = () => {
      if (currentTab !== '#/competition' && currentTab !== '/competition') return;

      const achievementList = document.querySelector('.achievements');
      if (!achievementList) return;

      let emptyContainer = document.querySelector('.achievements-empty-container');
      if (!emptyContainer) {
         emptyContainer = document.createElement('div');
         emptyContainer.className = 'achievements-empty-container';
         emptyContainer.style.display = 'flex';
         emptyContainer.style.flexDirection = 'column';
         emptyContainer.style.alignItems = 'center';
         emptyContainer.style.justifyContent = 'center';
         emptyContainer.style.padding = '40px';
         emptyContainer.innerHTML = `<img src="./EMP_STA_ACHIEVEMENTS.png" class="static-empty" style="width: 256px;" alt=""><m3e-heading variant="headline" size="small"><span class="vi">Chưa có thành tích</span><span class="en">No achievements yet</span></m3e-heading>`;
         achievementList.parentNode.insertBefore(emptyContainer, achievementList);
      }

      if (!data?.achievements?.length) {
        emptyContainer.style.display = 'flex';
        achievementList.innerHTML = `
        <m3e-list-action id="achievement-add-trigger" style="margin-top: 16px;">
          <m3e-icon name="add" slot="leading"></m3e-icon>
          <span><span class="vi">Thêm thành tích</span><span class="en">Add achievement</span></span>
        </m3e-list-action>`;
        return;
      }

      emptyContainer.style.display = 'none';

      const items = (data?.achievements || []).map((achievement) => `
        <m3e-list-action data-achievement-id="${achievement.id}">
          <m3e-icon name="trophy" slot="leading"></m3e-icon>
          <span class="achievement-name">${achievement.name}</span>
          <span slot="supporting-text"><span class="vi">Đã nhận vào ngày</span><span class="en">Certified date:</span> <span class="certified-date">${formatDate(achievement.certifiedDate)}</span></span>
        </m3e-list-action>
      `).join('');

      achievementList.innerHTML = `${items}
        <m3e-list-action id="achievement-add-trigger">
          <m3e-icon name="add" slot="leading"></m3e-icon>
          <span><span class="vi">Thêm thành tích</span><span class="en">Add achievement</span></span>
        </m3e-list-action>`;
    };

    render();

    const observer = new MutationObserver(() => {
      const isVisible = document.getElementById('competition')?.style.display !== 'none';
      if (isVisible) render();
    });

    const target = document.getElementById('competition');
    if (target) {
      observer.observe(target, { attributes: true, attributeFilter: ['style'] });
    }

    return () => observer.disconnect();
  }, [data?.achievements, currentTab]);

  useEffect(() => {
    document.querySelectorAll('.d-total-students').forEach((node) => {
      node.textContent = String(analytics.totalStudents);
    });
    document.querySelectorAll('#d-class-discipline-score').forEach((node) => {
      node.textContent = String(analytics.currentClassDisciplineScore);
    });
  }, [analytics.totalStudents, analytics.currentClassDisciplineScore]);

  useEffect(() => {
    document.querySelectorAll('.selected-week').forEach((node) => {
      if (selectedExportWeeks.length === 0) {
        node.textContent = '';
      } else if (selectedExportWeeks.length === 1) {
        node.textContent = ` ${selectedExportWeeks[0]}`;
      } else {
        node.textContent = '...';
      }
    });
  }, [selectedExportWeeks]);

  const openWeeklyAnalysis = (weekIndex) => {
    const week = weekRanges[weekIndex - 1];
    if (!week) return;

    const classScore = getClassWeekDisciplineScore(data, week);
    const allStudents = data.classes.flatMap(c => c.students || []);
    const weeklyScores = allStudents
      .map(s => ({ name: s.name, score: getStudentWeekScore(s, week) }))
      .sort((a, b) => b.score - a.score);

    const topPerformer = (weeklyScores.length > 1 && weeklyScores[0].score === weeklyScores[1].score)
      ? null
      : weeklyScores[0];

    const violators = allStudents.flatMap(student => 
      getLogsForWeek(student, week)
        .filter(l => toNumber(l.points) < 0)
        .map(l => ({ studentName: student.name, reason: l.reason, points: l.points }))
    );

    const dialog = document.getElementById('weekly-analysis-dialog');
    if (!dialog) return;

    dialog.querySelector('#wa-week-label').textContent = `(${week.label})`;
    dialog.querySelector('#wa-class-score').textContent = String(classScore);
    
    const topNode = dialog.querySelector('#wa-top-performer');
    if (topPerformer) {
      topNode.innerHTML = `<m3e-list-item>
        <m3e-icon name="person" slot="leading"></m3e-icon>
        <span>${topPerformer.name}</span>
        <span slot="trailing">${topPerformer.score} <span class="vi">điểm</span><span class="en">pts</span></span>
      </m3e-list-item>`;
    } else {
      topNode.innerHTML = `<span class="vi">Không có (đồng điểm)</span><span class="en">None (tie)</span>`;
    }

    const violatorsList = dialog.querySelector('#wa-violators-list');
    if (violators.length > 0) {
      violatorsList.innerHTML = violators.map(v => `
        <m3e-list-item>
          <span slot="leading" style="color: var(--md-sys-color-error); font-weight: bold;">${v.points}</span>
          <span>${v.studentName}</span>
          <span slot="supporting-text">${v.reason}</span>
        </m3e-list-item>
      `).join('');
    } else {
      violatorsList.innerHTML = `<div style="padding: 16px; opacity: 0.7;"><span class="vi">Không có vi phạm</span><span class="en">No violations</span></div>`;
    }

    setOpen('#weekly-analysis-dialog', true);
  };

  useEffect(() => {
    const handleClick = async (event) => {
      const target = event.target.closest('[data-action],[data-rule-delete],[data-achievement-id],#add-new-savedata,#achievement-add-trigger,#export-with-selected,[data-week-index]');
      if (!target) return;

      const weekIdx = target.getAttribute('data-week-index');
      if (weekIdx) {
        openWeeklyAnalysis(Number(weekIdx));
        return;
      }

      const action = target.getAttribute('data-action');
      const savedataId = target.getAttribute('data-id') || target.closest('[data-savedata-id]')?.getAttribute('data-savedata-id');

      if (action === 'open' && savedataId) {
        if (window.confirm(document.documentElement.lang === 'en' ? 'Open this data?' : 'Mở data này?')) {
          selectSavedData(savedataId);
          setHasSelectedSavedata(true);
          setOpen('m3e-dialog#data-manager', false);
          showSnackbar('Data opened.', 'Đã mở dữ liệu.');
        }
        return;
      }

      if (action === 'rename' && savedataId) {
        const currentName = allData.find((item) => item.id === savedataId)?.name || '';
        const title = document.documentElement.lang === 'en' ? 'Rename Data' : 'Đổi tên dữ liệu';
        
        window.showRenameDialog(title, currentName, (newName) => {
          renameSavedData(savedataId, newName);
        });
        return;
      }

      if (action === 'delete' && savedataId) {
        if (window.confirm(document.documentElement.lang === 'en' ? 'Delete this data?' : 'Xóa dữ liệu này?')) {
          deleteSavedData(savedataId);
          showSnackbar('Data deleted.', 'Đã xóa dữ liệu.');
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

      if (action === 'delete-rank') {
        const type = target.getAttribute('data-rank-type');
        const index = Number(target.getAttribute('data-rank-index'));
        if (window.confirm(document.documentElement.lang === 'en' ? 'Delete this rank?' : 'Xóa thứ hạng này?')) {
          if (type === 'discipline') {
            const nextRankings = [...(data?.disciplineRankings || [])];
            nextRankings.splice(index, 1);
            updateDisciplineRankings(nextRankings);
          } else {
            const nextRankings = [...(data?.studyRankings || [])];
            nextRankings.splice(index, 1);
            updateStudyRankings(nextRankings);
          }
        }
        return;
      }

      const achievementId = target.getAttribute('data-achievement-id');
      if (achievementId) {
        const achievement = (data?.achievements || []).find(a => a.id === achievementId);
        if (achievement) {
          const detailDialog = document.querySelector('#competition m3e-dialog:not(#add-achievement)');
          if (detailDialog) {
            detailDialog.querySelector('.achievement-name').textContent = achievement.name;
            detailDialog.querySelector('.overall-score span:nth-child(2)').textContent = achievement.name;
            detailDialog.querySelector('.certified-date').textContent = formatDate(achievement.certifiedDate);
            detailDialog.setAttribute('data-current-achievement-id', achievement.id);
            detailDialog.setAttribute('open', '');
          }
        }
        return;
      }

      if (target.id === 'delete-achievement-btn') {
        const dialog = target.closest('m3e-dialog');
        const aid = dialog?.getAttribute('data-current-achievement-id');
        if (aid && window.confirm(document.documentElement.lang === 'en' ? 'Delete this achievement?' : 'Xóa thành tích này?')) {
          removeAchievement(aid);
          dialog.removeAttribute('open');
          showSnackbar('Achievement deleted.', 'Đã xóa thành tích.');
        }
        return;
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [allData, deleteSavedData, removeRule, renameSavedData, selectSavedData, data, analytics, weekRanges, selectedExportWeeks]);

  useEffect(() => {
    const manager = document.getElementById('data-manager');
    if (!manager) return undefined;

    const getOrCreateImportInput = () => {
      if (createDataImportRef.current) return createDataImportRef.current;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.json,.txt,.md,.cspreset';
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
            showSnackbar('Data imported into current savedata.', 'Đã nhập dữ liệu vào savedata hiện tại.');
          } catch (error) {
            const err = error.message || (document.documentElement.lang === 'en' ? 'Could not import data.' : 'Không thể nhập dữ liệu.');
            showSnackbar('Import failed: ' + err, 'Lỗi khi nhập dữ liệu: ' + err);
          } finally {
            input.value = '';
          }
        };
        input.click();
        return;
      }

      if (saveBtn) {
        const popover = saveBtn.closest('forge-popover');
        if (saveBtn.id === 'save-rename-savedata') {
          const input = popover?.querySelector('#rename-savedata-input');
          const nextName = input?.value?.trim();
          const targetId = popover?.getAttribute('data-target-id');
          if (nextName && targetId) {
            renameSavedData(targetId, nextName);
            showSnackbar('Data renamed.', 'Đã đổi tên dữ liệu.');
            popover.open = false;
          }
          return;
        }
        const inputName = popover?.querySelector('#data-name');
        const name = inputName?.value?.trim() || '';
        if (!name) {
          window.alert(document.documentElement.lang === 'en' ? 'Please enter a data name.' : 'Vui lòng nhập tên dữ liệu.');
          return;
        }
        createSavedData({ name });
        showSnackbar('New savedata created.', 'Đã tạo dữ liệu mới.');
        setHasSelectedSavedata(true);
        if (inputName) inputName.value = '';
        setOpen('m3e-dialog#data-manager', false);
      }
    };

    manager.addEventListener('click', handleClick);
    return () => manager.removeEventListener('click', handleClick);
  }, [createSavedData, importFromFile]);

  useEffect(() => {
    const ranksDialog = document.getElementById('ranking-options');
    if (!ranksDialog) return undefined;

    const handleRankUpdate = (event) => {
      const target = event.target;
      const listItem = target.closest('m3e-list-item[data-generated-rank="true"]');
      if (!listItem) return;

      const type = listItem.getAttribute('data-rank-type');
      const index = Array.from(listItem.parentNode.children).filter(n => n.hasAttribute('data-generated-rank')).indexOf(listItem);
      const name = listItem.querySelector('.rank-name-editable').textContent;
      const min = Number(listItem.querySelector('.rank-min-score-input').value);
      const colorInput = listItem.querySelector('.rank-color-input');
      const color = colorInput?.value || '#0073f7';

      if (type === 'discipline') {
        const nextRankings = [...(data?.disciplineRankings || [])];
        nextRankings[index] = { ...nextRankings[index], name, min, color };
        updateDisciplineRankings(nextRankings);
      } else {
        const nextRankings = [...(data?.studyRankings || [])];
        nextRankings[index] = { ...nextRankings[index], name, min, color };
        updateStudyRankings(nextRankings);
      }
    };

    const handleClick = (event) => {
      const pickColorBtn = event.target.closest('[data-action="pick-color"]');
      if (pickColorBtn && event.target.tagName !== 'INPUT') {
        const input = pickColorBtn.querySelector('.rank-color-input');
        if (input) input.click();
        return;
      }

      const saveBtn = event.target.closest('m3e-button[save-target="rankingManager"]');
      if (!saveBtn) return;
      
      const popover = saveBtn.closest('forge-popover');
      const isStudy = popover?.getAttribute('anchor') === 'add-new-studying-ranking';
      
      const nameSelector = isStudy ? '#studying-rank-name' : '#rank-name';
      const minSelector = isStudy ? '#studying-rank-min-score' : '#rank-min-score';
      const colorSelector = isStudy ? '#studying-rank-color' : '#rank-color';

      const rankNameInput = popover?.querySelector(nameSelector);
      const rankMinScoreInput = popover?.querySelector(minSelector);
      const rankColorInput = popover?.querySelector(colorSelector);
      
      const name = rankNameInput?.value?.trim();
      const min = Number(rankMinScoreInput?.value || 0);
      const color = rankColorInput?.value || '#0073f7';
      
      if (!name) {
        window.alert(document.documentElement.lang === 'en' ? 'Please enter a rank name.' : 'Vui lòng nhập tên thứ hạng.');
        return;
      }
      
      if (isStudy) {
        const nextRankings = [...(data?.studyRankings || []), { name, min, color }];
        updateStudyRankings(nextRankings);
      } else {
        const nextRankings = [...(data?.disciplineRankings || []), { name, min, color }];
        updateDisciplineRankings(nextRankings);
      }
      
      if (rankNameInput) rankNameInput.value = '';
      if (rankMinScoreInput) rankMinScoreInput.value = '';
    };

    ranksDialog.addEventListener('change', handleRankUpdate);
    ranksDialog.addEventListener('click', handleClick);
    return () => {
      ranksDialog.removeEventListener('change', handleRankUpdate);
      ranksDialog.removeEventListener('click', handleClick);
    };
  }, [data?.disciplineRankings, data?.studyRankings, updateDisciplineRankings, updateStudyRankings]);

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

    const handleAdded = (event) => updateScoring({ addedPoints: Number(event.target.value || POINT_DEFAULT_SCORING.addedPoints) });
    const handleSubtracted = (event) => updateScoring({ subtractedPoints: Number(event.target.value || POINT_DEFAULT_SCORING.subtractedPoints) });
    const handleDefaultClassScore = (event) => updateScoring({ defaultClassDisciplineScore: Number(event.target.value || 100) });

    addedPoints?.addEventListener('change', handleAdded);
    subtractedPoints?.addEventListener('change', handleSubtracted);
    document.getElementById('default-class-score')?.addEventListener('change', handleDefaultClassScore);

    return () => {
      addedPoints?.removeEventListener('change', handleAdded);
      subtractedPoints?.removeEventListener('change', handleSubtracted);
      document.getElementById('default-class-score')?.removeEventListener('change', handleDefaultClassScore);
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
        window.alert(document.documentElement.lang === 'en' ? 'Please enter a rule name.' : 'Vui lòng nhập tên quy tắc.');
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
    const input = document.getElementById('recipient-input');
    const menu = document.getElementById('recipient-menu');
    if (!input || !menu) return;

    const classId = data?.selectedClassId;
    const students = data?.classes?.find(c => c.id === classId)?.students || [];

    const updateMenu = (searchText = '') => {
      const filtered = students.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()));
      let html = filtered.map(s => `
        <m3e-menu-item data-id="${s.id}" data-name="${s.name}">
          <m3e-icon slot="leading" name="person"></m3e-icon>
          ${s.name}
        </m3e-menu-item>
      `).join('');
      
      if (searchText && !filtered.some(s => s.name.toLowerCase() === searchText.toLowerCase())) {
        html += `
          <m3e-menu-item data-id="new:${searchText}" data-name="${searchText}">
            <m3e-icon slot="leading-icon" name="person_add"></m3e-icon>
            Thêm người nhận "${searchText}"
          </m3e-menu-item>
        `;
      }
      
      menu.innerHTML = html;
      menu.anchorElement = input;
    };

    const handleInput = (e) => {
      updateMenu(e.target.value);
    };

    const handleFocus = () => {
      updateMenu(input.value);
    };

    const handleMenuClick = (e) => {
      const item = e.target.closest('m3e-menu-item');
      if (!item) return;

      const id = item.getAttribute('data-id');
      const name = item.getAttribute('data-name');
      
      input.value = name;
      input.dataset.recipientId = id;
      menu.open = false;

      // Update checkboxes
      const awardStudentCheckbox = document.getElementById('award-student-points');
      const studentPointsInput = document.getElementById('student-points-value');
      const isStudent = id && !id.startsWith('new:');
      
      if (awardStudentCheckbox) {
        awardStudentCheckbox.disabled = !isStudent;
        if (!isStudent) awardStudentCheckbox.checked = false;
      }
      if (studentPointsInput) {
        studentPointsInput.disabled = !isStudent;
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('click', handleFocus);
    menu.addEventListener('click', handleMenuClick);
    
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('click', handleFocus);
      menu.removeEventListener('click', handleMenuClick);
    };
  }, [data?.classes, data?.selectedClassId]);

  useEffect(() => {
    const saveAchievement = document.getElementById('save-achievement');
    if (!saveAchievement) return undefined;

    const handleSave = () => {
      if (isPastFinalWeek(data?.weekConfig)) {
        showSnackbar('Past the final week. No more points can be added.', 'Đã qua tuần cuối cùng. Không thể cộng thêm điểm.');
        return;
      }

      const achievementName = document.getElementById('achievement-name')?.value?.trim();
      const certifiedDate = document.getElementById('certified-date')?.value || '';
      const recipientInput = document.getElementById('recipient-input');
      const awardStudent = document.getElementById('award-student-points')?.checked;
      const studentPoints = Number(document.getElementById('student-points-value')?.value || 0);
      const awardClass = document.getElementById('award-class-points')?.checked;
      const classPoints = Number(document.getElementById('class-points-value')?.value || 0);

      if (!achievementName) return;

      let finalName = achievementName;
      const recipientValue = recipientInput?.dataset.recipientId;
      const recipientLabel = recipientInput?.value || '';

      if (recipientLabel) {
        if (recipientValue && recipientValue.startsWith('new:')) {
          finalName += ` (Người nhận: ${recipientLabel})`;
        } else if (recipientValue) {
          finalName += ` (Học sinh: ${recipientLabel})`;
        } else {
           finalName += ` (Người nhận: ${recipientLabel})`;
        }
      }

      addAchievementWithBonus({
        name: finalName,
        certifiedDate,
      }, {
        studentId: recipientValue,
        studentPoints: awardStudent ? studentPoints : 0,
        awardClass: awardClass,
        classPoints: awardClass ? classPoints : 0
      });

      setStudentAchievementName(finalName);
      setOpen('#add-achievement', false);
      showSnackbar('Achievement added.', 'Đã thêm thành tích.');

      // Reset fields
      const nameInput = document.getElementById('achievement-name');
      const dateInput = document.getElementById('certified-date');
      if (nameInput) nameInput.value = '';
      if (dateInput) dateInput.value = '';
      
      // Reset fields
      if (recipientInput) {
        recipientInput.value = '';
        delete recipientInput.dataset.recipientId;
      }
    };

    const delegated = (event) => {
      if (event.target.closest('#save-achievement')) {
        handleSave();
      }
    };
    document.addEventListener('click', delegated);
    return () => {
      document.removeEventListener('click', delegated);
    };
  }, [addAchievement, bulkAddLogs]);

  useEffect(() => {
    const handleQuickExport = (event) => {
      const button = event.target.closest('m3e-button');
      if (!button) return;
      const text = (button.textContent || '').trim();
      if (text.includes('Xuất dữ liệu') || text.includes('Export data')) {
        setOpen('#export-data-dialog', true);
      }
    };
    document.addEventListener('click', handleQuickExport);
    return () => document.removeEventListener('click', handleQuickExport);
  }, []);

  useEffect(() => {
    // Only update labels outside the list if it's NOT in the competition list
    document.querySelectorAll('.achievement-name').forEach((node) => {
      if (!node.closest('.achievements') && !node.closest('m3e-dialog[id="competition"]') && studentAchievementName) {
        node.textContent = studentAchievementName;
      }
    });

    // Check for student info dialog specifically
    const studentInfo = document.getElementById('student-info');
    if (studentInfo) {
      const selectedStudentId = document.body.getAttribute('data-selected-student-id');
      if (selectedStudentId) {
        const student = data?.classes?.flatMap(c => c.students || []).find(s => s.id === selectedStudentId);
        if (student) {
          const achievementLogs = (student.logs || [])
            .filter(l => l.category === 'Thành tích' || l.reason?.startsWith('Đạt thành tích:'))
            .map(l => l.reason?.replace('Đạt thành tích: ', '') || l.reason);
          
          const labelNode = studentInfo.querySelector('.achievement-name');
          if (labelNode) {
            labelNode.textContent = achievementLogs.length > 0 ? achievementLogs[achievementLogs.length - 1] : (studentAchievementName || '-');
          }
        }
      }
    }
  }, [studentAchievementName, data?.achievements, data?.classes]);

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
      status.textContent = `(${value}%)`;
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
          showSnackbar('Imported successfully.', 'Đã nhập dữ liệu thành công.');
        }, 350);
      } catch (error) {
        console.error(error);
        setImportProgress(0);
        window.alert(error.message || (document.documentElement.lang === 'en' ? 'Could not import data.' : 'Không thể nhập dữ liệu.'));
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
      .map((week) => `<m3e-menu-item-checkbox data-week-choice="${week.index}" ${selectedExportWeeks.includes(week.index) ? 'checked' : ''}><span class="vi">${week.label}</span><span class="en">Week ${week.index}</span></m3e-menu-item-checkbox>`)
      .join('');

    const handler = (event) => {
      const item = event.target.closest('[data-week-choice]');
      if (!item) return;
      const weekIndex = Number(item.getAttribute('data-week-choice'));
      setSelectedExportWeeks((prev) => {
        if (prev.includes(weekIndex)) {
          return prev.filter((w) => w !== weekIndex);
        }
        return [...prev, weekIndex];
      });
    };

    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        const style = window.getComputedStyle(exportMenu);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        
        if (isVisible) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          setSelectedExportWeeks((prev) => {
            if (prev.length === weekRanges.length) {
              return [];
            }
            return weekRanges.map((w) => w.index);
          });
        }
      }
    };

    exportMenu.addEventListener('click', handler);
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      exportMenu.removeEventListener('click', handler);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [selectedExportWeeks, weekRanges]);

  useEffect(() => {
    const autoOpenSwitch = document.getElementById('auto-open');
    const preferredSavedata = document.getElementById('preferred-savedata');
    if (!autoOpenSwitch || !preferredSavedata) return;

    // Populate options
    preferredSavedata.innerHTML = allData
      .map(item => `<m3e-option value="${item.id}" ${item.id === preferredDataId ? 'selected' : ''}><span>${item.name}</span></m3e-option>`)
      .join('');

    autoOpenSwitch.checked = autoOpenEnabled;
    preferredSavedata.value = preferredDataId || '';

    const handleSwitch = (e) => {
      updateAutoOpen(e.target.checked, preferredSavedata.value);
    };

    const handleSelect = (e) => {
      updateAutoOpen(autoOpenSwitch.checked, e.target.value);
    };

    autoOpenSwitch.addEventListener('change', handleSwitch);
    preferredSavedata.addEventListener('change', handleSelect);

    return () => {
      autoOpenSwitch.removeEventListener('change', handleSwitch);
      preferredSavedata.removeEventListener('change', handleSelect);
    };
  }, [allData, autoOpenEnabled, preferredDataId, updateAutoOpen]);

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
      const labels = ['analysis', 'classes', 'students', 'achievements', 'subjectScores', 'week'];
      const selected = labels.filter((label, index) => checkboxes[index]?.checked);

      if (!selected.length) {
        window.alert(document.documentElement.lang === 'en' ? 'Select at least 1 data to export.' : 'Chọn ít nhất 1 dữ liệu để xuất.');
        return;
      }

      const format = document.getElementById('file-format')?.value || '.json';
      const selectedWeeksData = selectedExportWeeks
        .map((idx) => weekRanges.find((w) => w.index === idx))
        .filter(Boolean)
        .map((week) => ({
          ...week,
          students: analytics.students.map((student) => ({
            id: student.id,
            name: student.name,
            score: getStudentWeekScore(student, week),
          })),
        }));

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
        subjectScores: data?.subjectScores || {},
        subjects: data?.subjects || [],
        semesters: data?.semesters || [],
      };

      if (selected.includes('analysis')) exportedDataset.analysis = analytics;
      if (selected.includes('classes')) exportedDataset.classes = data?.classes || [];
      if (selected.includes('students')) {
        const students = (data?.classes || []).flatMap((item) => item.students || []);
        exportedDataset.students = students;
        if (!selected.includes('classes')) {
          exportedDataset.classes = (data?.classes || []).map((cl) => ({
            id: cl.id,
            name: cl.name,
            students: (cl.students || []).map((s) => ({ id: s.id })),
          }));
        }
      }
      if (selected.includes('achievements')) exportedDataset.achievements = data?.achievements || [];
      if (selected.includes('week') && selectedWeeksData.length > 0) {
        exportedDataset.weeks = selectedWeeksData;
        // Backward compatibility for single week if needed by some older parts
        exportedDataset.week = selectedWeeksData[0];
      }

      const payload = {
        version: 3,
        activeDataId: exportedDataset.id,
        datasets: [exportedDataset],
      };

      const baseFilename = `${data.name || 'Export'}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}`;

      if (format.includes('.xlsx')) {
        const workbook = XLSX.utils.book_new();
        if (selected.includes('analysis') && exportedDataset.analysis) {
          const analysisSheet = XLSX.utils.json_to_sheet([{
            TongHocSinh: exportedDataset.analysis.totalStudents,
            XepLoaiLop: exportedDataset.analysis.classRank,
            DiemTrungBinh: exportedDataset.analysis.classAverageScore,
          }]);
          XLSX.utils.book_append_sheet(workbook, analysisSheet, 'PhanTich');
        }
        if (selected.includes('classes')) {
          const classesSheet = XLSX.utils.json_to_sheet((exportedDataset.classes || []).map((cl) => ({
            Lop: cl.name,
            SoHocSinh: (cl.students || []).length,
          })));
          XLSX.utils.book_append_sheet(workbook, classesSheet, 'DanhSachLop');
        }
        if (selected.includes('students')) {
          const studentsSheet = XLSX.utils.json_to_sheet((exportedDataset.students || []).map((s) => ({
            HoTen: s.name,
            NgaySinh: s.dob,
            Diem: s.score,
            XepLoaiThiDua: s.disciplineRank,
            XepLoaiHocTap: s.studyRank,
          })));
          XLSX.utils.book_append_sheet(workbook, studentsSheet, 'HocSinh');
        }
        if (selected.includes('achievements')) {
          const achievementsSheet = XLSX.utils.json_to_sheet((exportedDataset.achievements || []).map((a) => ({
            ThanhTich: a.name,
            NgayDat: a.achievementDate,
            NgayNhan: a.certifiedDate,
          })));
          XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'ThanhTich');
        }
        if (selected.includes('week') && exportedDataset.weeks) {
          const allWeekRows = exportedDataset.weeks.flatMap((w) => 
            (w.students || []).map((s) => ({
              Tuan: w.label || w.index,
              HocSinh: s.name,
              Diem: s.score,
            }))
          );
          const weekSheet = XLSX.utils.json_to_sheet(allWeekRows);
          XLSX.utils.book_append_sheet(workbook, weekSheet, 'DuLieuTuan');
        }
        if (selected.includes('subjectScores')) {
          const semesters = exportedDataset.semesters || [];
          const subjects = exportedDataset.subjects || [];
          const subjectScores = exportedDataset.subjectScores || {};
          const students = exportedDataset.students || (data?.classes || []).flatMap(c => c.students || []);

          semesters.forEach(sem => {
            const rows = students.map(student => {
              const row = { 'Học sinh': student.name };
              subjects.forEach(sub => {
                const score = subjectScores[sem.id]?.[sub.id]?.[student.id];
                row[`${sub.name}-TX`] = score?.regular || '';
                row[`${sub.name}-GK`] = score?.midterm ?? '';
                row[`${sub.name}-CK`] = score?.final ?? '';
              });
              return row;
            });
            const sheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, sem.name.substring(0, 31)); // Excel sheet name limit
          });
        }
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        downloadBlob(new Blob([buffer]), `${baseFilename}.xlsx`);
      } else if (format.includes('.txt')) {
        let content = formatPlainTextExport(payload, selected);
        if (selected.includes('week') && selectedWeeksData.length > 1) {
          // Addition for multi-week text export
          content += '\n\n[Bo sung du lieu cac tuan khac]\n';
          selectedWeeksData.slice(1).forEach(w => {
            content += `\nTuan: ${w.label || w.index}\n`;
            (w.students || []).forEach((s, i) => content += `${i+1}. ${s.name}: ${s.score}\n`);
          });
        }
        downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${baseFilename}.txt`);
      } else if (format.includes('.md')) {
        let content = formatMarkdownExport(payload, selected);
        if (selected.includes('week') && selectedWeeksData.length > 1) {
          content += '\n\n## Du lieu cac tuan khac\n';
          selectedWeeksData.slice(1).forEach(w => {
            content += `\n### Tuan: ${w.label || w.index}\n\n`;
            (w.students || []).forEach((s, i) => content += `- ${i+1}. ${s.name}: ${s.score}\n`);
          });
        }
        downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `${baseFilename}.md`);
      } else if (format.includes('.html')) {
        downloadBlob(new Blob([formatHtmlExport(payload, selected)], { type: 'text/html;charset=utf-8' }), `${baseFilename}.html`);
      } else if (format === '.cspreset') {
        downloadBlob(new Blob([formatCsPresetExport(data)], { type: 'application/json' }), `${baseFilename}.cspreset`);
      } else {
        downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${baseFilename}.json`);
      }

      setOpen('#export-data-dialog', false);
      showSnackbar('Data exported successfully.', 'Đã xuất dữ liệu thành công.');
    };

    exportBtn.addEventListener('click', handleExport);
    return () => exportBtn.removeEventListener('click', handleExport);
  }, [analytics, data, selectedExportWeeks, weekRanges]);

  return null;
}
