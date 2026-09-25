import { useTranslation } from 'react-i18next';

export function SidePanel() {
  const { t } = useTranslation();
  return (
    <div className="side-panel">
      <section className="side-panel__section">
        <h3>{t('panels.hierarchy')}</h3>
        <p className="side-panel__placeholder">—</p>
      </section>
      <section className="side-panel__section">
        <h3>{t('panels.properties')}</h3>
        <p className="side-panel__placeholder">—</p>
      </section>
      <section className="side-panel__section">
        <h3>{t('panels.materials')}</h3>
        <p className="side-panel__placeholder">—</p>
      </section>
    </div>
  );
}
