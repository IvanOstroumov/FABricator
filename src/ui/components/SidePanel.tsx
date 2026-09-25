import { useTranslation } from 'react-i18next';
import { HierarchyPanel } from './HierarchyPanel';
import { PropertiesPanel } from './PropertiesPanel';

export function SidePanel() {
  const { t } = useTranslation();
  return (
    <div className="side-panel">
      <section className="side-panel__section">
        <h3>{t('panels.hierarchy')}</h3>
        <HierarchyPanel />
      </section>
      <PropertiesPanel />
      <section className="side-panel__section">
        <h3>{t('panels.materials')}</h3>
        <p className="side-panel__placeholder">—</p>
      </section>
    </div>
  );
}
