import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ============ 帧规划（30fps，共 1200 帧 = 40s）============
// 所有切换点吸附到配乐实测重拍帧（BPM 112.35，重拍鼓点）：
// 98 / 256 / 385 / 511 / 559 / 606 / 717 / 860 / 1019 / 1115
const P = {
  open: 0, // 0-98    开场标题
  rumor: 98, // 98-256  设问
  science: 256, // 256-385 铺垫
  prep: 385, // 385-511 蓄力
  drop: 511, // 511     爆点：走！
  warm: 559, // 559-606 机制一：身体先静
  shield: 606, // 606-717 机制二：念头有序
  care: 717, // 717-860 三条提醒
  culprit: 860, // 860-1019 四个念头
  verdict: 1019, // 1019-1115 总结
  ask: 1115, // 1115-1200 互动提问
  end: 1200,
};

const W = 1920;
const H = 1080;

// —— 国风黑金：暗调暖黑 + 鎏金 + 米白 + 朱砂 ——
const GOLD = '#c8a06a';
const GOLD_BRIGHT = '#e0bd86';
const GOLD_DIM = '#7a623d';
const INK = '#e8dcc0';
const MUTED = '#a2907a';
const CINNABAR = '#a63d2f';
const BG = '#0b0906';
const CARD_BG = 'rgba(24,19,12,0.86)';
const LINE = 'rgba(200,160,106,0.32)';

const CN = '"SourceHanSerifCN", "SourceHanSerifCNR", "SimSun", "NSimSun", serif';
const NUM = '"Bahnschrift", "Segoe UI", sans-serif';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ============ 小工具 ============
const fadeInOut = (f: number, a: number, b: number, c?: number, d?: number) => {
  const outStart = c ?? b - 14;
  const outEnd = d ?? b;
  return interpolate(
    f,
    [a, Math.min(a + 14, b), outStart, outEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
};

// —— 古画颗粒肌理（哑光纸墨感） ——
const PaperNoise = () => (
  <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.055, mixBlendMode: 'screen' }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.62  0 0 0 0 0.41  0 0 0 0.35 0" />
    </filter>
    <rect width={W} height={H} filter="url(#grain)" />
  </svg>
);

// —— 远山墨影（两层，底部） ——
const Mountains = () => (
  <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
    <path
      d="M0 1080 L0 880 Q220 760 430 850 Q560 890 700 800 Q860 700 1010 790 Q1180 890 1320 820 Q1480 760 1620 830 Q1760 890 1920 840 L1920 1080 Z"
      fill="#141008"
      opacity="0.55"
    />
    <path
      d="M0 1080 L0 930 Q180 860 340 920 Q520 990 700 900 Q880 810 1060 900 Q1220 970 1400 900 Q1600 830 1920 910 L1920 1080 Z"
      fill="#1c150b"
      opacity="0.8"
    />
  </svg>
);

// —— 暖色暗角 + 顶部金色微光 ——
const Vignette = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(ellipse at 50% 40%, rgba(200,160,106,0.09) 0%, rgba(11,9,6,0) 46%, rgba(0,0,0,0.62) 100%)',
    }}
  />
);

// —— 画轴金框（四角 L 形 + 一圈细线） ——
const GoldFrame = () => (
  <>
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${W} ${H}`}>
      <rect x="20" y="20" width={W - 40} height={H - 40} fill="none" stroke={LINE} strokeWidth="1" />
      {[
        [24, 24],
        [W - 24, 24],
        [24, H - 24],
        [W - 24, H - 24],
      ].map(([x, y], i) => (
        <g key={i} opacity="0.85">
          <path d={`M${x} ${y - 26} L${x} ${y} L${x + 26} ${y}`} fill="none" stroke={GOLD_DIM} strokeWidth="2.5" />
          <circle cx={x} cy={y} r="2.4" fill={GOLD} />
        </g>
      ))}
    </svg>
  </>
);

// —— 朱砂印章（可换字） ——
const Seal = ({ ch, size = 52, x = 0, y = 0 }: { ch: string; size?: number; x?: number; y?: number }) => (
  <svg
    width={size}
    height={size}
    style={{ position: 'absolute', left: x, top: y }}
    viewBox="0 0 60 60"
  >
    <rect x="3" y="3" width="54" height="54" rx="7" fill={CINNABAR} />
    <rect x="6" y="6" width="48" height="48" rx="5" fill="none" stroke="#e8dcc0" strokeWidth="1.6" opacity="0.7" />
    <text
      x="30"
      y="40"
      textAnchor="middle"
      fontSize="30"
      fill="#f0e6d2"
      fontFamily={CN}
      fontWeight="700"
    >
      {ch}
    </text>
  </svg>
);

// —— 山径折线（铺垫段：蜿蜒向上的路 + 起点光点） ——
const PathLine = ({ frame }: { frame: number }) => {
  const draw = interpolate(frame, [P.science + 8, P.science + 90], [0, 1], clamp);
  const pts = [
    [300, 620],
    [430, 560],
    [520, 610],
    [660, 540],
    [800, 580],
    [940, 500],
    [1090, 545],
    [1260, 460],
    [1420, 500],
    [1560, 430],
  ];
  const d = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${W} ${H}`}>
      <path d={d} fill="none" stroke={LINE} strokeWidth="4" strokeDasharray="10 12" opacity="0.9" />
      <path d={d} fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 12" opacity={0.9} pathLength={100} strokeDashoffset={100 - draw * 100} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} fill={GOLD} opacity={draw >= (i + 1) / pts.length ? 0.9 : 0.15} />
      ))}
      <circle cx={pts[0][0]} cy={pts[0][1]} r="7" fill="none" stroke={GOLD} strokeWidth="2" opacity={draw} />
      <circle cx={pts[0][0]} cy={pts[0][1]} r="3" fill={GOLD} opacity={draw} />
    </svg>
  );
};

