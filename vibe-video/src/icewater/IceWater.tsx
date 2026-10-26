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
// 所有切换点已吸附到配乐实测重拍帧（BPM 112.35，重拍鼓点）：
// 98 / 256 / 385 / 511 / 559 / 606 / 717 / 860 / 1019 / 1115
const P = {
  open: 0, // 0-98    开场标题
  rumor: 98, // 98-256  妈妈们的经典警告
  science: 256, // 256-385 科学只认证据
  prep: 385, // 385-511 蓄力
  drop: 511, // 511     爆点：不伤！（最强重拍）
  warm: 559, // 559-606 冰水进胃，几分钟捂热
  shield: 606, // 606-717 胃黏膜自带防御
  care: 717, // 717-860 这几种情况要少喝
  culprit: 860, // 860-1019 真正伤胃的是它们
  verdict: 1019, // 1019-1115 正常人放心喝
  ask: 1115, // 1115-1200 互动提问
  end: 1200,
};

const W = 1920;
const H = 1080;

const CYAN = '#67e8f9';
const CYAN_DIM = '#155e75';
const INK = '#e2e8f0';
const MUTED = '#94a3b8';
const RED = '#f87171';
const BG = '#060a13';
const CARD_BG = 'rgba(13, 22, 40, 0.78)';

const CN = '"Microsoft YaHei", "Microsoft YaHei Light", sans-serif';
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

const Grid = () => (
  <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.16 }}>
    <defs>
      <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M72 0H0V72" fill="none" stroke={CYAN} strokeWidth="1" />
      </pattern>
    </defs>
    <rect width={W} height={H} fill="url(#grid)" />
  </svg>
);

const Vignette = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(ellipse at 50% 42%, rgba(34,211,238,0.10) 0%, rgba(6,10,19,0) 46%, rgba(0,0,0,0.55) 100%)',
    }}
  />
);

const ScanLine = ({ frame }: { frame: number }) => {
  const y = ((frame % 75) / 75) * H;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: y,
        width: W,
        height: 140,
        background:
          'linear-gradient(to bottom, rgba(103,232,249,0) 0%, rgba(103,232,249,0.05) 50%, rgba(103,232,249,0) 100%)',
        pointerEvents: 'none',
      }}
    />
  );
};

const Progress = ({ frame }: { frame: number }) => {
  const w = interpolate(frame, [0, P.end], [0, W], clamp);
  const pct = Math.round((frame / P.end) * 100);
  return (
    <div style={{ position: 'absolute', left: 0, bottom: 0, width: W }}>
      <div style={{ height: 4, background: 'rgba(103,232,249,0.12)' }}>
        <div style={{ height: 4, width: w, background: CYAN, boxShadow: `0 0 12px ${CYAN}` }} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 26,
          bottom: 16,
          fontFamily: NUM,
          fontSize: 17,
          color: MUTED,
          letterSpacing: 2,
        }}
      >
        {String(pct).padStart(2, '0')}% · 40S
      </div>
    </div>
  );
};

const Hud = () => (
  <>
    <div style={{ position: 'absolute', left: 40, top: 34, fontFamily: NUM, fontSize: 15, color: CYAN, letterSpacing: 4, opacity: 0.8 }}>
      LIFE SCIENCE
    </div>
    <div style={{ position: 'absolute', right: 40, top: 34, fontFamily: NUM, fontSize: 15, color: MUTED, letterSpacing: 3, opacity: 0.8 }}>
      HEALTH CHECK / 冰水与胃
    </div>
    {[
      { l: 34, t: 30, w: 22, h: 22 },
      { l: W - 56, t: 30, w: 22, h: 22 },
    ].map((b, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: b.l,
          top: b.t,
          width: b.w,
          height: b.h,
          border: `1px solid ${CYAN_DIM}`,
          opacity: 0.7,
        }}
      />
    ))}
  </>
);

const Card = ({
  x,
  y,
  w,
  h,
  opacity,
  label,
  children,
  accent = CYAN,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  label?: string;
  children: React.ReactNode;
  accent?: string;
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
      border: `1px solid rgba(103,232,249,0.32)`,
      borderRadius: 14,
      boxShadow: `0 0 28px rgba(34,211,238,0.10), inset 0 0 22px rgba(34,211,238,0.04)`,
      overflow: 'hidden',
    }}
  >
    {label && (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          padding: '7px 14px',
          fontFamily: NUM,
          fontSize: 13,
          letterSpacing: 2,
          color: accent,
          background: `rgba(34,211,238,0.08)`,
          borderBottomRightRadius: 10,
        }}
      >
        {label}
      </div>
    )}
    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
  </div>
);

