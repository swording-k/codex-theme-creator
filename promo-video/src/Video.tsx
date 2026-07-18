import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const screenshots = [
  {src: 'porsche.jpg', title: 'GT 赛车控制台', accent: '#ff6a35'},
  {src: 'cosmic.jpg', title: '一句话生成宇宙主题', accent: '#68a5ff'},
  {src: 'gym.jpg', title: '铁馆、森林、雪山', accent: '#c45a35'},
  {src: 'rainforest.jpg', title: '不是只换背景', accent: '#79b66b'},
  {src: 'alpine.jpg', title: '完整界面一起变', accent: '#78b7df'},
];

const ease = (frame: number, from: number, to: number, out0 = 0, out1 = 1) =>
  interpolate(frame, [from, to], [out0, out1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const clampText = {
  letterSpacing: 0,
  textWrap: 'balance' as const,
};

const ScreenCard: React.FC<{
  src: string;
  start: number;
  duration: number;
  scale?: number;
  x?: number;
  y?: number;
  rotate?: number;
}> = ({src, start, duration, scale = 1, x = 0, y = 0, rotate = 0}) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  const enter = spring({frame: Math.max(0, local), fps: 30, config: {damping: 18, stiffness: 90}});
  const exit = ease(local, duration - 18, duration, 1, 0);
  const drift = ease(local, 0, duration, -22, 22);

  return (
    <div
      style={{
        position: 'absolute',
        width: 1240,
        height: 792,
        left: -80 + x,
        top: 520 + y,
        opacity: exit,
        transform: `translateY(${(1 - enter) * 90 + drift}px) scale(${scale * (0.94 + enter * 0.06)}) rotate(${rotate}deg)`,
        borderRadius: 34,
        overflow: 'hidden',
        boxShadow: '0 42px 120px rgba(0,0,0,.58), 0 0 0 1px rgba(255,255,255,.16)',
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'saturate(1.07) contrast(1.04)',
        }}
      />
    </div>
  );
};

const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = '#6ea8ff'}) => (
  <div
    style={{
      display: 'inline-flex',
      padding: '10px 18px',
      border: `1px solid ${color}99`,
      borderRadius: 999,
      color,
      fontSize: 26,
      fontWeight: 800,
      background: 'rgba(8,12,22,.62)',
      backdropFilter: 'blur(18px)',
      boxShadow: `0 0 42px ${color}33`,
      ...clampText,
    }}
  >
    {children}
  </div>
);

const Headline: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 82}) => (
  <div
    style={{
      marginTop: 26,
      fontSize: size,
      lineHeight: 1.05,
      fontWeight: 900,
      color: '#f7fbff',
      textShadow: '0 8px 28px rgba(0,0,0,.45)',
      ...clampText,
    }}
  >
    {children}
  </div>
);

const Body: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      marginTop: 22,
      fontSize: 34,
      lineHeight: 1.35,
      fontWeight: 600,
      color: 'rgba(236,244,255,.82)',
      ...clampText,
    }}
  >
    {children}
  </div>
);

