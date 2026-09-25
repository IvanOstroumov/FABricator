import { useTranslation } from 'react-i18next';
import { HierarchyPanel } from './HierarchyPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { MaterialsPanel } from './MaterialsPanel';

export function SidePanel() {
  const { t } = useTranslation();
  return (
    <div className="side-panel">
      <section className="side-panel__section">
        <h3>{t('panels.hierarchy')}</h3>
        <HierarchyPanel />
      </section>
      <PropertiesPanel />
      <MaterialsPanel />
    </div>
  );
}
