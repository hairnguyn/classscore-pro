import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { getDatasetAnalytics, getStudentAverageWeekScore, getStudentWeeklyBreakdown, getWeekRanges, formatDate, isPastFinalWeek } from '../utils/PointCalculator';

export default function Reports() {
  const { data, updateStudent, currentTab } = useAppContext();
  const activeClass = useMemo(
    () => data?.classes?.find((item) => item.id === data?.selectedClassId) || data?.classes?.[0] || null,
    [data?.classes, data?.selectedClassId],
  );
  const analytics = useMemo(
    () => getDatasetAnalytics({ ...data, classes: activeClass ? [activeClass] : [] }),
    [activeClass, data],
  );
  const [activeStudentId, setActiveStudentId] = useState('');
  const selectedStudent = useMemo(
    () => analytics.students.find((student) => student.id === activeStudentId) || analytics.students[0] || null,
    [activeStudentId, analytics.students],
  );
  useEffect(() => {
    if (currentTab !== '#/reports' && currentTab !== '/reports') return;

    const notifyContainer = document.getElementById('reports-notifications');
    if (!notifyContainer || !data?.weekConfig) return;

    const ranges = getWeekRanges(data.weekConfig);
    const lastWeek = ranges[ranges.length - 1];
    const isYearEnd = Date.now() > (lastWeek?.end?.getTime() || 0);

    if (isYearEnd) {
      notifyContainer.innerHTML = `
        <m3e-list variant="segmented" class="list-item-notifications" style="margin-bottom: 16px;">
          <m3e-list-item>
            <m3e-icon slot="leading" name="info"></m3e-icon>
            <span><span class="vi">Bạn đã qua <span class="weeks">${ranges.length}</span> tuần! Bây giờ là lúc tổng kết lại.</span><span
                class="en">You have passed <span class="weeks">${ranges.length}</span> weeks! Now is the time to look back.</span></span>
            <m3e-button onclick="window.dispatchEvent(new CustomEvent('open-recap-system'))" variant="filled" slot="trailing"><span class="vi">Xem</span><span class="en">Open Recap</span></m3e-button>
          </m3e-list-item>
        </m3e-list>
      `;
    } else {
      notifyContainer.innerHTML = '';
    }
  }, [data?.weekConfig]);

  const weeklyOfSelected = useMemo(
    () => (selectedStudent ? getStudentWeeklyBreakdown(selectedStudent, data.weekConfig) : []),
    [data.weekConfig, selectedStudent],
  );

  useEffect(() => {
    if (currentTab !== '#/reports' && currentTab !== '/reports') return;

    const studentsList = document.querySelector('#reports .students-list');
    if (studentsList) {
      studentsList.replaceChildren();
      if (!analytics.students.length) {
        const emptyItem = document.createElement('div');
        emptyItem.innerHTML = `
          <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; padding: 40px;">
            <img src="./empty-ui.webp" style="width: 256px;" alt="">
            <m3e-heading variant="headline" size="small"><span class="vi">Chưa có học sinh</span><span class="en">No students yet</span></m3e-heading>
          </div>
        `;
        studentsList.appendChild(emptyItem);
      } else {
        analytics.students.forEach((student) => {
          const action = document.createElement('m3e-list-action');
          action.setAttribute('data-student-id', student.id);
          const rankingVi = `Nề nếp: ${student.behaviorGrade}, Học tập: ${student.academicGrade}. Điểm thi đua tuần này: ${student.calculatedScore}`;
          const rankingEn = `Discipline: ${student.behaviorGrade}, Study: ${student.academicGrade}. This week's score: ${student.calculatedScore}`;
          action.innerHTML = `
            <m3e-icon name="person" slot="leading"></m3e-icon>
            <span>${student.name}</span>
            <span slot="supporting-text" class="general-ranking"><span class="vi">${rankingVi}</span><span class="en">${rankingEn}</span></span>
            <m3e-icon-button slot="trailing"><m3e-icon name="arrow_forward"></m3e-icon></m3e-icon-button>
          `;
          studentsList.appendChild(action);
        });
      }
    }

    document.querySelectorAll('#reports #d-total-students').forEach((node) => {
      node.textContent = String(analytics.totalStudents);
    });
    document.querySelectorAll('#reports #d-avg-score').forEach((node) => {
      node.textContent = analytics.classRank || '-';
    });
    document.querySelectorAll('#reports #d-at-risk').forEach((node) => {
      node.innerHTML = analytics.atRisk[0] 
        ? `<span class="vi">${analytics.atRisk[0].reason} (${analytics.atRisk[0].count})</span><span class="en">${analytics.atRisk[0].reason} (${analytics.atRisk[0].count})</span>` 
        : '<span class="vi">Không có</span><span class="en">None</span>';
    });
    document.querySelectorAll('#reports #d-top-perf').forEach((node) => {
      node.textContent = analytics.topPerformerThisWeek?.student?.name || '-';
    });

    // 1. Violations logic
    const dialog = document.getElementById('violations-detailed-dialog');
    const violationsList = dialog?.querySelector('m3e-list');
    const violationsEmptyState = dialog?.querySelector('.empty-state');
    const fromToHeader = dialog?.querySelector('.fromto');

    if (fromToHeader) {
      fromToHeader.textContent = analytics.currentWeek?.fromTo || '';
    }
    if (violationsList && violationsEmptyState) {
      if (!analytics.atRisk.length) {
        violationsList.style.display = 'none';
        violationsEmptyState.style.display = 'flex';
      } else {
        violationsList.style.display = 'block';
        violationsEmptyState.style.display = 'none';
        violationsList.innerHTML = analytics.atRisk
          .map(
            (risk) => `
              <m3e-list-item>
                <m3e-icon name="person" slot="leading"></m3e-icon>
                <span>${[...risk.students][0] || 'Học sinh'}</span>
                <span slot="supporting-text" class="specific-violation"><span class="vi">${risk.count} lỗi ${risk.reason}</span><span class="en">${risk.count} errors: ${risk.reason}</span></span>
              </m3e-list-item>
            `,
          )
          .join('');
      }
    }

    const classWeeklyList = document.querySelector('#reports #class-weekly-analysis');
    const classWeeklyEmpty = document.querySelector('#reports .empty-state-weeks');
    if (classWeeklyList && classWeeklyEmpty) {
      const analyticsInfo = getDatasetAnalytics({ ...data, classes: activeClass ? [activeClass] : [] });
      
      const activeWeeks = analyticsInfo.weeklyAverages.map((avg, i) => {
        return { index: i + 1, avg };
      }).filter(w => {
        return analytics.students.some(s => s.logs.length > 0); 
      });

      if (activeWeeks.length === 0) {
        classWeeklyList.style.display = 'none';
        classWeeklyEmpty.style.display = 'flex';
      } else {
        classWeeklyList.style.display = 'block';
        classWeeklyEmpty.style.display = 'none';
        classWeeklyList.innerHTML = activeWeeks.map(week => `
          <m3e-list-action data-week-index="${week.index}">
            <m3e-icon name="event" slot="leading"></m3e-icon>
            <span><span class="vi">Tuần ${week.index}</span><span class="en">Week ${week.index}</span></span>
            <span slot="trailing" style="font-size: larger;">${week.avg}</span>
          </m3e-list-action>
        `).join('');
      }
    }
  }, [analytics, activeClass, data, currentTab]);

  useEffect(() => {
    const studentsList = document.querySelector('#reports .students-list');
    if (!studentsList) return;
    const openStudent = (event) => {
      const item = event.target.closest('[data-student-id]');
      if (!item) return;
      setActiveStudentId(item.getAttribute('data-student-id') || '');
      document.querySelector('m3e-dialog#student-info')?.setAttribute('open', '');
    };
    studentsList.addEventListener('click', openStudent);
    return () => studentsList.removeEventListener('click', openStudent);
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const avg = getStudentAverageWeekScore(selectedStudent, data.weekConfig);
    document.querySelectorAll('#student-info .name').forEach((node) => {
      node.textContent = selectedStudent.name;
    });
    const rankVi = `Nề nếp: ${selectedStudent.behaviorGrade}, Học tập: ${selectedStudent.academicGrade}. Điểm thi đua tuần này: ${selectedStudent.calculatedScore}`;
    const rankEn = `Discipline: ${selectedStudent.behaviorGrade}, Study: ${selectedStudent.academicGrade}. This week's score: ${selectedStudent.calculatedScore}`;
    document.querySelectorAll('#student-info .general-ranking').forEach((node) => {
      node.innerHTML = `<span class="vi">${rankVi}</span><span class="en">${rankEn}</span>`;
    });

    const avgScore = document.querySelector('#average-disclipine .overall-score .heading');
    if (avgScore) avgScore.textContent = String(avg);

    const weekList = document.querySelector('#average-disclipine m3e-list');
    if (weekList) {
      weekList.querySelectorAll('m3e-list-action').forEach(el => el.remove());
      const emptyState = weekList.querySelector('.empty-state');
      if (emptyState) emptyState.style.display = 'none';

      weeklyOfSelected.forEach((week) => {
        const action = document.createElement('m3e-list-action');
        action.setAttribute('data-open-week', String(week.key));
        action.innerHTML = `
          <m3e-icon name="school" slot="leading"></m3e-icon>
          <span><span class="vi">Tuần ${week.index}</span><span class="en">Week ${week.index}</span></span>
          <span slot="trailing" style="font-size: larger;">${week.score}</span>
        `;
        weekList.appendChild(action);
      });
    }
  }, [data.weekConfig, selectedStudent, weeklyOfSelected]);

  useEffect(() => {
    const avgDialog = document.getElementById('average-disclipine');
    const weekDialog = document.getElementById('student-week-rating');

    const updateWeekDialog = (weekKey) => {
      if (!weekDialog || !selectedStudent) return;
      const week = weeklyOfSelected.find((entry) => entry.key === weekKey);
      if (!week) return;

      weekDialog.setAttribute('week-id', weekKey);
      const header = weekDialog.querySelector('[slot="header"]');
      if (header) {
        header.innerHTML = `<span class="vi">Đánh giá tuần <span class="week">${week.index}</span> của <span class="name">${selectedStudent.name}</span></span><span class="en">Week <span class="week">${week.index}</span> rating of <span class="name">${selectedStudent.name}</span></span>`;
      }
      const score = weekDialog.querySelector('.overall-score .heading');
      if (score) score.textContent = String(week.score);
      const fromTo = weekDialog.querySelector('.fromto');
      if (fromTo) fromTo.textContent = week.fromTo;

      const panels = weekDialog.querySelectorAll('m3e-expansion-panel');
      const positiveLogs = week.logs.filter((log) => Number(log.points || 0) > 0);
      const negativeLogs = week.logs.filter((log) => Number(log.points || 0) < 0);
      
      if (panels[0]) {
        panels[0].innerHTML = `
          <span slot="header"><span class="vi">Điểm thưởng</span><span class="en">Additions</span></span>
          <ul>
            ${
              positiveLogs.length
                ? positiveLogs.map((log) => `<li>${log.reason} + ${Math.abs(Number(log.points || 0))} <span class="vi">điểm</span><span class="en">points</span></li>`).join('')
                : '<li><span class="vi">Không có</span><span class="en">None</span></li>'
            }
          </ul>
        `;
      }
      if (panels[1]) {
        panels[1].innerHTML = `
          <span slot="header"><span class="vi">Vi phạm</span><span class="en">Violations</span></span>
          <ul>
            ${
              negativeLogs.length
                ? negativeLogs.map((log) => `<li>${log.reason} - ${Math.abs(Number(log.points || 0))} <span class="vi">điểm</span><span class="en">points</span></li>`).join('')
                : '<li><span class="vi">Không có</span><span class="en">None</span></li>'
            }
          </ul>
        `;
      }

      const editGood = weekDialog.querySelector('#good-actions');
      const editViolation = weekDialog.querySelector('#violation');
      if (editGood) editGood.value = positiveLogs.map((log) => log.reason).join('\\n');
      if (editViolation) editViolation.value = negativeLogs.map((log) => log.reason).join('\\n');
      weekDialog.setAttribute('data-week-index', String(week.index));
    };

    if (weekDialog && weekDialog.hasAttribute('open')) {
      const openWeekKey = weekDialog.getAttribute('week-id');
      if (openWeekKey) {
        updateWeekDialog(openWeekKey);
      }
    }

    if (!avgDialog) return;
    const openWeek = (event) => {
      const item = event.target.closest('[data-open-week]');
      if (!item || !selectedStudent) return;
      const weekKey = item.getAttribute('data-open-week');
      weekDialog?.setAttribute('open', '');
      updateWeekDialog(weekKey);
    };

    avgDialog.addEventListener('click', openWeek);
    return () => avgDialog.removeEventListener('click', openWeek);
  }, [selectedStudent, weeklyOfSelected]);

  useEffect(() => {
    const weekDialog = document.getElementById('student-week-rating');
    if (!weekDialog || !selectedStudent || !activeClass) return;

    const saveEditor = (event) => {
      const button = event.target.closest('m3e-button[save-target="studentWeekRating"]');
      if (!button) return;

      if (isPastFinalWeek(data?.weekConfig)) {
        const msg = document.documentElement.lang === 'en'
          ? 'Cannot edit past the final week.'
          : 'Đã qua tuần cuối cùng. Không thể sửa đổi điểm.';
        window.alert(msg);
        return;
      }

      const weekKey = weekDialog.getAttribute('week-id');
      const weekData = weeklyOfSelected.find((entry) => entry.key === weekKey);
      if (!weekData) return;

      const goodActions = (weekDialog.querySelector('#good-actions')?.value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const violations = (weekDialog.querySelector('#violation')?.value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const minTs = weekData.start.getTime();
      const maxTs = weekData.end.getTime() + 86400000 - 1;
      const remainingLogs = (selectedStudent.logs || []).filter((log) => {
        const ts = Number(log.timestamp || 0);
        return ts < minTs || ts > maxTs;
      });
      const timestamp = minTs + 1000;
      const newLogs = [
        ...goodActions.map((reason, index) => ({
          id: `${selectedStudent.id}-good-${Date.now()}-${index}`,
          category: 'Nề nếp - Kỷ luật',
          reason,
          points: 5,
          timestamp: timestamp + index,
          period: 'week',
          source: 'manual',
        })),
        ...violations.map((reason, index) => ({
          id: `${selectedStudent.id}-vio-${Date.now()}-${index}`,
          category: 'Nề nếp - Kỷ luật',
          reason,
          points: -5,
          timestamp: timestamp + 500 + index,
          period: 'week',
          source: 'manual',
        })),
      ];

      updateStudent(activeClass.id, selectedStudent.id, {
        logs: [...remainingLogs, ...newLogs],
      });
    };

    const deleteWeek = (event) => {
      const action = event.target.closest('m3e-list-action');
      if (!action) return;
      const title = action.textContent || '';
      if (!title.includes('Xóa dữ liệu')) return;
      const confirmMsgVi = 'Bạn có muốn xóa dữ liệu này không? Mọi dữ liệu cho thông tin này sẽ bị xóa vĩnh viễn và không thể khôi phục.';
      const confirmMsgEn = 'Do you want to delete this data? All information will be permanently deleted and cannot be recovered.';
      if (!window.confirm(document.documentElement.lang === 'en' ? confirmMsgEn : confirmMsgVi)) {
        return;
      }

      const weekKey = weekDialog.getAttribute('week-id');
      const weekData = weeklyOfSelected.find((entry) => entry.key === weekKey);
      if (!weekData) return;
      const minTs = weekData.start.getTime();
      const maxTs = weekData.end.getTime() + 86400000 - 1;
      const remainingLogs = (selectedStudent.logs || []).filter((log) => {
        const ts = Number(log.timestamp || 0);
        return ts < minTs || ts > maxTs;
      });
      updateStudent(activeClass.id, selectedStudent.id, { logs: remainingLogs });
      weekDialog.removeAttribute('open');
    };

    weekDialog.addEventListener('click', saveEditor);
    weekDialog.addEventListener('click', deleteWeek);
    return () => {
      weekDialog.removeEventListener('click', saveEditor);
      weekDialog.removeEventListener('click', deleteWeek);
    };
  }, [activeClass, selectedStudent, updateStudent, weeklyOfSelected]);

  return null;
}
