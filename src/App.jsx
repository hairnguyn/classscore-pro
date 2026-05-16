import { createPortal } from 'react-dom';
import { bootTrace } from './rendererBootTrace.js';
import Dashboard from './pages/Dashboard';
import ClassManagement from './pages/ClassManagement';
import Grades from './pages/Grades';
import Competition from './pages/Competition';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SubjectScores from './pages/SubjectScores';

import GlobalSearch from './components/GlobalSearch';
import CreateClassDialog from './components/CreateClassDialog';
import DataController from './components/DataController';
import RecapSystem from './components/RecapSystem';
import TutorialController from './components/TutorialController';
import { useAppContext } from './store/AppContext';
import { useEffect } from 'react';

function App() {
  const { data } = useAppContext();
  const getEl = (id) => document.getElementById(id);

  useEffect(() => {
    bootTrace('App mounted (first paint phase)');
    ['dashboard', 'classes', 'grades', 'competition', 'reports', 'settings'].forEach((id) => {
      bootTrace(`portal mount target #${id}`, { found: !!getEl(id) });
    });
  }, []);

  useEffect(() => {
    const lang = (data?.language?.includes('English') || data?.language?.includes('Tiếng Anh')) ? 'en' : 'vi';
    document.documentElement.setAttribute('lang', lang);
  }, [data?.language]);

  return (
    <>
      <GlobalSearch />
      <CreateClassDialog />
      <DataController />
      {getEl('dashboard') && createPortal(<Dashboard />, getEl('dashboard'))}
      {getEl('classes') && createPortal(<ClassManagement />, getEl('classes'))}
      {getEl('grades') && createPortal(<Grades />, getEl('grades'))}
      {getEl('competition') && createPortal(<Competition />, getEl('competition'))}
      {getEl('reports') && createPortal(<Reports />, getEl('reports'))}
      {getEl('settings') && createPortal(<Settings />, getEl('settings'))}
      <SubjectScores />
      <RecapSystem />
      {/* <TutorialController /> */}
    </>
  );
}

export default App;
