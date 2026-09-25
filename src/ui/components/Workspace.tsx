import { ToolBar } from './ToolBar';
import { ViewportToolbar } from './ViewportToolbar';
import { Viewport3D } from './Viewport3D';
import { UvEditorPanel } from './UvEditorPanel';
import { SidePanel } from './SidePanel';
import { useViewStore } from '../store/useViewStore';

export function Workspace() {
  const viewportTab = useViewStore((s) => s.viewportTab);
  const setViewportTab = useViewStore((s) => s.setViewportTab);

  return (
    <div className="workspace">
      <ToolBar />
      <div className="workspace__viewport-column">
        <div className="viewport-tabs">
          <button
            type="button"
            className={viewportTab === 'viewport' ? 'active' : ''}
            onClick={() => setViewportTab('viewport')}
          >
            Viewport 3D
          </button>
          <button type="button" className={viewportTab === 'uv' ? 'active' : ''} onClick={() => setViewportTab('uv')}>
            Editor UV
          </button>
        </div>
        <ViewportToolbar />
        {/* Both stay mounted so the Three.js renderer/canvas is never torn
            down on tab switches; only visibility toggles. */}
        <div style={{ display: viewportTab === 'viewport' ? 'contents' : 'none' }}>
          <Viewport3D />
        </div>
        <div style={{ display: viewportTab === 'uv' ? 'contents' : 'none' }}>
          <UvEditorPanel />
        </div>
      </div>
      <SidePanel />
    </div>
  );
}
