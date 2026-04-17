import { createPortal } from 'react-dom';
import Dashboard from './pages/Dashboard';
import ClassManagement from './pages/ClassManagement';
import Grades from './pages/Grades';
import Competition from './pages/Competition';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import GlobalSearch from './components/GlobalSearch';
import CreateClassDialog from './components/CreateClassDialog';
import DataController from './components/DataController';

function App() {
  const getEl = (id) => document.getElementById(id);
  
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
    </>
  );
}

export default App;
