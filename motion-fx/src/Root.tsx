import React from 'react';
import {Composition} from 'remotion';
import {Fx, FxProps} from './Fx';
import {Chart, ChartProps} from './Chart';

const defaults: FxProps = {duration: 6, items: []};
const chartDefaults: ChartProps = {duration: 6, spec: {anim: 'timeline'}};

export const Root: React.FC = () => (
  <>
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
    <Composition
      id="Chart"
      component={Chart}
      width={1920}
      height={1080}
      fps={24}
      durationInFrames={144}
      defaultProps={chartDefaults}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(props.duration * 24))})}
    />
  </>
);
