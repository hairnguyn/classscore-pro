import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useAppContext } from '../store/AppContext';
import {
  formatDate,
  getCurrentWeek,
  getDatasetAnalytics,
  getStudentAverageWeekScore,
  getStudentWeeklyBreakdown,
  getWeekRanges,
} from '../utils/PointCalculator';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const setHTMLForAll = (selector, html) => {
  document.querySelectorAll(selector).forEach((node) => {
    node.innerHTML = html;
  });
};

export default function Dashboard() {
  const { data, deleteStudent, selectClass, currentTab } = useAppContext();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'performance', asc: false });

  const activeClass = useMemo(
    () => data?.classes?.find((item) => item.id === data?.selectedClassId) || data?.classes?.[0] || null,
    [data?.classes, data?.selectedClassId],
  );
  const analytics = useMemo(
    () => getDatasetAnalytics({ ...data, classes: activeClass ? [activeClass] : [] }),
    [activeClass, data],
  );
  const currentWeek = useMemo(() => getCurrentWeek(data?.weekConfig), [data?.weekConfig]);
  const selectedStudent = useMemo(
    () => analytics.students.find((student) => student.id === selectedStudentId) || analytics.students[0] || null,
    [analytics.students, selectedStudentId],
  );
  const weeklyBreakdown = useMemo(
    () => (selectedStudent ? getStudentWeeklyBreakdown(selectedStudent, data?.weekConfig) : []),
    [data?.weekConfig, selectedStudent],
  );

  useEffect(() => {
    if (currentTab !== '#/' && currentTab !== '/') return;

    setHTMLForAll('#dashboard .classroom-name', activeClass?.name || '');
    setHTMLForAll('#dashboard #d-total-students', String(analytics.totalStudents));
    setHTMLForAll('#dashboard #d-avg-score', analytics.classRank || '-');
    setHTMLForAll(
      '#dashboard #d-at-risk',
      analytics.atRisk[0]
        ? `<span class="vi">${analytics.atRisk[0].reason} (${analytics.atRisk[0].count})</span><span class="en">${analytics.atRisk[0].reason} (${analytics.atRisk[0].count})</span>`
        : '<span class="vi">Không có</span><span class="en">None</span>',
    );
    setHTMLForAll(
      '#dashboard #d-top-perf',
      analytics.topPerformerThisWeek ? analytics.topPerformerThisWeek.student.name : '-',
    );

    const table = document.getElementById('dashboard-table');
    if (table) {
      // let emptyStateContainer = ... (re-defined below)

      let emptyStateContainer = document.querySelector('#dashboard .dashboard-empty-container');
      if (!emptyStateContainer) {
        emptyStateContainer = document.createElement('div');
        emptyStateContainer.className = 'dashboard-empty-container';
        emptyStateContainer.style.display = 'flex';
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

      const displayList = [...analytics.sortedByPerformance].sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'name') {
          valA = a.name?.toLowerCase() || '';
          valB = b.name?.toLowerCase() || '';
        } else if (sortConfig.key === 'score') {
          valA = a.calculatedScore || 0;
          valB = b.calculatedScore || 0;
        } else if (sortConfig.key === 'rating') {
          valA = a.overallGrade || '';
          valB = b.overallGrade || '';
        } else {
          // Default to performance (calculatedScore desc)
          valA = a.calculatedScore || 0;
          valB = b.calculatedScore || 0;
          return valB - valA;
        }
        
        if (valA < valB) return sortConfig.asc ? -1 : 1;
        if (valA > valB) return sortConfig.asc ? 1 : -1;
        return 0;
      });

      if (!displayList.length) {
        table.style.display = 'none';
        emptyStateContainer.style.display = 'flex';
      } else {
        table.style.display = '';
        emptyStateContainer.style.display = 'none';
      // Only update if needed
      const currentRows = table.querySelectorAll('md-data-table-row');
      const needsUpdate = currentRows.length !== displayList.length || 
                          displayList.some((s, i) => currentRows[i]?.getAttribute('data-student-id') !== s.id);

      if (needsUpdate) {
        currentRows.forEach((row) => row.remove());
        emptyStateContainer.style.display = 'none';

        const fragment = document.createDocumentFragment();
        displayList.forEach((student, index) => {
          const row = document.createElement('md-data-table-row');
          row.setAttribute('data-student-id', student.id);
          row.innerHTML = `
            <md-data-table-cell style="width: 75px;" type="numeric">${index + 1}</md-data-table-cell>
            <md-data-table-cell>${student.name}</md-data-table-cell>
            <md-data-table-cell type="numeric" style="text-align: start;">${student.calculatedScore}</md-data-table-cell>
            <md-data-table-cell>${student.overallGrade}</md-data-table-cell>
          `;
          fragment.appendChild(row);
        });
        table.appendChild(fragment);
      }
      }

      const handleSort = (e) => {
        const { column, isDescending } = e.detail;
        const columns = Array.from(table.querySelectorAll('md-data-table-column'));
        const columnIndex = columns.indexOf(column);
        
        let key = '';
        if (columnIndex === 1) key = 'name';
        else if (columnIndex === 2) key = 'score';
        else if (columnIndex === 3) key = 'rating';
        
        if (key) {
          setSortConfig({ key, asc: !isDescending });
        }
      };

      table.addEventListener('sorted', handleSort);
      return () => table.removeEventListener('sorted', handleSort);
    }
  }, [activeClass?.name, analytics, sortConfig, currentTab]);

  useEffect(() => {
    const choosers = [...document.querySelectorAll('#class-chooser')];
    if (!choosers.length) return;
    const handleSelect = (event) => {
      const item = event.target.closest('[data-id]');
      if (!item) return;
      selectClass(item.getAttribute('data-id') || '');
    };
    choosers.forEach((chooser) => chooser.addEventListener('click', handleSelect));
    return () => choosers.forEach((chooser) => chooser.removeEventListener('click', handleSelect));
  }, [selectClass]);

  useEffect(() => {
    const dashNotify = document.getElementById('dashboard-notifications');
    const reportsNotify = document.getElementById('reports-notifications');
    if (!dashNotify || !reportsNotify || !data?.weekConfig) return;

    const ranges = getWeekRanges(data.weekConfig);
    const lastWeek = ranges[ranges.length - 1];
    const isYearEnd = Date.now() > (lastWeek?.end?.getTime() || 0);

    const renderNotify = (container) => {
      if (!isYearEnd) {
        container.innerHTML = '';
        return;
      }
      container.innerHTML = `
        <m3e-list variant="segmented" class="list-item-notifications" style="margin-bottom: 16px;">
          <m3e-list-item>
            <m3e-icon slot="leading" name="info"></m3e-icon>
            <span><span class="vi">Bạn đã qua <span class="weeks">${ranges.length}</span> tuần! Bây giờ là lúc tổng kết lại.</span><span
                class="en">You have passed <span class="weeks">${ranges.length}</span> weeks! Now is the time to look back.</span></span>
            <m3e-button onclick="window.dispatchEvent(new CustomEvent('open-recap-system'))" variant="filled" slot="trailing"><span class="vi">Xem</span><span class="en">Open Recap</span></m3e-button>
          </m3e-list-item>
        </m3e-list>
      `;
    };

    renderNotify(dashNotify);
    renderNotify(reportsNotify);
  }, [data?.weekConfig]);

  useEffect(() => {
    const dialog = document.getElementById('student-info');
    if (!dialog || !selectedStudent) return;

    dialog.setAttribute('student-id', selectedStudent.id);
    dialog.querySelectorAll('.name').forEach((node) => {
      node.textContent = selectedStudent.name;
    });
    const rankingVi = `Nề nếp: ${selectedStudent.behaviorGrade}, Học tập: ${selectedStudent.academicGrade}. Điểm thi đua tuần này: ${analytics.topPerformerThisWeek?.student.id === selectedStudent.id ? analytics.topPerformerThisWeek.score : selectedStudent.calculatedScore}`;
    const rankingEn = `Discipline: ${selectedStudent.behaviorGrade}, Study: ${selectedStudent.academicGrade}. This week's score: ${analytics.topPerformerThisWeek?.student.id === selectedStudent.id ? analytics.topPerformerThisWeek.score : selectedStudent.calculatedScore}`;
    
    dialog.querySelectorAll('.general-ranking').forEach((node) => {
      node.innerHTML = `<span class="vi">${rankingVi}</span><span class="en">${rankingEn}</span>`;
    });
  }, [analytics.topPerformerThisWeek, selectedStudent]);

  useEffect(() => {
    const avgDialog = document.getElementById('average-disclipine');
    if (!avgDialog || !selectedStudent) return;

    const scoreValue = avgDialog.querySelector('.overall-score .heading');
    const fromTo = avgDialog.querySelector('.fromto');
    const list = avgDialog.querySelector('m3e-list');
    if (scoreValue) {
      scoreValue.textContent = String(getStudentAverageWeekScore(selectedStudent, data?.weekConfig));
    }
    if (fromTo) {
      fromTo.textContent = `${formatDate(data?.weekConfig?.startDate)} - ${formatDate(data?.weekConfig?.endDate)}`;
    }
    if (list) {
      // Remove other actions
      list.querySelectorAll('m3e-list-action').forEach(el => el.remove());
      // No need for empty state image here because we will always list all weeks from the config
      const emptyState = list.querySelector('.empty-state');
      if (emptyState) emptyState.style.display = 'none';
      
      weeklyBreakdown.forEach((week) => {
        const action = document.createElement('m3e-list-action');
        action.setAttribute('data-week-item', String(week.index));
        action.innerHTML = `
          <m3e-icon name="school" slot="leading"></m3e-icon>
          <span><span class=\"vi\">${week.label}</span><span class=\"en\">${week.label}</span></span>
          <span slot=\"trailing\" style=\"font-size: larger;\"><span class=\"vi\">${week.score}</span><span class=\"en\">${week.score}</span></span>
        `;
        list.appendChild(action);
      });
    }
  }, [data?.weekConfig, selectedStudent, weeklyBreakdown]);

  useEffect(() => {
    const weekDialog = document.getElementById('student-week-rating');
    const avgDialog = document.getElementById('average-disclipine');
    if (!weekDialog || !selectedStudent) {
      return;
    }

    const handler = (event) => {
      const item = event.target.closest('[data-week-item]');
      if (!item) return;
      const week = weeklyBreakdown.find((entry) => entry.index === Number(item.getAttribute('data-week-item')));
      if (!week) return;

      weekDialog.setAttribute('open', '');
      const weekName = weekDialog.querySelector('.week');
      const studentName = weekDialog.querySelector('.name');
      const score = weekDialog.querySelector('.overall-score .heading');
      const fromTo = weekDialog.querySelector('.fromto');
      const panels = weekDialog.querySelectorAll('m3e-expansion-panel');
      const positives = week.logs.filter((log) => Number(log.points) >= 0);
      const negatives = week.logs.filter((log) => Number(log.points) < 0);

      if (weekName) weekName.textContent = week.label;
      if (studentName) studentName.textContent = selectedStudent.name;
      if (score) score.textContent = String(week.score);
      if (fromTo) fromTo.textContent = week.fromTo;
      if (panels[0]) {
        panels[0].innerHTML = `<span slot="header"><span class="vi">Điểm thưởng</span><span class="en">Additions</span></span><ul>${positives.map((log) => `<li>${log.reason} ${log.points > 0 ? `+${log.points}` : log.points} <span class="vi">điểm</span><span class="en">points</span></li>`).join('') || '<li><span class="vi">Không có</span><span class="en">None</span></li>'}</ul>`;
      }
      if (panels[1]) {
        panels[1].innerHTML = `<span slot="header"><span class="vi">Vi phạm</span><span class="en">Violations</span></span><ul>${negatives.map((log) => `<li>${log.reason} ${log.points} <span class="vi">điểm</span><span class="en">points</span></li>`).join('') || '<li><span class="vi">Không có</span><span class="en">None</span></li>'}</ul>`;
      }
    };

    const list = avgDialog?.querySelector('m3e-list');
    list?.addEventListener('click', handler);
    return () => list?.removeEventListener('click', handler);
  }, [selectedStudent, weeklyBreakdown]);

  useEffect(() => {
    const deleteAction = document.querySelector('#student-info m3e-list-action:last-child');
    if (!deleteAction || !selectedStudent) return;

    const handler = () => {
      const classId = data?.classes?.find((item) => item.students.some((student) => student.id === selectedStudent.id))?.id;
      if (!classId) return;
      if (window.confirm(document.documentElement.lang === 'en' ? 'Delete this student?' : 'Xóa học sinh này?')) {
        deleteStudent(classId, selectedStudent.id);
      }
    };

    deleteAction.addEventListener('click', handler);
    return () => deleteAction.removeEventListener('click', handler);
  }, [data?.classes, deleteStudent, selectedStudent]);

  useEffect(() => {
    const dialogs = document.querySelectorAll('#violations-dialog, #violations-detailed-dialog');
    if (!dialogs.length) return;

    dialogs.forEach((dialog) => {
      const fromToNode = dialog.querySelector('.fromto');
      if (fromToNode) fromToNode.textContent = currentWeek.fromTo;

      const list = dialog.querySelector('m3e-list');
      const emptyState = dialog.querySelector('.empty-state');
      if (!list || !emptyState) return;

      const violatedStudents = analytics.students.flatMap(student => {
         const breakdown = getStudentWeeklyBreakdown(student, data?.weekConfig);
         const weekStatus = breakdown.find(w => w.index === currentWeek.index);
         if (!weekStatus) return [];
         const negLogs = weekStatus.logs.filter(log => Number(log.points) < 0);
         return negLogs.map(log => ({ studentName: student.name, reason: log.reason, points: log.points }));
      });

      if (!violatedStudents.length) {
        list.style.display = 'none';
        emptyState.style.display = 'flex';
      } else {
        list.style.display = '';
        emptyState.style.display = 'none';
        list.innerHTML = '';
        violatedStudents.forEach((v, idx) => {
           const item = document.createElement('m3e-list-item');
           item.innerHTML = `
            <m3e-icon name="person" slot="leading"></m3e-icon>
            <span>${v.studentName}</span>
            <span slot="supporting-text" class="specific-violation"><span class="vi">Lỗi: ${v.reason} (${v.points} điểm)</span><span class="en">Error: ${v.reason} (${v.points} points)</span></span>
            <m3e-icon-button slot="trailing" id="check-violation-${idx}"><m3e-icon name="check"></m3e-icon></m3e-icon-button>
            <m3e-tooltip for="check-violation-${idx}"><span class="vi">Đã hiểu</span><span class="en">Understood</span></m3e-tooltip>
           `;
           list.appendChild(item);
        });
      }
    });
  }, [currentWeek, analytics.students, data?.weekConfig]);

  useEffect(() => {
    const handler = (e) => {
      setSelectedStudentId(e.detail);
      const dialog = document.getElementById('student-info');
      // small delay to allow react to finish re-render mapping of data
      setTimeout(() => {
        if (dialog) dialog.setAttribute('open', '');
      }, 10);
    };
    window.addEventListener('select-student', handler);
    return () => window.removeEventListener('select-student', handler);
  }, []);

  const rankings = data?.disciplineRankings || [];
  const pieLabels = rankings.length ? rankings.map(r => r.name) : ['Xuất sắc', 'Tốt', 'Khá', 'Trung bình', 'Yếu'];
  const pieColors = rankings.length 
    ? rankings.map(r => r.color || '#0073f7') 
    : ['#ffb300', '#00c6f7', '#00b800', '#0073f7', '#5f16c4'];

  const pieData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieLabels.map(label => analytics.gradeBuckets[label] || 0),
        backgroundColor: pieColors.slice(0, pieLabels.length),
      },
    ],
  };

  const hasData = analytics.students.length > 0;
  const hasWeeklyData = analytics.weeklyAverages.some(v => v > 0);
  const emptyStateHtml = (title) => `
    <div class="chart-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <img src="./EMP_STA_NOFILE.png" style="width: 128px; opacity: 0.8;" alt="">
      <span style="margin-top: 10px; color: var(--md-sys-color-on-surface-variant);">${title}</span>
    </div>
  `;

  const lineData = {
    labels: analytics.weeklyAverages.map((_, index) => `Tuần ${index + 1}`),
    datasets: [
      {
        label: 'Điểm trung bình của lớp',
        data: analytics.weeklyAverages,
        borderColor: '#0b57d0',
        backgroundColor: 'rgba(11, 87, 208, 0.18)',
        tension: 0.25,
      },
    ],
  };

  const rankingData = {
    labels: analytics.sortedByPerformance.map((student) => student.name),
    datasets: [
      {
        label: 'Điểm thi đua',
        data: analytics.sortedByPerformance.map((student) => student.calculatedScore),
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20, 184, 166, 0.4)',
      },
    ],
  };

  const dashboardPieTarget = document.getElementById('d-pie-chart');
  const dashboardLineTarget = document.getElementById('d-line-chart');
  const reportLineTarget = document.getElementById('realtime-line-graph-excellent-student');
  const reportBarTarget = document.getElementById('realtime-line-graph-student-discipline');
  const classMenus = [...document.querySelectorAll('#class-chooser')];
  const customClassMenus = [...document.querySelectorAll('#class-opts-dyn-list')];

  return (
    <>
      {dashboardPieTarget && createPortal(
        hasData ? <Pie data={pieData} options={{ maintainAspectRatio: false }} /> : <div dangerouslySetInnerHTML={{ __html: emptyStateHtml(document.documentElement.lang === 'en' ? 'No ranking data' : 'Chưa có dữ liệu xếp loại') }} style={{ height: '100%' }} />,
        dashboardPieTarget
      )}
      {dashboardLineTarget && createPortal(
        hasWeeklyData ? <Line data={lineData} options={{ maintainAspectRatio: false }} /> : <div dangerouslySetInnerHTML={{ __html: emptyStateHtml(document.documentElement.lang === 'en' ? 'No progress data' : 'Chưa có dữ liệu tiến triển') }} style={{ height: '100%' }} />,
        dashboardLineTarget
      )}
      {reportLineTarget && createPortal(
        hasWeeklyData ? <Line data={lineData} options={{ maintainAspectRatio: false }} /> : <div dangerouslySetInnerHTML={{ __html: emptyStateHtml(document.documentElement.lang === 'en' ? 'No report data' : 'Chưa có báo cáo') }} style={{ height: '100%' }} />,
        reportLineTarget
      )}
      {reportBarTarget && createPortal(
        hasData ? <Bar data={rankingData} options={{ maintainAspectRatio: false }} /> : <div dangerouslySetInnerHTML={{ __html: emptyStateHtml(document.documentElement.lang === 'en' ? 'No student data' : 'Chưa có học sinh') }} style={{ height: '100%' }} />,
        reportBarTarget
      )}
      {classMenus.map((menu, menuIndex) =>
        createPortal(
          <>
            {(data?.classes || []).map((classItem) => (
              <m3e-menu-item key={`${menuIndex}-${classItem.id}`} data-id={classItem.id}>
                <m3e-icon name="school" slot="icon"></m3e-icon>
                <span>{classItem.name}</span>
              </m3e-menu-item>
            ))}
          </>,
          menu,
        ),
      )}
      {customClassMenus.map((menu, menuIndex) => 
        createPortal(
          <>
             {(data?.classes || []).map((classItem) => (
              <div className="list-item action" key={`custom-${menuIndex}-${classItem.id}`} data-id={classItem.id} onClick={(e) => {
                selectClass(classItem.id);
                document.querySelectorAll('.dropdown.show').forEach(el => el.classList.remove('show'));
              }}>
                <div className="left">
                  <i className="ico">􀫓</i>
                  <span>{classItem.name}</span>
                </div>
              </div>
            ))}
          </>,
          menu
        )
      )}
    </>
  );
}
