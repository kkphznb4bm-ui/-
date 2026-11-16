import React from 'react';
import { Composition } from 'remotion';
import { Rainbow, TOTAL_FRAMES } from './Rainbow';
import { Island, ISLAND_FRAMES } from './Island';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Rainbow"
      component={Rainbow}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="Island"
      component={Island}
      durationInFrames={ISLAND_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
