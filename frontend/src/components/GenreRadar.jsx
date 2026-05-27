const VIEW_W = 480;
const VIEW_H = 380;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const RADIUS = 115;
const LABEL_OFFSET = 22;
const LINE_HEIGHT = 15;
const LEVELS = 4;
const AXES = 6;

function pointAt(i, radius) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / AXES;
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle),
  };
}

function polygonPoints(values, maxValue) {
  return values
    .map((v, i) => {
      const r = maxValue > 0 ? (v / maxValue) * RADIUS : 0;
      const p = pointAt(i, r);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

function axisDirection(i) {
  const rel = pointAt(i, 1);
  return {
    x: rel.x - CENTER_X,
    y: rel.y - CENTER_Y,
  };
}

function labelAnchor(i) {
  const { x } = axisDirection(i);
  if (Math.abs(x) < 0.01) return "middle";
  return x > 0 ? "start" : "end";
}

// разбиваем длинные подписи по ближайшему к середине пробелу
function splitLabel(text) {
  if (text.length <= 10 || !text.includes(" ")) return [text];
  const mid = Math.floor(text.length / 2);
  let bestIdx = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (bestIdx === -1 || Math.abs(i - mid) < Math.abs(bestIdx - mid))) {
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return [text];
  return [text.slice(0, bestIdx), text.slice(bestIdx + 1)];
}

export default function GenreRadar({ genres }) {
  const top = genres.slice(0, AXES);
  while (top.length < AXES) {
    top.push({ name: "—", total_hours: 0, games_count: 0 });
  }

  const max = Math.max(...top.map((g) => g.total_hours), 1);
  const values = top.map((g) => g.total_hours);

  const gridLevels = [];
  for (let l = 1; l <= LEVELS; l++) {
    const r = (RADIUS * l) / LEVELS;
    const pts = [];
    for (let i = 0; i < AXES; i++) {
      const p = pointAt(i, r);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    gridLevels.push(pts.join(" "));
  }

  return (
    <div className="radar">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="radar__svg">
        <g className="radar__grid">
          {gridLevels.map((pts, idx) => (
            <polygon key={idx} points={pts} />
          ))}
          {Array.from({ length: AXES }).map((_, i) => {
            const p = pointAt(i, RADIUS);
            return (
              <line
                key={i}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={p.x}
                y2={p.y}
                className="radar__axis"
              />
            );
          })}
        </g>

        <polygon points={polygonPoints(values, max)} className="radar__shape" />

        {top.map((g, i) => {
          const r = max > 0 ? (g.total_hours / max) * RADIUS : 0;
          const p = pointAt(i, r);
          return (
            <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={4} className="radar__point" />
          );
        })}

        {top.map((g, i) => {
          const labelPos = pointAt(i, RADIUS + LABEL_OFFSET);
          const lines = splitLabel(g.name);
          if (g.total_hours > 0) {
            lines[lines.length - 1] = `${lines[lines.length - 1]}  ·  ${g.total_hours} ч`;
          }

          const anchor = labelAnchor(i);
          const dir = axisDirection(i);
          // вертикальное смещение всего блока подписи относительно labelPos
          let blockShift = 0;
          if (dir.y < -0.5) {
            // верх: блок целиком выше labelPos
            blockShift = -(lines.length - 1) * LINE_HEIGHT;
          } else if (Math.abs(dir.y) <= 0.5) {
            // боковые: вертикально центрируем
            blockShift = -((lines.length - 1) * LINE_HEIGHT) / 2;
          }

          return (
            <text
              key={`lbl-${i}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={anchor}
              className="radar__label"
            >
              {lines.map((line, li) => (
                <tspan
                  key={li}
                  x={labelPos.x}
                  dy={li === 0 ? blockShift : LINE_HEIGHT}
                >
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
