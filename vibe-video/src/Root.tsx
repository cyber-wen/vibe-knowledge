import React, { useEffect, useState } from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { SmokeTest } from './SmokeTest';
import { WanBu } from './wanbu/WanBu';

// —— 加载思源宋体（Bold + Regular），供国风黑金视觉使用 ——
function useLoadFonts() {
  const [handle] = useState(() => delayRender('loading SourceHanSerifCN fonts'));
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const FFC = (globalThis as any).FontFace as typeof FontFace;
        for (const [name, file] of [
          ['SourceHanSerifCN', 'wenku/SourceHanSerifCN-Bold.otf'],
          ['SourceHanSerifCNR', 'wenku/SourceHanSerifCN-Regular.otf'],
        ]) {
          const ff = new FFC(name, `url(${staticFile(file)})`);
          await ff.load();
          (document as any).fonts.add(ff);
        }
      } catch (e) {
        console.warn('字体加载失败，回退到系统宋体', e);
      }
      if (!cancelled) continueRender(handle);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [handle]);
}

export const RemotionRoot: React.FC = () => {
  useLoadFonts();
  return (
    <>
      <Composition
        id="WanBu"
        component={WanBu}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SmokeTest"
        component={SmokeTest}
        durationInFrames={60}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
