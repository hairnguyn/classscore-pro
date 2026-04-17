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
} from '../utils/PointCalculator';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const setTextForAll = (selector, value) => {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
};

export default function Dashboard() {
  const { data, deleteStudent, selectClass } = useAppContext();
  const [selectedStudentId, setSelectedStudentId] = useState('');

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
    setTextForAll('#dashboard .classroom-name', activeClass?.name || '');
    setTextForAll('#dashboard #d-total-students', String(analytics.totalStudents));
    setTextForAll('#dashboard #d-avg-score', analytics.classRank || '-');
    setTextForAll('#dashboard #d-at-risk', analytics.atRisk[0] ? `${analytics.atRisk[0].reason} (${analytics.atRisk[0].count})` : 'Không có');
    setTextForAll(
      '#dashboard #d-top-perf',
      analytics.topPerformerThisWeek ? analytics.topPerformerThisWeek.student.name : '-',
    );

    const table = document.querySelector('#dashboard md-data-table');
    if (table) {
      table.querySelectorAll('md-data-table-row').forEach((row) => row.remove());
      if (!analytics.sortedByPerformance.length) {
        const row = document.createElement('md-data-table-row');
        row.innerHTML = `
          <md-data-table-cell colSpan="4" style="text-align: center; padding: 40px;">
            <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; margin: auto;">
              <img src="/empty-ui.webp" style="width: 256px;" alt="">
              <m3e-heading variant="headline" size="small">Chưa có học sinh</m3e-heading>
            </div>
          </md-data-table-cell>
        `;
        table.appendChild(row);
      } else {
        analytics.sortedByPerformance.forEach((student, index) => {
          const row = document.createElement('md-data-table-row');
          row.innerHTML = `
            <md-data-table-cell style="width: 75px;" type="numeric">${index + 1}</md-data-table-cell>
            <md-data-table-cell>${student.name}</md-data-table-cell>
            <md-data-table-cell type="numeric" style="text-align: start;">${student.calculatedScore}</md-data-table-cell>
            <md-data-table-cell>${student.overallGrade}</md-data-table-cell>
          `;
          table.appendChild(row);
        });
      }
    }
  }, [activeClass?.name, analytics]);

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
    if (!selectedStudent) {
      return;
    }

    const dialog = document.getElementById('student-info');
    if (!dialog) {
      return;
    }

    dialog.setAttribute('student-id', selectedStudent.id);
    dialog.querySelectorAll('.name').forEach((node) => {
      node.textContent = selectedStudent.name;
    });
    const ranking = `Nề nếp: ${selectedStudent.behaviorGrade}, Học tập: ${selectedStudent.academicGrade}. Điểm thi đua tuần này: ${analytics.topPerformerThisWeek?.student.id === selectedStudent.id ? analytics.topPerformerThisWeek.score : selectedStudent.calculatedScore}`;
    dialog.querySelectorAll('.general-ranking').forEach((node) => {
      node.textContent = ranking;
    });
  }, [analytics.topPerformerThisWeek, selectedStudent]);

  useEffect(() => {
    const avgDialog = document.getElementById('average-disclipine');
    if (!avgDialog || !selectedStudent) {
      return;
    }

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
      list.innerHTML = weeklyBreakdown
        .map(
          (week) => `
            <m3e-list-action data-week-item="${week.index}">
              <m3e-icon name="school" slot="leading"></m3e-icon>
              <span>${week.label}</span>
              <span slot="trailing" style="font-size: larger;">${week.score}</span>
            </m3e-list-action>
          `,
        )
        .join('');
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
        panels[0].innerHTML = `<span slot="header">Điểm thưởng</span><ul>${positives.map((log) => `<li>${log.reason} ${log.points > 0 ? `+${log.points}` : log.points} điểm</li>`).join('') || '<li>Không có</li>'}</ul>`;
      }
      if (panels[1]) {
        panels[1].innerHTML = `<span slot="header">Vi phạm</span><ul>${negatives.map((log) => `<li>${log.reason} ${log.points} điểm</li>`).join('') || '<li>Không có</li>'}</ul>`;
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
      if (window.confirm('Xóa học sinh này?')) {
        deleteStudent(classId, selectedStudent.id);
      }
    };

    deleteAction.addEventListener('click', handler);
    return () => deleteAction.removeEventListener('click', handler);
  }, [data?.classes, deleteStudent, selectedStudent]);

  const pieData = {
    labels: ['Xuất sắc', 'Tốt', 'Khá', 'Trung bình', 'Yếu'],
    datasets: [
      {
        data: [
          analytics.gradeBuckets['Xuất sắc'],
          analytics.gradeBuckets.Tốt,
          analytics.gradeBuckets.Khá,
          analytics.gradeBuckets['Trung bình'],
          analytics.gradeBuckets.Yếu,
        ],
        backgroundColor: ['#17623c', '#2e8b57', '#3f8efc', '#f7b500', '#cf2e2e'],
      },
    ],
  };

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

  return (
    <>
      {dashboardPieTarget && createPortal(<Pie data={pieData} options={{ maintainAspectRatio: false }} />, dashboardPieTarget)}
      {dashboardLineTarget && createPortal(<Line data={lineData} options={{ maintainAspectRatio: false }} />, dashboardLineTarget)}
      {reportLineTarget && createPortal(<Line data={lineData} options={{ maintainAspectRatio: false }} />, reportLineTarget)}
      {reportBarTarget && createPortal(<Bar data={rankingData} options={{ maintainAspectRatio: false }} />, reportBarTarget)}
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
    </>
  );
}