// ============ 图标（内联 SVG） ============
const Thermometer = ({ t, color = CYAN }: { t: number; color?: string }) => {
  // t: 0-1 液柱高度
  const h = 120 * t;
  return (
    <svg width="120" height="210" viewBox="0 0 120 210">
      <rect x="48" y="30" width="24" height="120" rx="12" fill="none" stroke={color} strokeWidth="5" />
      <rect x="52" y={150 - h} width="16" height={h} rx="8" fill={color} />
      <circle cx="60" cy="178" r="24" fill="none" stroke={color} strokeWidth="5" />
      <circle cx="60" cy="178" r="13" fill={color} opacity={0.9} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="44" x2="54" y1={70 + i * 26} y2={70 + i * 26} stroke={color} strokeWidth="3" />
      ))}
    </svg>
  );
};

const Shield = () => (
  <svg width="130" height="150" viewBox="0 0 130 150">
    <path
      d="M65 8 L118 28 V74 C118 112 96 134 65 146 C34 134 12 112 12 74 V28 Z"
      fill="none"
      stroke={CYAN}
      strokeWidth="6"
    />
    <path d="M65 8 L118 28 V74 C118 112 96 134 65 146 C34 134 12 112 12 74 V28 Z" fill={CYAN} opacity="0.10" />
    <path d="M36 44 h58 v26 a29 29 0 0 1 -58 0 Z" fill="none" stroke={CYAN} strokeWidth="5" />
    <line x1="65" y1="76" x2="65" y2="96" stroke={CYAN} strokeWidth="5" />
    <circle cx="65" cy="104" r="4.5" fill={CYAN} />
  </svg>
);

const Warning = () => (
  <svg width="120" height="108" viewBox="0 0 120 108">
    <path d="M60 6 L114 100 H6 Z" fill="none" stroke={RED} strokeWidth="6" />
    <path d="M60 6 L114 100 H6 Z" fill={RED} opacity="0.10" />
    <line x1="60" y1="34" x2="60" y2="70" stroke={RED} strokeWidth="6" />
    <circle cx="60" cy="88" r="4.5" fill={RED} />
  </svg>
);

const IceCup = () => (
  <svg width="120" height="160" viewBox="0 0 120 160">
    <path d="M30 30 H90 L84 150 H36 Z" fill="none" stroke={CYAN} strokeWidth="5" />
    <line x1="30" y1="58" x2="90" y2="58" stroke={CYAN} strokeWidth="3" opacity="0.5" />
    <rect x="46" y="70" width="14" height="14" fill={CYAN} opacity="0.85" />
    <rect x="66" y="86" width="14" height="14" fill={CYAN} opacity="0.6" />
    <path d="M20 26 h8 v10 h-8 z M64 20 h10 v8 h-10 z" fill={CYAN} opacity="0.7" />
    <path d="M40 6 q6 -8 12 0" fill="none" stroke={CYAN} strokeWidth="3" opacity="0.6" />
  </svg>
);

