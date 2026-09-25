import { useTranslation } from 'react-i18next';
import { useViewStore, type ShadingMode, type QuickView } from '../store/useViewStore';

const SHADING_MODES: ShadingMode[] = ['solid', 'wireframe', 'solid-wireframe', 'texture'];
const QUICK_VIEWS: { view: QuickView; key: string; shortcut: string }[] = [
  { view: 'front', key: 'front', shortcut: 'Num1' },
  { view: 'side', key: 'side', shortcut: 'Num3' },
  { view: 'top', key: 'top', shortcut: 'Num7' },
  { view: 'perspective', key: 'perspective', shortcut: 'Num5' },
];

const SHADING_I18N_KEY: Record<ShadingMode, string> = {
  solid: 'viewportToolbar.shading.solid',
  wireframe: 'viewportToolbar.shading.wireframe',
  'solid-wireframe': 'viewportToolbar.shading.solidWireframe',
  texture: 'viewportToolbar.shading.texture',
};

export function ViewportToolbar() {
  const { t } = useTranslation();
  const shading = useViewStore((s) => s.shading);
  const setShading = useViewStore((s) => s.setShading);
  const quickView = useViewStore((s) => s.quickView);
  const setQuickView = useViewStore((s) => s.setQuickView);
  const snapEnabled = useViewStore((s) => s.snapEnabled);
  const toggleSnap = useViewStore((s) => s.toggleSnap);
  const checkerboard = useViewStore((s) => s.checkerboard);
  const toggleCheckerboard = useViewStore((s) => s.toggleCheckerboard);

  return (
    <div className="viewport-toolbar">
      <div className="viewport-toolbar__group">
        {SHADING_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={mode === shading ? 'active' : ''}
            onClick={() => setShading(mode)}
            title={t(SHADING_I18N_KEY[mode])}
          >
            {t(SHADING_I18N_KEY[mode])}
          </button>
        ))}
      </div>
      <div className="viewport-toolbar__group">
        {QUICK_VIEWS.map(({ view, key, shortcut }) => (
          <button
            key={view}
            type="button"
            className={view === quickView ? 'active' : ''}
            onClick={() => setQuickView(view)}
            title={shortcut}
          >
            {t(`views.${key}`)}
          </button>
        ))}
      </div>
      <div className="viewport-toolbar__group">
        <button type="button" className={snapEnabled ? 'active' : ''} onClick={toggleSnap}>
          {t('viewportToolbar.snap')}
        </button>
        <button
          type="button"
          className={checkerboard ? 'active' : ''}
          onClick={toggleCheckerboard}
        >
          {t('viewportToolbar.checkerboard')}
        </button>
      </div>
    </div>
  );
}
