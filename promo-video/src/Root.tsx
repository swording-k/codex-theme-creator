import React from 'react';
import {Composition} from 'remotion';
import {PromoVideo} from './Video';

export const Root: React.FC = () => {
  return (
    <Composition
      id="CodexThemeCreator"
      component={PromoVideo}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
