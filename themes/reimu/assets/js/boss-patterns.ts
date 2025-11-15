// Boss bullet pattern system

export interface Vector2D {
  x: number;
  y: number;
}

export interface BossBulletConfig {
  position: Vector2D;
  speed: number;
  angleRad: number; // radians
  width: number;
  height: number;
}

export interface PatternContext {
  bossPos: Vector2D;
  playerPos: Vector2D;
  tick: number; // ms since pattern start
  seed?: number;
}

export interface BossPattern {
  name: string;
  duration: number; // ms
  // Return a set of bullets to spawn at this tick
  spawn(ctx: PatternContext): BossBulletConfig[];
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function angleToPlayer(from: Vector2D, to: Vector2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Giảm speed của tất cả bullet xuống 80% giá trị cũ
function slow(v: number) { return v * 0.8; }
// 1) Radial burst every 600ms
export const radialBurst: BossPattern = {
  name: 'radialBurst',
  duration: 5000,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 600 < 16) {
      const count = 24;
      for (let i = 0; i < count; i++) {
        const angle = degToRad((360 / count) * i + (ctx.tick / 8) % 360);
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y + 30 },
          speed: slow(2.5),
          angleRad: angle,
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 2) Spiral stream
export const spiralStream: BossPattern = {
  name: 'spiralStream',
  duration: 6000,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    // spawn every ~60ms
    if (ctx.tick % 60 < 16) {
      const base = (ctx.tick / 6) % 360;
      for (let i = 0; i < 2; i++) {
        const angle = degToRad(base + i * 180);
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y + 20 },
          speed: slow(3.0),
          angleRad: angle,
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 3) Aimed volleys toward player
export const aimedVolley: BossPattern = {
  name: 'aimedVolley',
  duration: 4000,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 500 < 16) {
      const baseAngle = angleToPlayer(ctx.bossPos, ctx.playerPos);
      const spread = degToRad(20);
      const count = 5;
      for (let i = -2; i <= 2; i++) {
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y + 30 },
          speed: slow(3.2),
          angleRad: baseAngle + (i * spread) / (count / 2),
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 4) Wave rings (sine-modulated angles)
export const waveRings: BossPattern = {
  name: 'waveRings',
  duration: 5000,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 400 < 16) {
      const count = 16;
      for (let i = 0; i < count; i++) {
        const base = (i / count) * Math.PI * 2;
        const offset = Math.sin(ctx.tick / 250) * 0.6;
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y + 24 },
          speed: slow(2.2),
          angleRad: base + offset,
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 8) Zigzag barrage
export const zigzagBarrage: BossPattern = {
  name: 'zigzagBarrage',
  duration: 4800,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 56 < 12) {
      for (let i = -2; i <= 2; i++) {
        const angle = degToRad(60 + Math.sin(ctx.tick / 250 + i) * 60 + i * 20);
        bullets.push({
          position: { x: ctx.bossPos.x + i * 26, y: ctx.bossPos.y + 18 },
          speed: slow(2.55 + 0.2 * Math.abs(i)),
          angleRad: angle,
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 9) Cross spread
export const crossSpread: BossPattern = {
  name: 'crossSpread',
  duration: 4400,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 480 < 20) {
      // 4 trục chính + 4 góc chéo mỗi lần\
      for (let i = 0; i < 8; i++) {
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y + 23 },
          speed: slow(2.8),
          angleRad: degToRad(i * 45 + (ctx.tick / 8)),
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 10) Spinning laser wall (gap moves side to side)
export const laserWall: BossPattern = {
  name: 'laserWall',
  duration: 6000,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    // Only spawn new wall every ~700ms
    if (ctx.tick % 700 < 16) {
      const gapCount = 2;
      const count = 18;
      // The gap slides left to right and back
      const gapPos = Math.floor(Math.abs(Math.sin(ctx.tick / 1200)) * (count - gapCount));
      for (let i = 0; i < count; i++) {
        let skip = false;
        for (let g = 0; g < gapCount; g++) {
          if (i === gapPos + g) skip = true;
        }
        if (skip) continue;
        bullets.push({
          position: { x: 70 + i * 38, y: ctx.bossPos.y + 5 },
          speed: slow(2.6),
          angleRad: degToRad(90),
          width: 6,
          height: 16
        });
      }
    }
    return bullets;
  }
};

// 11) Inward spiral (bullets spiral inward towards player location)
export const inwardSpiral: BossPattern = {
  name: 'inwardSpiral',
  duration: 5800,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 83 < 16) {
      const base = angleToPlayer(ctx.bossPos, ctx.playerPos);
      for (let i = 0; i < 7; i++) {
        const spiralAngle = base + (i - 3) * 0.45 + Math.sin(ctx.tick / 220) * 0.4;
        bullets.push({
          position: { x: ctx.bossPos.x, y: ctx.bossPos.y },
          speed: slow(2.45 + Math.abs(i - 3) * 0.1),
          angleRad: spiralAngle,
          width: 4,
          height: 8
        });
      }
    }
    return bullets;
  }
};

// 12) Sidelong zigzags (bullets launch from the far side then slant toward player)
export const sidelongZigzag: BossPattern = {
  name: 'sidelongZigzag',
  duration: 4500,
  spawn: (ctx: PatternContext) => {
    const bullets: BossBulletConfig[] = [];
    if (ctx.tick % 220 < 18) {
      for (let side = 0; side < 2; side++) {
        const startX = side === 0 ? 70 : 620;
        const baseAngle = side === 0 ? degToRad(75) : degToRad(105);
        for (let i = 0; i < 4; i++) {
          bullets.push({
            position: { x: startX, y: ctx.bossPos.y + 10 + i * 9 },
            speed: slow(3.3 - 0.2 * i),
            angleRad: baseAngle + Math.sin(ctx.tick / 130 + i) * 0.4,
            width: 4,
            height: 8
          });
        }
      }
    }
    return bullets;
  }
};

// Randomize pattern order for each playthrough (if not already shuffled)
function shufflePatterns<T>(arr: T[]): T[] {
  // Fisher-Yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const DefaultBossScript: BossPattern[] = shufflePatterns([
  radialBurst,
  zigzagBarrage,
  spiralStream,
  crossSpread,
  aimedVolley,
  waveRings,
  // extra patterns
  {
    name: 'curtainRain',
    duration: 5000,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 90 < 16) {
        for (let i = 0; i <= 8; i++) {
          const x = 80 + i * 70;
          const angle = degToRad(90 + Math.sin((ctx.tick + i * 50) / 200) * 20);
          bullets.push({
            position: { x, y: ctx.bossPos.y },
            speed: slow(2.6),
            angleRad: angle,
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  },
  {
    name: 'gappedRingSweep',
    duration: 4500,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 500 < 16) {
        const gaps = 2;
        const count = 36;
        const gapStart = Math.floor(((ctx.tick / 10) % count));
        for (let i = 0; i < count; i++) {
          let skip = false;
          for (let g = 0; g < gaps; g++) {
            if (i === (gapStart + g * Math.floor(count / gaps)) % count) skip = true;
          }
          if (skip) continue;
          bullets.push({
            position: { x: ctx.bossPos.x, y: ctx.bossPos.y },
            speed: slow(2.4),
            angleRad: degToRad((360 / count) * i + (ctx.tick / 8)),
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  },
  {
    name: 'aimedSpiral',
    duration: 5500,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 70 < 16) {
        const base = angleToPlayer(ctx.bossPos, ctx.playerPos) + (ctx.tick / 200);
        for (let i = 0; i < 3; i++) {
          bullets.push({
            position: { x: ctx.bossPos.x, y: ctx.bossPos.y },
            speed: slow(3.0),
            angleRad: base + i * 0.5,
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  },
  laserWall,
  inwardSpiral,
  sidelongZigzag,
]);




// Boss 1 (Marisa) - Easy patterns
export const Boss1Patterns: BossPattern[] = [
  spiralStream,
  aimedVolley,
  {
    name: 'simpleRain',
    duration: 4000,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 150 < 16) {
        for (let i = 0; i <= 5; i++) {
          const x = 150 + i * 100;
          bullets.push({
            position: { x, y: ctx.bossPos.y },
            speed: slow(2.0),
            angleRad: degToRad(90),
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  }
];

// Boss 2 (Elly) - Medium patterns
export const Boss2Patterns: BossPattern[] = [
  radialBurst,
  zigzagBarrage,
  waveRings,
  crossSpread,
  {
    name: 'curtainRain',
    duration: 5000,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 90 < 16) {
        for (let i = 0; i <= 8; i++) {
          const x = 80 + i * 70;
          const angle = degToRad(90 + Math.sin((ctx.tick + i * 50) / 200) * 20);
          bullets.push({
            position: { x, y: ctx.bossPos.y },
            speed: slow(2.6),
            angleRad: angle,
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  }
];

// Boss 3 (Alice) - Hard patterns
export const Boss3Patterns: BossPattern[] = [
  laserWall,
  inwardSpiral,
  sidelongZigzag,
  {
    name: 'gappedRingSweep',
    duration: 4500,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 500 < 16) {
        const gaps = 2;
        const count = 36;
        const gapStart = Math.floor(((ctx.tick / 10) % count));
        for (let i = 0; i < count; i++) {
          let skip = false;
          for (let g = 0; g < gaps; g++) {
            if (i === (gapStart + g * Math.floor(count / gaps)) % count) skip = true;
          }
          if (skip) continue;
          bullets.push({
            position: { x: ctx.bossPos.x, y: ctx.bossPos.y },
            speed: slow(2.4),
            angleRad: degToRad((360 / count) * i + (ctx.tick / 8)),
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  },
  {
    name: 'denseSpiral',
    duration: 6000,
    spawn: (ctx: PatternContext) => {
      const bullets: BossBulletConfig[] = [];
      if (ctx.tick % 40 < 16) {
        const base = (ctx.tick / 5) % 360;
        for (let i = 0; i < 4; i++) {
          const angle = degToRad(base + i * 90);
          bullets.push({
            position: { x: ctx.bossPos.x, y: ctx.bossPos.y },
            speed: slow(3.5),
            angleRad: angle,
            width: 4,
            height: 8
          });
        }
      }
      return bullets;
    }
  }
];
