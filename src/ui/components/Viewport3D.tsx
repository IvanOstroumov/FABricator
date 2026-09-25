import { useEffect, useRef } from 'react';
import { Renderer } from '../../render/Renderer';
import { useViewStore, type QuickView } from '../store/useViewStore';

const NUMPAD_VIEWS: Record<string, QuickView> = {
  Numpad1: 'front',
  Numpad3: 'side',
  Numpad7: 'top',
  Numpad5: 'perspective',
};

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const shading = useViewStore((s) => s.shading);
  const setQuickView = useViewStore((s) => s.setQuickView);
  const setFps = useViewStore((s) => s.setFps);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer(container);
    rendererRef.current = renderer;
    renderer.onFrame(setFps);

    const handleKeyDown = (e: KeyboardEvent) => {
      const view = NUMPAD_VIEWS[e.code];
      if (view) {
        e.preventDefault();
        setQuickView(view);
      } else if (e.code === 'KeyF') {
        renderer.cameraController.frameAll(2);
        renderer.requestRender();
      }
    };
    container.tabIndex = 0;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rendererRef.current?.setShading(shading);
  }, [shading]);

  const quickView = useViewStore((s) => s.quickView);
  useEffect(() => {
    rendererRef.current?.setQuickView(quickView);
  }, [quickView]);

  return <div ref={containerRef} className="viewport3d" />;
}
