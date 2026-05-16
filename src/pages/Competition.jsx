import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { formatDate, getDatasetAnalytics } from '../utils/PointCalculator';

export default function Competition() {
  const { data, removeAchievement, currentTab } = useAppContext();
  const analytics = useMemo(() => getDatasetAnalytics(data), [data]);

  useEffect(() => {
    const section = document.getElementById('competition');
    if (!section || (currentTab !== '#/competition' && currentTab !== '/competition')) return;

    const heading = section.querySelector('.heading');
    if (heading) heading.innerHTML = '<span class="vi">Thành tích</span><span class="en">Achievements</span>';

    const detailDialog = section.querySelector('m3e-dialog:not(#add-achievement)');
    const list = section.querySelector('.achievements');
    if (!list) return;

    const achievements = data?.achievements || [];
    if (!achievements.length) {
      return;
    }

    list.innerHTML = `
      ${achievements
        .map(
          (achievement) => `
            <m3e-list-action data-achievement-id="${achievement.id}" data-generated-achievement="true">
              <m3e-icon name="trophy" slot="leading"></m3e-icon>
              <span>${achievement.name}</span>
              <span slot="supporting-text"><span class="vi">Đã nhận vào ngày</span><span class="en">Certified date:</span> <span class="certified-date">${formatDate(achievement.certifiedDate)}</span></span>
            </m3e-list-action>
          `,
        )
        .join('')}
      <m3e-list-action id="achievement-add-trigger">
        <m3e-icon name="add" slot="leading"></m3e-icon>
        <span><span class="vi">Thêm thành tích</span><span class="en">Add achievement</span></span>
      </m3e-list-action>
    `;

    const handleOpenDetail = (event) => {
      const item = event.target.closest('[data-achievement-id]');
      if (!item || !detailDialog) return;
      const achievementId = item.getAttribute('data-achievement-id');
      const selected = achievements.find((entry) => entry.id === achievementId);
      if (!selected) return;
      detailDialog.setAttribute('open', '');
      detailDialog.setAttribute('data-achievement-id', selected.id);
      detailDialog.querySelector('.achievement-name')?.replaceChildren(document.createTextNode(selected.name));
      detailDialog.querySelector('.certified-date')?.replaceChildren(document.createTextNode(formatDate(selected.certifiedDate)));
      const title = detailDialog.querySelector('[slot="header"] .achievement-name');
      if (title) title.textContent = selected.name;
      const bodyName = detailDialog.querySelector('.overall-score span:not(.certified-date)');
      if (bodyName) bodyName.textContent = selected.name;
    };

    const handleDelete = (event) => {
      const deleteAction = event.target.closest('#delete-achievement-btn');
      if (!deleteAction) return;
      const hostDialog = deleteAction.closest('m3e-dialog');
      if (!hostDialog || hostDialog.id === 'add-achievement') return;
      const id = hostDialog.getAttribute('data-achievement-id');
      if (!id) return;
      const confirmMsgVi = 'Bạn có muốn xóa dữ liệu này không? Mọi dữ liệu cho thông tin này sẽ bị xóa vĩnh viễn và không thể khôi phục.';
      const confirmMsgEn = 'Do you want to delete this data? All information will be permanently deleted and cannot be recovered.';
      if (window.confirm(document.documentElement.lang === 'en' ? confirmMsgEn : confirmMsgVi)) {
        removeAchievement(id);
        hostDialog.removeAttribute('open');
      }
    };

    list.addEventListener('click', handleOpenDetail);
    detailDialog?.addEventListener('click', handleDelete);
    return () => {
      list.removeEventListener('click', handleOpenDetail);
      detailDialog?.removeEventListener('click', handleDelete);
    };
  }, [analytics.topPerformerThisWeek, data?.achievements, removeAchievement, currentTab]);

  return null;
}