// —— 呼吸圆（机制一：身体先静） ——
const BreathCircle = ({ t }: { t: number }) => {
  const s = 0.92 + 0.08 * Math.sin(t * Math.PI * 2);
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="86" fill="none" stroke={LINE} strokeWidth="2" />
      <circle
        cx="110"
        cy="110"
        r={86 * s}
        fill="none"
        stroke={GOLD}
        strokeWidth="3.5"
        opacity="0.95"
        style={{ transformOrigin: '110px 110px' }}
      />
      <circle cx="110" cy="110" r={26 * s} fill={GOLD} opacity="0.85" />
      <circle cx="110" cy="110" r={44 * s} fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0.5" />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="110"
          x2="110"
          y1={110 - 86 * s}
          y2={110 - 86 * s - 16}
          stroke={GOLD_DIM}
          strokeWidth="2"
          opacity="0.8"
          style={{ transformOrigin: '110px 110px', transform: `rotate(${i * 90}deg)` }}
        />
      ))}
    </svg>
  );
};

// —— 脚印路径（机制二：念头有序） ——
const FootPath = () => (
  <svg width="170" height="150" viewBox="0 0 170 150">
    <path
      d="M8 140 L52 118 Q60 114 56 104 L14 74 Q8 70 10 62 L58 34 Q64 30 60 22 L18 4"
      fill="none"
      stroke={GOLD_DIM}
      strokeWidth="4"
      strokeDasharray="2 12"
      strokeLinecap="round"
      opacity="0.9"
    />
    {[
      { x: 66, y: 126 },
      { x: 106, y: 92 },
      { x: 146, y: 56 },
    ].map((p, i) => (
      <g key={i} opacity={0.35 + i * 0.3}>
        <ellipse cx={p.x} cy={p.y} rx="15" ry="8" fill="none" stroke={GOLD} strokeWidth="2.5" transform={`rotate(-38 ${p.x} ${p.y})`} />
        <ellipse cx={p.x - 12} cy={p.y + 14} rx="9" ry="6" fill="none" stroke={GOLD} strokeWidth="2.2" transform={`rotate(-38 ${p.x - 12} ${p.y + 14})`} />
      </g>
    ))}
  </svg>
);

// —— 底部进度条 ——
const Progress = ({ frame }: { frame: number }) => {
  const w = interpolate(frame, [0, P.end], [0, W], clamp);
  const pct = Math.round((frame / P.end) * 100);
  return (
    <div style={{ position: 'absolute', left: 0, bottom: 0, width: W }}>
      <div style={{ height: 3, background: 'rgba(200,160,106,0.14)' }}>
        <div style={{ height: 3, width: w, background: GOLD, boxShadow: `0 0 12px rgba(200,160,106,0.6)` }} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 26,
          bottom: 14,
          fontFamily: NUM,
          fontSize: 16,
          color: MUTED,
          letterSpacing: 2,
        }}
      >
        {String(pct).padStart(2, '0')}% · 40S
      </div>
    </div>
  );
};

