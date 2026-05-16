import React, { useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../store/AppContext';
import { getDatasetAnalytics, getWeekRanges, getLogsForWeek } from '../utils/PointCalculator';

export default function RecapSystem() {
  const { data } = useAppContext();

  useEffect(() => {
    const recapSystem = document.getElementById('recap-system');
    const recapSlides = document.getElementById('recap-slides');
    const progressBars = document.getElementById('recap-progress-bars');
    const closeBtn = document.getElementById('close-recap-btn');
    const prevBtn = document.getElementById('prev-recap');
    const nextBtn = document.getElementById('next-recap');
    const shareBtn = document.getElementById('share-recap');
    const captureArea = document.getElementById('recap-capture-area');
    const snackbar = document.getElementById('app-snackbar');

    if (!recapSystem) return;

    let currentSlide = 0;
    let slideCount = 0;

    const showSlide = (index) => {
      currentSlide = index;
      if (recapSlides) recapSlides.style.transform = `translateX(-${index * 400}px)`;
      const bars = progressBars?.querySelectorAll('div');
      bars?.forEach((bar, i) => {
        bar.style.background = i <= index ? 'white' : 'rgba(255,255,255,0.3)';
      });
    };

    const handler = () => {
      const classId = data?.selectedClassId;
      const cls = data?.classes?.find(c => c.id === classId) || data?.classes?.[0];
      if (!cls) return;

      const classAnalytics = getDatasetAnalytics({ ...data, classes: [cls] });
      
      const ranges = getWeekRanges(data.weekConfig);
      const weekCount = ranges.length;

      // P1: Student Counts (Original vs New)
      // New student = createdAt is at least 1 day after class createdAt
      const newStudentsCount = classAnalytics.students.filter(s => s.createdAt > cls.createdAt + 24 * 60 * 60 * 1000).length;
      const initialStudentsCount = classAnalytics.totalStudents - newStudentsCount;

      // P2: Achievements
      const achievements = data.achievements || [];
      const achievementSection = achievements.length ? `
        <div class="recap-stat-card" style="margin-top: 30px; background: rgba(255, 238, 186, 0.8);">
          Lớp ${cls.name} đạt thêm các thành tích mới:<br>
          ${achievements.map(a => a.name).join(', ')}
        </div>
      ` : '';

      // P3: Dynamic Rankings
      const sRankings = data.studyRankings || [];
      const rank1 = sRankings[0] || { name: 'Giỏi' };
      const rank2 = sRankings[1] || { name: 'Xuất sắc' };
      
      const rank1Count = classAnalytics.students.filter(s => s.academicGrade === rank1.name).length;
      const rank2Count = classAnalytics.students.filter(s => s.academicGrade === rank2.name).length;

      const totalStudents = classAnalytics.totalStudents || 1;
      const rank1Percent = Math.round((rank1Count / totalStudents) * 100);
      const rank2Percent = Math.round((rank2Count / totalStudents) * 100);

      // P4: Streak Dates (Refined logic: score >= 150 AND no negative logs)
      let maxStreak = 0;
      let streakStartWeek = 1;
      let streakEndWeek = 1;
      let currentStreakStart = 1;
      let tempStreak = 0;
      
      classAnalytics.weeklyAverages.forEach((avg, idx) => {
        const week = ranges[idx];
        const hasMistakes = classAnalytics.students.some(s => {
          const logs = getLogsForWeek(s, week);
          return logs.some(l => l.points < 0);
        });

        if (avg >= 150 && !hasMistakes) {
          if (tempStreak === 0) currentStreakStart = idx + 1;
          tempStreak++;
          if (tempStreak >= maxStreak) {
            maxStreak = tempStreak;
            streakStartWeek = currentStreakStart;
            streakEndWeek = idx + 1;
          }
        } else {
          tempStreak = 0;
        }
      });

      const getWeekDate = (index) => {
        const week = ranges[index - 1];
        if (!week) return '??/??/????';
        return week.start.toLocaleDateString('vi-VN');
      };

      const isGoodPerformance = ['Xuất sắc', 'Tốt'].includes(classAnalytics.classRank);
      
      const slides = [
        // Slide 1: Intro (recap_1.png)
        `<div class="recap-slide recap-slide-1" style="background-image: url('./recap_1.png');">
          <div class="recap-content">
            <h1 class="recap-heading">Cùng nhau nhìn lại chặng đường đã qua</h1>
            <p class="recap-subtext">${weekCount} tuần trước, mọi thứ bắt đầu như một năm học quen thuộc. Hành trình mới bắt đầu và chúng ta đã trải qua một hành trình đầy bước ngoặt.</p>
            <div class="recap-tag">#${cls.name}</div>
          </div>
        </div>`,
        
        // Slide 2: General Stats (recap_2.png)
        `<div class="recap-slide recap-slide-2" style="background-image: url('./recap_2.png');">
          <div class="recap-content">
            <p class="recap-subtext" style="font-size: 18px; line-height: 1.4; margin-bottom: 20px; opacity: 1;">Từ những tuần đầu tiên của năm học đến những giây phút tổng kết này, lớp ${cls.name} dường như đã thay đổi rất nhiều, theo một cách thật đáng nhớ.</p>
            <h2 class="recap-heading-small">Trong năm học vừa qua</h2>
            <div style="font-size: 20px; ">
              Lớp ${cls.name} có <span class="recap-stat-highlight">${initialStudentsCount}</span> học sinh<br>
              trong đó có thêm <span class="recap-stat-highlight">${newStudentsCount}</span> học sinh mới
            </div>
            ${achievementSection}
          </div>
        </div>`,
        
        // Slide 3: Rankings & Top Performers (recap_3.png)
        `<div class="recap-slide recap-slide-3" style="background-image: url('./recap_3.png');">
          <div class="recap-content">
            <h2 class="recap-subtext" style="font-size: 20px; font-weight: normal; margin-bottom: 30px; opacity: 1;">${cls.name} không chỉ là cái tên mà còn là hội tụ những gương mặt tiêu biểu.</h2>
            <div style="font-size: 16px; ">
              Trong năm học vừa qua,<br>
              Cả lớp có <span class="recap-stat-highlight">${classAnalytics.totalStudents}/${classAnalytics.totalStudents}</span> học sinh đạt thi đua tốt,<br>
              <span class="recap-stat-highlight">${rank1Count}</span> học sinh ${rank1.name} (chiếm ${rank1Percent}% cả lớp),<br>
              <span class="recap-stat-highlight">${rank2Count}</span> học sinh ${rank2.name} (chiếm ${rank2Percent}% cả lớp).
            </div>
            <p style="margin-top: 20px; font-size: 16px;">Từ đó ta siêu dễ dàng suy luận lớp ${cls.name} được xếp hạng <strong style="font-size: 22px;">${classAnalytics.classRank}</strong> về thi đua và học tập.</p>
            
            <div class="recap-stat-card" style="padding: 15px;">
              <div class="recap-list-title">Học sinh tiêu biểu</div>
              <ul class="recap-list">
                ${classAnalytics.students.slice(0, 5).map(s => `<li>${s.name}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>`
      ];

      // Slide 4: Streak (recap_4.png) - Conditional
      if (maxStreak > 0) {
        slides.push(`<div class="recap-slide recap-slide-4" style="background-image: url('./recap_4.png'); text-align: center;">
          <div class="recap-content">
            <h1 class="recap-streak-title">ĐẶC BIỆT</h1>
            <p class="recap-conclusion" style="font-size: 16px; ">Với sự nỗ lực và cố gắng không ngừng của lớp ${cls.name}, ${cls.name} đã giữ vững được ngọn lửa chuỗi tuần học tốt nhất liên tiếp trong</p>
            
            <div class="recap-streak-container">
              <div class="recap-streak-value">${maxStreak}</div>
            </div>
            
            <div style="font-size: 24px; font-weight: bold;">tuần</div>
            <div class="recap-streak-date">Từ tuần ${streakStartWeek} (${getWeekDate(streakStartWeek)})<br>đến tuần ${streakEndWeek} (${getWeekDate(streakEndWeek)})</div>
          </div>
        </div>`);
      }

      // Slide 5: Final Quote & Conclusion (recap_5.png)
      slides.push(`<div class="recap-slide recap-slide-5" style="background-image: url('./recap_5.png');">
        <div class="recap-content">
          <div class="recap-stat-card" style="margin-top: auto; padding: 30px;">
            <p class="recap-quote">"Hãy làm việc chăm chỉ trong im lặng <br> để thành công sẽ là tiếng nói của mình"</p>
            
            <p class="recap-conclusion">
              ${isGoodPerformance 
                ? `Một năm học như vậy đó nhưng cũng thật là vui, thật nhiều cảm xúc, thật nhiều thành tựu, thật nhiều kỷ niệm và thật nhiều tình cảm.`
                : `Mặc dù kết quả không nhưng mong đợi nhưng chúng ta vẫn luôn có hy vọng mà, đúng không? Hãy thật cố gắng hơn nữa trong năm học sắp tới ✌️`}
            </p>
            
            <p class="recap-thanks">Cảm ơn bạn đã gắn bó với ClassScore Pro suốt thời gian qua!</p>
          </div>
        </div>
      </div>`);

      slideCount = slides.length;
      if (recapSlides) {
        recapSlides.innerHTML = slides.join('');
        recapSlides.style.width = `${slideCount * 400}px`;
      }
      
      if (progressBars) {
        progressBars.innerHTML = slides.map(() => '<div style="flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3); transition: background 0.3s;"></div>').join('');
      }
      
      currentSlide = 0;
      showSlide(0);
      recapSystem.removeAttribute('closing');
      recapSystem.setAttribute('open', '');
      recapSystem.style.display = 'flex';
    };

    window.addEventListener('open-recap-system', handler);

    const closeHandler = () => {
      recapSystem.removeAttribute('open');
      recapSystem.setAttribute('closing', '');
      
      setTimeout(() => {
        if (recapSystem.hasAttribute('closing')) {
          recapSystem.style.display = 'none';
          recapSystem.removeAttribute('closing');
        }
      }, 750);
    };
    closeBtn?.addEventListener('click', closeHandler);

    const prevHandler = () => {
      if (currentSlide > 0) showSlide(currentSlide - 1);
    };
    prevBtn?.addEventListener('click', prevHandler);

    const nextHandler = () => {
      if (currentSlide < slideCount - 1) showSlide(currentSlide + 1);
    };
    nextBtn?.addEventListener('click', nextHandler);

    const keydownHandler = (e) => {
      if (!recapSystem.hasAttribute('open')) return;
      
      if (e.key === 'ArrowRight') {
        nextHandler();
      } else if (e.key === 'ArrowLeft') {
        prevHandler();
      } else if (e.key === 'Escape') {
        closeHandler();
      }
    };
    window.addEventListener('keydown', keydownHandler);

    // Swipe/Drag Navigation
    let isDragging = false;
    let startX = 0;
    const dragThreshold = 50;

    const handleDragStart = (e) => {
      isDragging = true;
      startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      if (recapSlides) recapSlides.style.transition = 'none';
    };

    const handleDragMove = (e) => {
      if (!isDragging || !recapSlides) return;
      const currentX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const diffX = currentX - startX;
      
      // Move slides relative to cursor with resistance for out-of-bounds (using pixels for consistency)
      let finalDiffX = diffX;
      if ((currentSlide === 0 && diffX > 0) || (currentSlide === slideCount - 1 && diffX < 0)) {
        finalDiffX = diffX * 0.3;
      }
      
      recapSlides.style.transform = `translateX(calc(-${currentSlide * 400}px + ${finalDiffX}px))`;
    };

    const handleDragEnd = (e) => {
      if (!isDragging || !recapSlides) return;
      isDragging = false;
      
      // Re-enable transition for snapping
      recapSlides.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      
      const endX = e.type.startsWith('touch') ? e.changedTouches[0].clientX : e.clientX;
      const diffX = endX - startX;

      if (Math.abs(diffX) > dragThreshold) {
        if (diffX > 0) {
          prevHandler();
        } else {
          nextHandler();
        }
      }
      // Always snap to the valid slide state
      showSlide(currentSlide);
    };

    recapSlides?.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);

    recapSlides?.addEventListener('touchstart', handleDragStart, { passive: true });
    recapSlides?.addEventListener('touchmove', handleDragMove, { passive: true });
    recapSlides?.addEventListener('touchend', handleDragEnd, { passive: true });

    const shareHandler = async () => {
      if (!captureArea || !recapSlides) return;
      
      const slidesArr = Array.from(recapSlides.children);
      const activeSlide = slidesArr[currentSlide];
      if (!activeSlide) return;

      // Hide overlays
      if (progressBars) progressBars.style.visibility = 'hidden';
      if (closeBtn) closeBtn.style.visibility = 'hidden';
      if (prevBtn) prevBtn.style.visibility = 'hidden';
      if (nextBtn) nextBtn.style.visibility = 'hidden';
      const controls = document.getElementById('recap-controls');
      if (controls) controls.style.visibility = 'hidden';

      // Ensure fonts are loaded
      await document.fonts.ready;

      // To prevent bleeding and alignment issues:
      const originalTransform = recapSlides.style.transform;
      slidesArr.forEach((s, idx) => {
        if (idx !== currentSlide) s.style.display = 'none';
      });
      recapSlides.style.transform = 'none';

      try {
        const canvas = await html2canvas(activeSlide, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#000',
          logging: false,
          width: 400,
          height: 750,
          onclone: (clonedDoc) => {
            // Force perfect alignment in cloned document
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * { -webkit-font-smoothing: antialiased; transform: none !important; }
              #recap-container, #recap-slides, .recap-slide, .recap-content { transform: none !important; }
              .recap-heading { font-family: 'Google Sans Flex', sans-serif !important; letter-spacing: -0.5px; }
              .recap-subtext { font-family: 'Google Sans Text', sans-serif !important; }
            `;
            clonedDoc.head.appendChild(style);
          }
        });

        // Restore
        slidesArr.forEach(s => s.style.display = 'flex');
        recapSlides.style.transform = originalTransform;
        
        if (progressBars) progressBars.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';
        if (prevBtn) prevBtn.style.visibility = 'visible';
        if (nextBtn) nextBtn.style.visibility = 'visible';
        if (controls) controls.style.visibility = 'visible';

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const success = await window.api.exportReport(binaryData, `Recap_${Date.now()}.png`);

        if (success) {
          if (snackbar) {
            snackbar.innerHTML = '<span class="vi">Đã lưu ảnh chất lượng cao thành công!</span><span class="en">High-quality screenshot saved successfully!</span>';
            snackbar.show();
          }
        }
      } catch (err) {
        console.error('Failed to capture Recap:', err);
        slidesArr.forEach(s => s.style.display = 'flex');
        recapSlides.style.transform = originalTransform;
        if (progressBars) progressBars.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';
        if (prevBtn) prevBtn.style.visibility = 'visible';
        if (nextBtn) nextBtn.style.visibility = 'visible';
        if (controls) controls.style.visibility = 'visible';
      }
    };
    shareBtn?.addEventListener('click', shareHandler);

    return () => {
      window.removeEventListener('open-recap-system', handler);
      closeBtn?.removeEventListener('click', closeHandler);
      prevBtn?.removeEventListener('click', prevHandler);
      nextBtn?.removeEventListener('click', nextHandler);
      shareBtn?.removeEventListener('click', shareHandler);
      window.removeEventListener('keydown', keydownHandler);

      recapSlides?.removeEventListener('mousedown', handleDragStart);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      recapSlides?.removeEventListener('touchstart', handleDragStart);
      recapSlides?.removeEventListener('touchmove', handleDragMove);
      recapSlides?.removeEventListener('touchend', handleDragEnd);
    };
  }, [data]);

  return null;
}
