import React, { useEffect, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import Spotlight from './Spotlight';

const TutorialController = () => {
  const { 
    tutorialStep, 
    setTutorialStep, 
    isTutorialActive, 
    setIsTutorialActive,
    completeTutorial,
    data,
    allData
  } = useAppContext();

  const handleNext = useCallback(() => {
    setTutorialStep(prev => prev + 1);
  }, [setTutorialStep]);

  const handleClose = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  // Hold Esc to exit tutorial
  useEffect(() => {
    if (!isTutorialActive) return;

    let escTimer = null;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !escTimer) {
        escTimer = setTimeout(() => {
          handleClose();
          const snackbar = document.getElementById('app-snackbar');
          if (snackbar) {
             snackbar.innerHTML = '<span class="vi">Đã thoát hướng dẫn.</span><span class="en">Tutorial exited.</span>';
             if (typeof snackbar.show === 'function') snackbar.show();
          }
        }, 1000); // Hold for 1 second
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Escape') {
        if (escTimer) clearTimeout(escTimer);
        escTimer = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (escTimer) clearTimeout(escTimer);
    };
  }, [isTutorialActive, handleClose]);

  // Logic to advance steps based on DOM state or data changes
  useEffect(() => {
    if (!isTutorialActive) return;

    const interval = setInterval(() => {
      if (tutorialStep === 2) {
        const dlg = document.getElementById('data-manager');
        if (dlg && dlg.hasAttribute('open')) setTutorialStep(3);
      }
      
      if (tutorialStep === 3) {
        // If the popover for adding data is open
        const popover = document.querySelector('forge-popover[anchor="tutorial-data-manager-add"]');
        if (popover && popover.hasAttribute('open')) setTutorialStep(4);
      }
 
      if (tutorialStep === 5) {
        const dlg = document.getElementById('create-class-dialog');
        if (dlg && dlg.hasAttribute('open')) setTutorialStep(6);
      }
 
      if (tutorialStep === 6) {
        if (window.location.hash === '#/settings' || window.location.hash.startsWith('#/data')) setTutorialStep(7);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isTutorialActive, tutorialStep, setTutorialStep]);

  // Force tutorial-root to be the very last element in body to avoid portal issues
  useEffect(() => {
    if (isTutorialActive) {
      const root = document.getElementById('tutorial-root');
      if (root && root.parentElement === document.body && document.body.lastElementChild !== root) {
        document.body.appendChild(root);
      }
      
      // Inject nuclear style for z-index reliability
      const styleId = 'tutorial-nuclear-overlay';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          #tutorial-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 1000000000 !important;
            pointer-events: none !important;
            display: block !important;
          }
          /* Allow pointer-events only for interactive tutorial elements */
          #tutorial-root .tutorial-tooltip, 
          #tutorial-root .tutorial-welcome-overlay {
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [isTutorialActive, tutorialStep]);

  // Advance step 4 when a new dataset is created
  useEffect(() => {
    if (isTutorialActive && tutorialStep === 4 && allData.length > 1) {
       setTutorialStep(5);
    }
  }, [allData.length, isTutorialActive, tutorialStep, setTutorialStep]);

  if (!isTutorialActive) return null;

  const getSpotlightProps = (step) => {
    const common = {
      onNext: handleNext,
      onSkip: handleNext,
      onClose: handleClose,
      showSkip: true,
      showClose: false
    };

    switch (step) {
      case 1:
        return {
          ...common,
          messageVi: "Chào mừng đến với ClassScore Pro! Hãy xem hướng dẫn ngay bây giờ để hiểu và bắt đầu sử dụng.",
          messageEn: "Alright, class! Here's the basics! Watch the app's tutorial now or start using it right now.",
          showSkip: false,
          showClose: true
        };
      case 2:
        return {
          ...common,
          targetId: "tutorial-welcome-new-data",
          messageVi: "Đầu tiên, hãy bấm vào đây để tạo bộ lưu trữ dữ liệu của bạn.",
          messageEn: "First, click here to create your new savedata.",
          showNext: false
        };
      case 3:
        return {
          ...common,
          targetId: "tutorial-data-manager-add",
          messageVi: "Ổn rồi ạ! Bây giờ hãy chọn 'Thêm dữ liệu mới'.",
          messageEn: "Great! Now select 'Add new savedata'.",
          showNext: false
        };
      case 4:
        return {
          ...common,
          targetId: "tutorial-data-manager-save",
          messageVi: "Nhập tên cho bộ dữ liệu (ví dụ: Năm học 2024) và nhấn Lưu. Hoặc click Bỏ qua nếu có sẵn dữ liệu.",
          messageEn: "Enter a name for your savedata and click Save. Or click Skip if data exists.",
          showNext: false
        };
      case 5:
        return {
          ...common,
          targetId: "tutorial-appbar-create-class",
          messageVi: "Bây giờ hãy tạo lớp học đầu tiên của bạn tại đây.",
          messageEn: "Now, create your first class here.",
          showNext: false
        };
      case 6:
        return {
          ...common,
          targetId: "tutorial-nav-settings",
          messageVi: "Sau khi có lớp, hãy vào mục 'Dữ liệu' để bắt đầu nhập danh sách học sinh.",
          messageEn: "Once you have a class, go to 'Data' to import your student list.",
          showNext: false
        };
      case 7:
        return {
          ...common,
          targetId: "tutorial-import-upload-zone",
          messageVi: "Tại đây bạn có thể tải lên tệp Excel danh sách lớp. Ừm, bạn đã nắm được cơ bản của ClassScore Pro rồi đó!",
          messageEn: "Here you can upload your Excel class list. Well, looks like you've learned the basics.",
          onNext: handleClose,
          onSkip: handleClose,
          isLast: true,
          showSkip: false
        };
      default:
        return null;
    }
  };

  const props = getSpotlightProps(tutorialStep);
  if (!props) return null;

  return <Spotlight {...props} />;
};

export default TutorialController;