// —— HUD 角标 ——
const Hud = () => (
  <>
    <div style={{ position: 'absolute', left: 46, top: 40, fontFamily: CN, fontSize: 17, color: GOLD, letterSpacing: 6, opacity: 0.85 }}>
      步 · WALK
    </div>
    <div style={{ position: 'absolute', right: 46, top: 40, fontFamily: CN, fontSize: 17, color: MUTED, letterSpacing: 5, opacity: 0.85 }}>
      秩序 · ORDER
    </div>
    {[
      { l: 38, t: 36, w: 26, h: 26 },
      { l: W - 64, t: 36, w: 26, h: 26 },
    ].map((b, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: b.l,
          top: b.t,
          width: b.w,
          height: b.h,
          border: `1px solid ${GOLD_DIM}`,
          opacity: 0.7,
        }}
      />
    ))}
  </>
);

// —— 金框卡片 ——
const Card = ({
  x,
  y,
  w,
  h,
  opacity,
  label,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  label?: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      opacity,
      background: CARD_BG,
      border: `1px solid ${LINE}`,
      borderRadius: 12,
      boxShadow: `0 0 34px rgba(200,160,106,0.07), inset 0 0 26px rgba(200,160,106,0.03)`,
      overflow: 'hidden',
    }}
  >
    {label && (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          padding: '7px 15px',
          fontFamily: CN,
          fontSize: 15,
          letterSpacing: 3,
          color: GOLD,
          background: 'rgba(200,160,106,0.09)',
          borderBottomRightRadius: 9,
        }}
      >
        {label}
      </div>
    )}
    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
  </div>
);

