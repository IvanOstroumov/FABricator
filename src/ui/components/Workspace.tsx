import { ToolBar } from './ToolBar';
import { ViewportToolbar } from './ViewportToolbar';
import { Viewport3D } from './Viewport3D';
import { SidePanel } from './SidePanel';

export function Workspace() {
  return (
    <div className="workspace">
      <ToolBar />
      <div className="workspace__viewport-column">
        <ViewportToolbar />
        <Viewport3D />
      </div>
      <SidePanel />
    </div>
  );
}
