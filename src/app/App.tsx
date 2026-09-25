import '../ui/i18n';
import { MenuBar } from '../ui/components/MenuBar';
import { Workspace } from '../ui/components/Workspace';
import { StatusBar } from '../ui/components/StatusBar';
import { ExportReportDialog } from '../ui/components/ExportReportDialog';
import { useGlobalShortcuts } from '../ui/useGlobalShortcuts';
import { useExportStore } from '../ui/store/useExportStore';
import { useDocumentStore } from '../ui/store/useDocumentStore';
import { saveFbxFile } from '../io/fbx/io';
import './App.css';

export function App() {
  useGlobalShortcuts();
  const pending = useExportStore((s) => s.pending);
  const clearExport = useExportStore((s) => s.clearExport);

  const confirmExport = async () => {
    if (!pending) return;
    const { objectIds, scope } = pending;
    clearExport();
    const doc = useDocumentStore.getState().doc;
    await saveFbxFile(doc, objectIds, { scope, triangulate: false, pivotMode: 'keep' });
  };

  return (
    <div className="app">
      <MenuBar />
      <Workspace />
      <StatusBar />
      {pending && <ExportReportDialog report={pending.report} onConfirm={() => void confirmExport()} onCancel={clearExport} />}
    </div>
  );
}
