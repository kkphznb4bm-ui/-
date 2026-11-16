import React from 'react';
import { Composition } from 'remotion';
import { Spec, Timeline, makeChapter, setMapGoneAt } from './Engine';
import t2 from '../../public/cb/ch02/timeline.json';
import t3 from '../../public/cb/ch03/timeline.json';
import t4 from '../../public/cb/ch04/timeline.json';
import t5 from '../../public/cb/ch05/timeline.json';
import t6 from '../../public/cb/ch06/timeline.json';
import t7 from '../../public/cb/ch07/timeline.json';
import t8 from '../../public/cb/ch08/timeline.json';
import t9 from '../../public/cb/ch09/timeline.json';
import s2 from '../../cb/ch02.json';
import s3 from '../../cb/ch03.json';
import s4 from '../../cb/ch04.json';
import s5 from '../../cb/ch05.json';
import s6 from '../../cb/ch06.json';
import s7 from '../../cb/ch07.json';
import s8 from '../../cb/ch08.json';
import s9 from '../../cb/ch09.json';

const pairs: [Timeline, Spec][] = [
  [t2, s2],
  [t3, s3],
  [t4, s4],
  [t5, s5],
  [t6, s6],
  [t7, s7],
  [t8, s8],
  [t9, s9],
].map(([t, s]) => [t as unknown as Timeline, s as unknown as Spec]);

// chapter 5: the moment the map vanishes
const mg = (t5 as unknown as Timeline).beats.find((b) => b.act === 'map-gone');
if (mg) setMapGoneAt(mg.voiceAt ?? mg.start);

export const CbChapters: React.FC = () => (
  <>
    {pairs.map(([t, s]) => (
      <Composition key={t.id} id={`CB-Ch${String(t.num).padStart(2, '0')}`} component={makeChapter(t, s)} durationInFrames={t.total} fps={30} width={1920} height={1080} />
    ))}
  </>
);
