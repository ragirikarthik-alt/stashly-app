/**
 * Android home-screen widgets (rendered to native RemoteViews).
 *
 *   StashlyWidget      "Stashly · Savings"   4×2, resizable. Total, this month,
 *                                            focus goal (or up to 3 goals when tall).
 *   StashlyMiniWidget  "Stashly · Progress"  2×2. Overall progress ring + total.
 *
 * Both follow the system light/dark theme, size themselves from the real widget
 * dimensions, and expose a round "+" that deep-links into the Savings Dial.
 * Tapping a goal row opens that goal.
 */
import React from 'react';
import {
  FlexWidget,
  ImageWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';
import { formatMoney } from '../utils/money';

export const WIDGET_NAMES = ['StashlyWidget', 'StashlyMiniWidget'];

const logo = require('../assets/logo-mark.png');
const SAVE = {
  clickAction: 'OPEN_URI',
  clickActionData: { uri: 'stashly://save' },
};
const goalLink = id => ({
  clickAction: 'OPEN_URI',
  clickActionData: { uri: `stashly://goal/${id}` },
});

const THEMES = {
  dark: {
    bg: {
      backgroundGradient: {
        from: '#134232',
        to: '#0A231B',
        orientation: 'TL_BR',
      },
    },
    text: '#F2F7F4',
    muted: '#8FB3A3',
    accent: '#6EE7B0',
    track: 'rgba(255, 255, 255, 0.12)',
    button: '#6EE7B0',
    buttonIcon: '#08261B',
    hairline: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    bg: { backgroundColor: '#FFFFFF' },
    text: '#14211B',
    muted: '#6B7A72',
    accent: '#167A58',
    track: '#E6EEE9',
    button: '#167A58',
    buttonIcon: '#FFFFFF',
    hairline: '#EEF2EF',
  },
};

const RADIUS = 22;
const PAD = 16;
const SANS = 'sans-serif';
const MEDIUM = 'sans-serif-medium';

/* ---------------- primitives ---------------- */

function plusSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13" stroke="${color}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`;
}

function SaveButton({ t, size = 36 }) {
  return (
    <FlexWidget
      {...SAVE}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.button,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SvgWidget
        svg={plusSvg(t.buttonIcon)}
        style={{ width: size * 0.56, height: size * 0.56 }}
      />
    </FlexWidget>
  );
}

function Header({ t, buttonSize }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ImageWidget image={logo} imageWidth={15} imageHeight={19} />
        <TextWidget
          text="Stashly"
          style={{
            marginLeft: 7,
            fontSize: 13,
            fontFamily: MEDIUM,
            color: t.muted,
          }}
        />
      </FlexWidget>
      <SaveButton t={t} size={buttonSize} />
    </FlexWidget>
  );
}

function Bar({ t, width, ratio, height = 6 }) {
  // Track spans the row; the fill is sized from the measured inner width.
  const w = Math.max(0, Math.round(width));
  const fill =
    ratio > 0 ? Math.max(height, Math.round(w * Math.min(ratio, 1))) : 0;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        borderRadius: height / 2,
        backgroundColor: t.track,
      }}
    >
      {fill ? (
        <FlexWidget
          style={{
            width: fill,
            height,
            borderRadius: height / 2,
            backgroundColor: t.accent,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}

function GoalRow({ t, goal, width, currency, compact }) {
  return (
    <FlexWidget
      {...goalLink(goal.id)}
      style={{ width: 'match_parent', flexDirection: 'column' }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          text={goal.name}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 13,
            fontFamily: MEDIUM,
            color: t.text,
            width: Math.max(60, width - 64),
          }}
        />
        <TextWidget
          text={`${goal.percent}%`}
          style={{ fontSize: 13, fontFamily: MEDIUM, color: t.accent }}
        />
      </FlexWidget>
      {!compact ? (
        <TextWidget
          text={`${formatMoney(goal.balance, currency)} of ${formatMoney(
            goal.target,
            currency,
          )}`}
          style={{
            fontSize: 11,
            fontFamily: SANS,
            color: t.muted,
            marginTop: 1,
          }}
        />
      ) : null}
      <FlexWidget style={{ width: 'match_parent', marginTop: 6 }}>
        <Bar t={t} width={width} ratio={goal.ratio} />
      </FlexWidget>
    </FlexWidget>
  );
}

function Shell({ t, children, padding = PAD, center }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: RADIUS,
        padding,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: center ? 'center' : 'flex-start',
        ...t.bg,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Empty({ t, onboarded, small }) {
  return (
    <Shell t={t}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ImageWidget image={logo} imageWidth={15} imageHeight={19} />
        <TextWidget
          text="Stashly"
          style={{
            marginLeft: 7,
            fontSize: 13,
            fontFamily: MEDIUM,
            color: t.muted,
          }}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={onboarded ? 'Start your first goal' : 'Save with intention'}
          maxLines={2}
          style={{
            fontSize: small ? 15 : 18,
            fontFamily: MEDIUM,
            color: t.text,
          }}
        />
        <TextWidget
          text="Tap to open Stashly"
          style={{
            fontSize: 12,
            fontFamily: SANS,
            color: t.muted,
            marginTop: 4,
          }}
        />
      </FlexWidget>
    </Shell>
  );
}

/* ---------------- Savings (4×2, resizable) ---------------- */

const HEADER_H = 36;
const AMOUNT_H = 56; // 30sp total + "saved" line
const SHORT_AMOUNT_H = 32;
const ROW_FULL_H = 46; // name + amount line + bar
const ROW_COMPACT_H = 30; // name + bar
const ROW_GAP = 12;
const SECTION_GAP = 14;

/** How many goal rows fit, and whether they need the compact form. */
function planRows(H, short, available) {
  const fixed =
    PAD * 2 + HEADER_H + (short ? SHORT_AMOUNT_H : AMOUNT_H) + SECTION_GAP * 2;
  const space = H - fixed;
  const fits = (n, rowH) => n * rowH + (n - 1) * ROW_GAP <= space;
  for (let n = Math.min(3, available); n >= 1; n--) {
    if (fits(n, ROW_FULL_H)) {
      return { rows: n, compact: false };
    }
    if (fits(n, ROW_COMPACT_H)) {
      return { rows: n, compact: true };
    }
  }
  return { rows: 1, compact: true };
}

function Savings({ t, data, width, height }) {
  if (!data || !data.goalCount) {
    return <Empty t={t} onboarded={data?.onboarded} />;
  }
  const c = data.currency;
  // Launchers report sizes slightly larger than they draw; budget with margin.
  const W = width * 0.94;
  const H = height * 0.94;
  const inner = width * 0.955 - PAD * 2;
  const short = H < 140;
  const narrow = W < 240;
  const layout = planRows(H, short, data.goals.length);
  const goals = data.goals.slice(0, layout.rows);
  return (
    <Shell t={t}>
      <Header t={t} buttonSize={short || narrow ? 30 : 36} />

      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={formatMoney(data.total, c, {
            compact: narrow && data.total >= 1e7,
          })}
          maxLines={1}
          style={{
            fontSize: short || narrow ? 24 : 30,
            fontFamily: SANS,
            fontWeight: 'bold',
            color: t.text,
          }}
        />
        {short ? null : (
          <FlexWidget
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}
          >
            <TextWidget
              text="saved"
              style={{ fontSize: 12, fontFamily: SANS, color: t.muted }}
            />
            {data.monthContrib > 0 ? (
              <TextWidget
                text={`  ·  +${formatMoney(data.monthContrib, c)} this month`}
                maxLines={1}
                style={{ fontSize: 12, fontFamily: MEDIUM, color: t.accent }}
              />
            ) : null}
          </FlexWidget>
        )}
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          flexGap: ROW_GAP,
        }}
      >
        {goals.map(g => (
          <GoalRow
            key={g.id}
            t={t}
            goal={g}
            width={inner}
            currency={c}
            compact={layout.compact}
          />
        ))}
      </FlexWidget>
    </Shell>
  );
}

/* ---------------- Progress (2×2) ---------------- */

function ringSvg(t, progress, size) {
  const stroke = 9;
  const r = (100 - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const off = c * (1 - p);
  const arc =
    p > 0
      ? `<circle cx="50" cy="50" r="${r}" stroke="${
          t.accent
        }" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(
          2,
        )} ${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(
          2,
        )}" transform="rotate(-90 50 50)"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" stroke="${t.track}" stroke-width="${stroke}" fill="none"/>${arc}</svg>`;
}

function Progress({ t, data, width, height }) {
  if (!data || !data.goalCount) {
    return <Empty t={t} onboarded={data?.onboarded} small />;
  }
  const c = data.currency;
  const pct = Math.floor(data.overall * 100);
  const W = width * 0.94;
  const H = height * 0.94;
  const sideBySide = W >= 150;
  const ring = Math.round(
    Math.max(52, Math.min(sideBySide ? (W < 180 ? 62 : 72) : 72, H - 92)),
  );
  return (
    <Shell t={t} padding={14}>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ImageWidget image={logo} imageWidth={14} imageHeight={18} />
        <SaveButton t={t} size={30} />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: sideBySide ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: sideBySide ? 'flex-start' : 'center',
        }}
      >
        <OverlapWidget style={{ width: ring, height: ring }}>
          <SvgWidget
            svg={ringSvg(t, data.overall, ring)}
            style={{ width: ring, height: ring }}
          />
          <FlexWidget
            style={{
              width: ring,
              height: ring,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={`${pct}%`}
              style={{
                fontSize: ring >= 64 ? 17 : 15,
                fontFamily: SANS,
                fontWeight: 'bold',
                color: t.text,
              }}
            />
          </FlexWidget>
        </OverlapWidget>
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: sideBySide ? 'flex-start' : 'center',
            marginLeft: sideBySide ? 12 : 0,
            marginTop: sideBySide ? 0 : 6,
          }}
        >
          <TextWidget
            text={formatMoney(data.total, c, { compact: true })}
            maxLines={1}
            style={{
              fontSize: 17,
              fontFamily: SANS,
              fontWeight: 'bold',
              color: t.text,
            }}
          />
          <TextWidget
            text={`of ${formatMoney(data.targetTotal, c, { compact: true })}`}
            maxLines={1}
            style={{
              fontSize: 11,
              fontFamily: SANS,
              color: t.muted,
              marginTop: 1,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <TextWidget
        text={`Overall · ${data.goalCount} ${
          data.goalCount === 1 ? 'goal' : 'goals'
        }`}
        maxLines={1}
        style={{ fontSize: 11, fontFamily: MEDIUM, color: t.muted }}
      />
    </Shell>
  );
}

/* ---------------- entry ---------------- */

/** Returns light + dark variants; Android picks the one matching the system theme. */
export function renderStashlyWidget(name, data, info) {
  const width = info?.width || (name === 'StashlyMiniWidget' ? 150 : 320);
  const height = info?.height || 150;
  const View = name === 'StashlyMiniWidget' ? Progress : Savings;
  return {
    light: <View t={THEMES.light} data={data} width={width} height={height} />,
    dark: <View t={THEMES.dark} data={data} width={width} height={height} />,
  };
}
