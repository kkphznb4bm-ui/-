import React from 'react';
import { Composition } from 'remotion';
import { Rainbow, TOTAL_FRAMES } from './Rainbow';
import { Island, ISLAND_FRAMES } from './Island';
import { LifeOfAStar, STAR_FRAMES } from './Star';
import { Ch01, CH01_FRAMES } from './cb/Ch01';

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
    <Composition
      id="LifeOfAStar"
      component={LifeOfAStar}
      durationInFrames={STAR_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="CB-Ch01" component={Ch01} durationInFrames={CH01_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
