import React from 'react';
import { Composition } from 'remotion';
import { Rainbow, TOTAL_FRAMES } from './Rainbow';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Rainbow"
    component={Rainbow}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