// ============ 主组件 ============
export const IceWater: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 13, stiffness: 90 }, durationInFrames: 50 });
  const dropScale = spring({
    frame: frame - P.drop,
    fps,
    config: { damping: 10, stiffness: 70 },
    durationInFrames: 34,
  });

  // 爆点冲击波
  const boom = interpolate(frame, [P.drop - 2, P.drop + 16], [0, 1], clamp);
  const ringR = interpolate(boom, [0, 1], [0.2, 1.6]);
  const ringO = interpolate(boom, [0, 0.85], [0.85, 0], clamp);

  // 呼吸闪烁（蓄力段）
  const breathe = interpolate(frame, [P.prep, P.drop], [0, 1], clamp);
  const breathO = 0.55 + 0.45 * Math.abs(Math.sin(breathe * Math.PI * 2.6));

  // 温度计（warm 段：4℃→37℃，压缩到 569-605 帧踩 559-606 段落）
  const warmT = interpolate(frame, [P.warm + 10, P.warm + 46], [0, 1], clamp);
  const tempNum = Math.round(4 + warmT * 33);

  const bgmVol = interpolate(
    frame,
    [0, 30, P.verdict - 10, P.ask, P.end],
    [0, 0.85, 0.85, 0.6, 0],
    clamp,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: CN }}>
      <Grid />
      <Vignette />
      <ScanLine frame={frame} />
      <Hud />
      <Progress frame={frame} />

      {/* ===== 开场标题 ===== */}
      {fadeInOut(frame, P.open, P.rumor - 8) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.open, P.rumor - 8) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center' }}>
            <div
              style={{
                transform: `scale(${titleScale})`,
                fontSize: 128,
                fontWeight: 700,
                letterSpacing: 10,
                color: INK,
                textShadow: `0 0 42px rgba(103,232,249,0.45)`,
              }}
            >
              喝冰水，真的伤胃？
            </div>
            <div style={{ marginTop: 30, fontSize: 34, letterSpacing: 6, color: CYAN, opacity: 0.9 }}>
              妈妈们的经典警告 · 有没有科学依据
            </div>
          </div>
        </div>
      )}

      {/* ===== 流言卡片 ===== */}
      {fadeInOut(frame, P.rumor, P.science - 8) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.rumor, P.science - 8) }}>
          <Card x={310} y={330} w={1300} h={330} label="COMMON BELIEF / 常见说法">
            <div style={{ position: 'absolute', left: 90, top: 84, fontSize: 60, color: INK, letterSpacing: 4 }}>
              “冰水进胃，会‘冻伤’胃？会把胃喝出病？”
            </div>
            <div style={{ position: 'absolute', left: 90, top: 190, fontSize: 32, color: MUTED, letterSpacing: 3 }}>
              一句话流传了几十年，可它经得起证据检验吗？
            </div>
          </Card>
        </div>
      )}

      {/* ===== 科学铺垫 ===== */}
      {fadeInOut(frame, P.science, P.prep - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.science, P.prep - 6) }}>
          <div style={{ position: 'absolute', left: 430, top: 300, fontSize: 76, fontWeight: 700, color: INK, letterSpacing: 6 }}>
            科学，只认证据
          </div>
          <div style={{ position: 'absolute', left: 500, top: 430, fontSize: 30, color: MUTED, letterSpacing: 3 }}>
            胃是器官，不是怕冷的“娇气包” —— 看它怎么工作
          </div>
          <div style={{ position: 'absolute', left: 880, top: 560 }}>
            <IceCup />
          </div>
        </div>
      )}

      {/* ===== 蓄力 ===== */}
      {fadeInOut(frame, P.prep, P.drop) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.prep, P.drop) * breathO }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', fontSize: 88, fontWeight: 700, color: CYAN, letterSpacing: 12 }}>
            答案揭晓
          </div>
        </div>
      )}

      {/* ===== 爆点 ===== */}
      {frame >= P.drop - 2 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <div
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2,
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -100,
              border: `3px solid ${CYAN}`,
              borderRadius: '50%',
              transform: `scale(${ringR})`,
              opacity: ringO,
              boxShadow: `0 0 40px rgba(103,232,249,0.5)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2,
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -100,
              border: `1px solid rgba(103,232,249,0.6)`,
              borderRadius: '50%',
              transform: `scale(${ringR * 0.7})`,
              opacity: ringO * 0.7,
            }}
          />
          <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.drop + 2, P.warm + 4) }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
              <div
                style={{
                  transform: `scale(${dropScale})`,
                  fontSize: 190,
                  fontWeight: 700,
                  color: CYAN,
                  letterSpacing: 14,
                  textShadow: `0 0 60px rgba(103,232,249,0.7)`,
                }}
              >
                不伤。
              </div>
              <div style={{ marginTop: 26, fontSize: 36, color: INK, letterSpacing: 4 }}>
                目前没有证据表明：冰水会直接损伤胃黏膜
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 机制一：温度中和 ===== */}
      {fadeInOut(frame, P.warm, P.shield - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.warm, P.shield - 6) }}>
          <Card x={210} y={250} w={1500} h={520} label="HOW IT WORKS / 胃怎么处理">
            <div style={{ position: 'absolute', left: 90, top: 76, width: 180 }}>
              <Thermometer t={warmT} />
            </div>
            <div style={{ position: 'absolute', left: 330, top: 80, fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 4 }}>
              冰水进胃，几分钟就被“捂热”
            </div>
            <div style={{ position: 'absolute', left: 330, top: 170, fontSize: 32, color: MUTED, lineHeight: 1.7, letterSpacing: 2 }}>
              胃壁布满血管，食物一进来就持续加温
              <br />
              一小杯冰水对胃内温度的影响，微乎其微
            </div>
            <div
              style={{
                position: 'absolute',
                right: 80,
                top: 96,
                fontFamily: NUM,
                fontSize: 108,
                fontWeight: 700,
                color: CYAN,
                textShadow: `0 0 34px rgba(103,232,249,0.5)`,
              }}
            >
              {tempNum}℃
            </div>
          </Card>
        </div>
      )}

      {/* ===== 机制二：黏膜防御 ===== */}
      {fadeInOut(frame, P.shield, P.care - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.shield, P.care - 6) }}>
          <Card x={210} y={250} w={1500} h={520} label="DEFENSE / 自我保护">
            <div style={{ position: 'absolute', left: 100, top: 120 }}>
              <Shield />
            </div>
            <div style={{ position: 'absolute', left: 330, top: 96, fontSize: 56, fontWeight: 700, color: INK, letterSpacing: 4 }}>
              胃黏膜，自带防御层
            </div>
            <div style={{ position: 'absolute', left: 330, top: 186, fontSize: 32, color: MUTED, lineHeight: 1.7, letterSpacing: 2 }}>
              黏液屏障 + 快速修复，是胃的看家本领
              <br />
              健康人的胃，没那么容易被一杯冰水“攻破”
            </div>
          </Card>
        </div>
      )}

      {/* ===== 敏感人群 ===== */}
      {fadeInOut(frame, P.care, P.culprit - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.care, P.culprit - 6) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center' }}>
            <span style={{ fontSize: 70, fontWeight: 700, color: INK, letterSpacing: 6 }}>
              但<em style={{ color: CYAN, fontStyle: 'normal' }}>这几种情况</em>，要少喝
            </span>
          </div>
          {[
            { t: '肠胃敏感的人', s: '一喝冷饮就胀气、拉肚子', x: 300, y: 320, icon: <Warning /> },
            { t: '偏头痛人群', s: '冷饮可能诱发头痛', x: 790, y: 320, icon: <Warning /> },
            { t: '剧烈运动 / 大汗后', s: '别猛灌，慢点喝温水更稳', x: 1280, y: 320, icon: <Warning /> },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: it.x,
                top: it.y,
                width: 340,
                height: 340,
                opacity: fadeInOut(frame, P.care + 17 + i * 16, P.culprit - 6),
                background: CARD_BG,
                border: `1px solid rgba(248,113,113,0.35)`,
                borderRadius: 14,
                textAlign: 'center',
              }}
            >
              <div style={{ position: 'absolute', left: 0, right: 0, top: 34 }}>{it.icon}</div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 176, fontSize: 30, fontWeight: 700, color: INK }}>
                {it.t}
              </div>
              <div style={{ position: 'absolute', left: 20, right: 20, top: 232, fontSize: 23, color: MUTED, lineHeight: 1.6 }}>
                {it.s}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 真正凶手 ===== */}
      {fadeInOut(frame, P.culprit, P.verdict - 6) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.culprit, P.verdict - 6) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 160, textAlign: 'center' }}>
            <span style={{ fontSize: 74, fontWeight: 700, color: INK, letterSpacing: 6 }}>
              真正伤胃的，是<em style={{ color: RED, fontStyle: 'normal' }}>它们</em>
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 60 }}>
            {[
              { n: '01', t: '幽门螺杆菌', s: '最常见的胃病元凶' },
              { n: '02', t: '酒精', s: '直接损伤胃黏膜' },
              { n: '03', t: '止痛药 NSAIDs', s: '溃疡与出血风险' },
              { n: '04', t: '高盐腌制', s: '长期刺激胃壁' },
            ].map((it, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 330,
                  height: 330,
                  opacity: fadeInOut(frame, P.culprit + 16 + i * 16, P.verdict - 6),
                  background: CARD_BG,
                  border: `1px solid rgba(248,113,113,0.4)`,
                  borderRadius: 14,
                  boxShadow: `0 0 24px rgba(248,113,113,0.08)`,
                }}
              >
                <div style={{ position: 'absolute', left: 24, top: 18, fontFamily: NUM, fontSize: 26, color: RED, letterSpacing: 2, opacity: 0.9 }}>
                  {it.n}
                </div>
                <div style={{ position: 'absolute', left: 24, right: 24, top: 92, fontSize: 34, fontWeight: 700, color: INK }}>
                  {it.t}
                </div>
                <div style={{ position: 'absolute', left: 24, right: 24, top: 156, fontSize: 23, color: MUTED, lineHeight: 1.6 }}>
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
          <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
            <div style={{ fontSize: 78, fontWeight: 700, color: INK, letterSpacing: 8 }}>
              正常人：<span style={{ color: CYAN }}>放心喝</span>
            </div>
            <div style={{ fontSize: 78, fontWeight: 700, color: INK, letterSpacing: 8, marginTop: 34 }}>
              不舒服：<span style={{ color: RED }}>就少喝</span>
            </div>
            <div style={{ marginTop: 56, fontSize: 30, color: MUTED, letterSpacing: 3 }}>
              身体会给你最诚实的答案
            </div>
          </div>
        </div>
      )}

      {/* ===== 互动提问 ===== */}
      {fadeInOut(frame, P.ask, P.end) > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: fadeInOut(frame, P.ask, P.end) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: INK, letterSpacing: 8 }}>你爱喝冰水吗？</div>
            <div style={{ marginTop: 34, fontSize: 32, color: CYAN, letterSpacing: 6 }}>评论区聊聊你的习惯</div>
          </div>
        </div>
      )}

      <Audio src={staticFile('bgm.mp3')} volume={bgmVol} />
      <Audio src={staticFile('sfx_ice.wav')} volume={1} />
    </AbsoluteFill>
  );
};
