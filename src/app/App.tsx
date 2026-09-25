import '../ui/i18n';
import { MenuBar } from '../ui/components/MenuBar';
import { Workspace } from '../ui/components/Workspace';
import { StatusBar } from '../ui/components/StatusBar';
import { useGlobalShortcuts } from '../ui/useGlobalShortcuts';
import './App.css';

export function App() {
  useGlobalShortcuts();
  return (
    <div className="app">
      <MenuBar />
      <Workspace />
      <StatusBar />
    </div>
  );
}
