import { useTranslation } from 'react-i18next';
import { useToolStore, type ToolId } from '../store/useToolStore';

const TOOLS: { id: ToolId; key: string; shortcut: string; icon: string }[] = [
  { id: 'select', key: 'select', shortcut: 'Q', icon: '⬚' },
  { id: 'move', key: 'move', shortcut: 'W', icon: '✥' },
  { id: 'rotate', key: 'rotate', shortcut: 'E', icon: '⟳' },
  { id: 'scale', key: 'scale', shortcut: 'R', icon: '⤢' },
];

export function ToolBar() {
  const { t } = useTranslation();
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`toolbar__button ${tool.id === activeTool ? 'active' : ''}`}
          title={`${t(`toolbar.${tool.key}`)} (${tool.shortcut})`}
          onClick={() => setActiveTool(tool.id)}
        >
          <span aria-hidden="true">{tool.icon}</span>
        </button>
      ))}
    </div>
  );
}