const Ambient: React.FC = () => {
  const frame = useCurrentFrame();
  const shimmer = ease(Math.sin(frame / 24), -1, 1, 0.3, 0.82);
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 78% 14%, rgba(106,168,255,.32), transparent 32%), radial-gradient(circle at 18% 72%, rgba(255,106,53,.2), transparent 36%), linear-gradient(180deg, #030714 0%, #09111f 58%, #050608 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: shimmer,
          background:
            'linear-gradient(115deg, transparent 0%, rgba(255,255,255,.08) 42%, transparent 52%), radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,.55) 70%)',
          transform: `translateX(${ease(frame % 180, 0, 180, -260, 260)}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(3,7,20,.96), rgba(3,7,20,.18) 44%, rgba(3,7,20,.78))',
        }}
      />
    </AbsoluteFill>
  );
};

const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const title = spring({frame, fps: 30, config: {damping: 18, stiffness: 80}});
  return (
    <AbsoluteFill>
      <ScreenCard src="porsche.jpg" start={0} duration={150} scale={1.08} x={-110} y={-44} rotate={-1.5} />
      <div style={{position: 'absolute', left: 72, right: 72, top: 128, opacity: title}}>
        <Kicker color="#ff6a35">Codex Theme Creator</Kicker>
        <Headline>让 Codex 自己给 Codex 做主题</Headline>
        <Body>不是下载别人做好的皮肤。给它一句想法，它会生成、安装、验证完整界面主题。</Body>
      </div>
    </AbsoluteFill>
  );
};

const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const typing = Math.floor(ease(frame, 18, 92, 0, 34));
  const prompt = '帮我做一套宇宙主题，深色，玻璃质感。';
  return (
    <AbsoluteFill>
      <ScreenCard src="cosmic.jpg" start={0} duration={160} scale={1.06} x={-100} y={-36} rotate={1.2} />
      <div style={{position: 'absolute', left: 72, right: 72, top: 132}}>
        <Kicker color="#68a5ff">一句话开始</Kicker>
        <Headline size={72}>把想法交给 Codex</Headline>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 190,
          padding: '32px 34px',
          borderRadius: 28,
          background: 'rgba(8,13,24,.76)',
          border: '1px solid rgba(104,165,255,.38)',
          color: '#f4f8ff',
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1.35,
          boxShadow: '0 32px 90px rgba(0,0,0,.5)',
        }}
      >
        {prompt.slice(0, typing)}
        <span style={{color: '#68a5ff'}}>▍</span>
      </div>
    </AbsoluteFill>
  );
};

const SwitchScene: React.FC = () => {
  return (
    <AbsoluteFill>
      {screenshots.slice(2).map((shot, index) => (
        <Sequence key={shot.src} from={index * 38} durationInFrames={104}>
          <ScreenCard
            src={shot.src}
            start={index * 38}
            duration={104}
            scale={0.94}
            x={index % 2 === 0 ? -130 : -30}
            y={index * 24 - 60}
            rotate={index % 2 === 0 ? -2.5 : 2}
          />
        </Sequence>
      ))}
      <div style={{position: 'absolute', left: 72, right: 72, top: 132}}>
        <Kicker color="#d8b4fe">完整主题</Kicker>
        <Headline size={74}>背景、侧栏、输入框一起变</Headline>
        <Body>赛车、宇宙、铁馆、森林、雪山。每一套都来自真实 Codex 界面。</Body>
      </div>
    </AbsoluteFill>
  );
};

const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = ease(Math.sin(frame / 12), -1, 1, 0.86, 1);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 62,
          borderRadius: 46,
          background: 'linear-gradient(145deg, rgba(13,19,34,.84), rgba(9,13,22,.96))',
          border: '1px solid rgba(255,255,255,.16)',
          boxShadow: '0 50px 160px rgba(0,0,0,.55)',
        }}
      />
      <div style={{position: 'absolute', left: 92, right: 92, top: 190}}>
        <Kicker color="#6ee7f9">Open Source</Kicker>
        <Headline size={76}>想要你的专属 Codex 主题？</Headline>
        <Body>把链接发给 Codex，让它安装 Theme Creator，然后说出你的风格。</Body>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 92,
          right: 92,
          bottom: 270,
          padding: '30px 34px',
          borderRadius: 26,
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(110,231,249,.28)',
          transform: `scale(${pulse})`,
          transformOrigin: 'left center',
        }}
      >
        <div style={{fontSize: 28, color: 'rgba(240,248,255,.62)', fontWeight: 700}}>GitHub</div>
        <div style={{fontSize: 39, color: '#f7fbff', fontWeight: 900, marginTop: 8, ...clampText}}>
          swording-k/codex-theme-creator
        </div>
      </div>
      <div style={{position: 'absolute', left: 92, right: 92, bottom: 136, fontSize: 34, color: 'rgba(240,248,255,.72)', fontWeight: 700, lineHeight: 1.35}}>
        给 Codex 一个想法，<br />它会给自己换上一整套主题。
      </div>
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const vignette = ease(frame, 0, durationInFrames, 0.85, 1);

  return (
    <AbsoluteFill style={{fontFamily: 'Inter, PingFang SC, Hiragino Sans GB, Arial, sans-serif', background: '#030714'}}>
      <Ambient />
      <Sequence from={0} durationInFrames={150}>
        <Hero />
      </Sequence>
      <Sequence from={136} durationInFrames={160}>
        <PromptScene />
      </Sequence>
      <Sequence from={282} durationInFrames={150}>
        <SwitchScene />
      </Sequence>
      <Sequence from={420} durationInFrames={120}>
        <FinalScene />
      </Sequence>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: vignette,
          boxShadow: 'inset 0 0 220px rgba(0,0,0,.68)',
        }}
      />
    </AbsoluteFill>
  );
};
