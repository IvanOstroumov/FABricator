import { useTranslation } from 'react-i18next';

const MENUS = ['file', 'edit', 'add', 'select', 'view', 'help'] as const;

export function MenuBar() {
  const { t } = useTranslation();
  return (
    <div className="menu-bar">
      {MENUS.map((menu) => (
        <button key={menu} type="button" className="menu-bar__item">
          {t(`menu.${menu}`)}
        </button>
      ))}
    </div>
  );
}
