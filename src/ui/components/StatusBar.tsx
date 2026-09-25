import { useTranslation } from 'react-i18next';
import { useViewStore } from '../store/useViewStore';

export function StatusBar() {
  const { t } = useTranslation();
  const fps = useViewStore((s) => s.fps);

  return (
    <div className="status-bar">
      <span className="status-bar__hint">{t('status.hint')}</span>
      <span className="status-bar__spacer" />
      <span>
        {t('status.triangles')}: 12
      </span>
      <span>{t('status.selection')}: 0</span>
      <span>FPS: {fps}</span>
    </div>
  );
}
