import React from 'react';
import {Composition} from 'remotion';
import {Fx, FxProps} from './Fx';

const defaults: FxProps = {duration: 6, items: []};

export const Root: React.FC = () => (
  <Composition
    id="Fx"
    component={Fx}
    width={1920}
    height={1080}
    fps={24}
    durationInFrames={144}
    defaultProps={defaults}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(props.duration * 24))})}
  />
);