// ============ 主组件 ============
export const WanBu: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 13, stiffness: 90 }, durationInFrames: 50 });
  const dropScale = spring({
    frame: frame - P.drop,
    fps,
    config: { damping: 10, stiffness: 70 },
    durationInFrames: 34,
  });

  // 爆点金环扩散
  const boom = interpolate(frame, [P.drop - 2, P.drop + 16], [0, 1], clamp);
  const ringR = interpolate(boom, [0, 1], [0.2, 1.7]);
  const ringO = interpolate(boom, [0, 0.85], [0.8, 0], clamp);

  // 蓄力呼吸闪烁
  const breathe = interpolate(frame, [P.prep, P.drop], [0, 1], clamp);
  const breathO = 0.55 + 0.45 * Math.abs(Math.sin(breathe * Math.PI * 2.6));

  // 机制一：呼吸圆进度
  const calmT = interpolate(frame, [P.warm + 10, P.warm + 46], [0, 1], clamp);

  // 爆点段步数计数器：0 → 10000（先快后慢）
  const stepP = interpolate(frame, [P.drop + 6, P.drop + 42], [0, 1], clamp);
  const stepNum = Math.round(10000 * Math.pow(stepP, 0.55));

  const bgmVol = interpolate(
    frame,
    [0, 30, P.verdict - 10, P.ask, P.end],
    [0, 0.85, 0.85, 0.6, 0],
    clamp,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: CN }}>
      <PaperNoise />
      <Mountains />
      <Vignette />
      <GoldFrame />
      <Hud />
      <Progress frame={frame} />

      {/* ===== 开场标题 ===== */}
      {fadeInOut(frame, P.open, P.rumor - 8) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.open, P.rumor - 8) }}>
          <Seal ch="序" size={60} x={W / 2 - 30} y={218} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center' }}>
            <div
              style={{
                transform: `scale(${titleScale})`,
                fontSize: 116,
                fontWeight: 700,
                letterSpacing: 14,
                color: GOLD_BRIGHT,
                textShadow: `0 0 46px rgba(200,160,106,0.4)`,
              }}
            >
              一万步之后的秩序
            </div>
            <div style={{ width: 420, height: 1, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, margin: '38px auto 0' }} />
            <div style={{ marginTop: 34, fontSize: 34, letterSpacing: 10, color: MUTED }}>
              不靠意志，靠日复一日的脚步
            </div>
          </div>
        </div>
      )}

      {/* ===== 设问 ===== */}
      {fadeInOut(frame, P.rumor, P.science - 8) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.rumor, P.science - 8) }}>
          <Card x={310} y={330} w={1300} h={330} label="问自己 · ASK">
            <div style={{ position: 'absolute', left: 90, top: 76, fontSize: 58, color: INK, letterSpacing: 4 }}>
              焦虑、内耗、失眠——
            </div>
            <div style={{ position: 'absolute', left: 90, top: 182, fontSize: 33, color: MUTED, letterSpacing: 3, lineHeight: 1.7 }}>
              你把它归咎于「不够努力」？
              <br />
              其实你缺的从来不是决心，是
              <span style={{ color: GOLD_BRIGHT, fontSize: 40, fontWeight: 700 }}> 秩序</span>
            </div>
          </Card>
        </div>
      )}

      {/* ===== 铺垫：秩序藏在哪里 ===== */}
      {fadeInOut(frame, P.science, P.prep - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.science, P.prep - 6) }}>
          <PathLine frame={frame} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center' }}>
            <div style={{ fontSize: 78, fontWeight: 700, color: INK, letterSpacing: 10 }}>
              秩序不会凭空降临
            </div>
            <div style={{ marginTop: 26, fontSize: 32, color: MUTED, letterSpacing: 6 }}>
              它藏在你重复的每一步里
            </div>
          </div>
        </div>
      )}

      {/* ===== 蓄力 ===== */}
      {fadeInOut(frame, P.prep, P.drop) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.prep, P.drop) * breathO }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', fontSize: 92, fontWeight: 700, color: GOLD_BRIGHT, letterSpacing: 16 }}>
            答案，在路上
          </div>
        </div>
      )}

      {/* ===== 爆点：走 ===== */}
      {frame >= P.drop - 2 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <div
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2 - 40,
              width: 260,
              height: 260,
              marginLeft: -130,
              marginTop: -130,
              border: `2px solid ${GOLD}`,
              borderRadius: '50%',
              transform: `scale(${ringR})`,
              opacity: ringO,
              boxShadow: `0 0 46px rgba(200,160,106,0.5)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2 - 40,
              width: 260,
              height: 260,
              marginLeft: -130,
              marginTop: -130,
              border: `1px solid rgba(200,160,106,0.55)`,
              borderRadius: '50%',
              transform: `scale(${ringR * 0.68})`,
              opacity: ringO * 0.7,
            }}
          />
          <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.drop + 2, P.warm + 4) }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 292, textAlign: 'center' }}>
              <div
                style={{
                  transform: `scale(${dropScale})`,
                  fontSize: 200,
                  fontWeight: 700,
                  color: GOLD_BRIGHT,
                  letterSpacing: 20,
                  textShadow: `0 0 66px rgba(200,160,106,0.65)`,
                }}
              >
                走。
              </div>
              <div style={{ marginTop: 22, fontSize: 37, color: INK, letterSpacing: 5 }}>
                身体先安静，念头后有序
              </div>
              {/* 步数计数器 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 150,
                  fontFamily: NUM,
                  fontSize: 52,
                  fontWeight: 700,
                  color: GOLD,
                  letterSpacing: 6,
                  opacity: stepP,
                  textShadow: `0 0 26px rgba(200,160,106,0.4)`,
                }}
              >
                {stepNum.toLocaleString('en-US')}
                <span style={{ fontSize: 26, letterSpacing: 4, color: MUTED, marginLeft: 10 }}>步</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 机制一：身体先静 ===== */}
      {fadeInOut(frame, P.warm, P.shield - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.warm, P.shield - 6) }}>
          <Card x={210} y={250} w={1500} h={520} label="先静下来的是身体 · BODY">
            <div style={{ position: 'absolute', left: 118, top: 150 }}>
              <BreathCircle t={calmT} />
            </div>
            <div style={{ position: 'absolute', left: 400, top: 78, fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 4 }}>
              先静下来的是身体
            </div>
            <div style={{ position: 'absolute', left: 400, top: 172, fontSize: 31, color: MUTED, lineHeight: 1.75, letterSpacing: 2 }}>
              呼吸变慢，心率回落，焦虑的激素悄悄退场
              <br />
              身体安静下来，秩序才有了位置
            </div>
            <div
              style={{
                position: 'absolute',
                right: 84,
                top: 108,
                fontSize: 96,
                fontWeight: 700,
                color: GOLD,
                textShadow: `0 0 34px rgba(200,160,106,0.45)`,
              }}
            >
              静
            </div>
          </Card>
        </div>
      )}

      {/* ===== 机制二：念头有序 ===== */}
      {fadeInOut(frame, P.shield, P.care - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.shield, P.care - 6) }}>
          <Card x={210} y={250} w={1500} h={520} label="然后是念头 · MIND">
            <div style={{ position: 'absolute', left: 130, top: 170 }}>
              <FootPath />
            </div>
            <div style={{ position: 'absolute', left: 400, top: 92, fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 4 }}>
              然后是念头
            </div>
            <div style={{ position: 'absolute', left: 400, top: 186, fontSize: 31, color: MUTED, lineHeight: 1.75, letterSpacing: 2 }}>
              重复带来掌控，脚步磨平内耗
              <br />
              念头不再打架，各有各的位置
            </div>
            <div
              style={{
                position: 'absolute',
                right: 84,
                top: 108,
                fontSize: 96,
                fontWeight: 700,
                color: GOLD,
                textShadow: `0 0 34px rgba(200,160,106,0.45)`,
              }}
            >
              序
            </div>
          </Card>
        </div>
      )}

      {/* ===== 三条提醒 ===== */}
      {fadeInOut(frame, P.care, P.culprit - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.care, P.culprit - 6) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center' }}>
            <span style={{ fontSize: 68, fontWeight: 700, color: INK, letterSpacing: 6 }}>
              不必<em style={{ color: GOLD_BRIGHT, fontStyle: 'normal' }}>快</em> · 不必<em style={{ color: GOLD_BRIGHT, fontStyle: 'normal' }}>远</em> · 可以<em style={{ color: GOLD_BRIGHT, fontStyle: 'normal' }}>歇</em>
            </span>
          </div>
          {[
            { t: '慢', s: '慢也是走', d: '不是落后', x: 300 },
            { t: '恒', s: '今天比昨天多一步', d: '就是进', x: 790 },
            { t: '歇', s: '累了就停', d: '歇完再上路', x: 1280 },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: it.x,
                top: 320,
                width: 340,
                height: 340,
                opacity: fadeInOut(frame, P.care + 17 + i * 16, P.culprit - 6),
                background: CARD_BG,
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <Seal ch={it.t} size={64} x={340 / 2 - 32} y={40} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: 190, fontSize: 34, fontWeight: 700, color: INK }}>
                {it.s}
              </div>
              <div style={{ position: 'absolute', left: 20, right: 20, top: 248, fontSize: 25, color: MUTED, lineHeight: 1.6 }}>
                {it.d}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 四个念头 ===== */}
      {fadeInOut(frame, P.culprit, P.verdict - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.culprit, P.verdict - 6) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 160, textAlign: 'center' }}>
            <span style={{ fontSize: 64, fontWeight: 700, color: INK, letterSpacing: 6 }}>
              真正打乱秩序的，是<em style={{ color: CINNABAR, fontStyle: 'normal' }}>这四个念头</em>
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 60 }}>
            {[
              { n: '01', t: '明天再说', s: '一拖，就再没开始' },
              { n: '02', t: '想得太远', s: '还没走，先想了一百条路' },
              { n: '03', t: '与人攀比', s: '盯着别人的步数，忘了自己的路' },
              { n: '04', t: '自我怀疑', s: '走两步，就怀疑走错了' },
            ].map((it, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 330,
                  height: 330,
                  opacity: fadeInOut(frame, P.culprit + 16 + i * 16, P.verdict - 6),
                  background: CARD_BG,
                  border: `1px solid ${LINE}`,
                  borderRadius: 12,
                  boxShadow: `0 0 24px rgba(166,61,47,0.06)`,
                }}
              >
                <div style={{ position: 'absolute', left: 24, top: 18, fontFamily: NUM, fontSize: 26, color: CINNABAR, letterSpacing: 2, opacity: 0.9 }}>
                  {it.n}
                </div>
                <div style={{ position: 'absolute', left: 24, right: 24, top: 92, fontSize: 35, fontWeight: 700, color: INK }}>
                  {it.t}
                </div>
                <div style={{ position: 'absolute', left: 24, right: 24, top: 156, fontSize: 22, color: MUTED, lineHeight: 1.7 }}>
                  {it.s}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 总结 ===== */}
      {fadeInOut(frame, P.verdict, P.ask) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.verdict, P.ask) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 288, textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 8, opacity: 0.95 }}>
              一万步之后，你会发现
            </div>
            <div style={{ fontSize: 84, fontWeight: 700, color: GOLD_BRIGHT, letterSpacing: 10, marginTop: 40, textShadow: `0 0 40px rgba(200,160,106,0.4)` }}>
              秩序不是结果，是习惯
            </div>
            <div style={{ width: 420, height: 1, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, margin: '42px auto 0' }} />
            <div style={{ marginTop: 36, fontSize: 31, color: MUTED, letterSpacing: 5 }}>
              路，会给你最诚实的答案
            </div>
          </div>
        </div>
      )}

      {/* ===== 互动提问 ===== */}
      {fadeInOut(frame, P.ask, P.end) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.ask, P.end) }}>
          <Seal ch="步" size={58} x={W / 2 - 29} y={372} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 460, textAlign: 'center' }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: INK, letterSpacing: 8 }}>你今天，走到第几步了？</div>
            <div style={{ marginTop: 32, fontSize: 32, color: GOLD_BRIGHT, letterSpacing: 6 }}>评论区，留下你的步数</div>
          </div>
        </div>
      )}

      <Audio src={staticFile('bgm.mp3')} volume={bgmVol} />
      <Audio src={staticFile('sfx_wanbu.wav')} volume={1} />
    </AbsoluteFill>
  );
};
