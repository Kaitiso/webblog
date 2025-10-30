import { DefaultBossScript, BossPattern, PatternContext } from './boss-patterns';
// Touhou Mini Game
interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  lives: number;
  level: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  bullets: Bullet[];
  lastShot: number;
  shootCooldown: number;
  sprite: HTMLImageElement | null;
  spriteWidth: number;
  spriteHeight: number;
  frameWidth: number;
  frameHeight: number;
  currentFrame: number;
  animationSpeed: number;
  lastFrameTime: number;
  totalFrames: number;
  framesPerRow: number;
  currentRow: number;
  animationType: 'idle' | 'move' | 'attack';
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'player' | 'enemy';
  vx?: number;
  vy?: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  bullets: Bullet[];
  lastShot: number;
  shootCooldown: number;
  health: number;
  maxHealth: number;
  sprite: HTMLImageElement | null;
  spriteWidth: number;
  spriteHeight: number;
  frameWidth: number;
  frameHeight: number;
  currentFrame: number;
  animationSpeed: number;
  lastFrameTime: number;
  totalFrames: number;
  framesPerRow: number;
  currentRow: number;
  animationType: 'idle' | 'move' | 'attack';
}

interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  bullets: Bullet[];
  sprite: HTMLImageElement | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

class TouhouGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private player: Player;
  private enemies: Enemy[]; // legacy (unused after boss refactor, kept for minimal diff)
  private boss: Boss | null;
  private particles: Particle[];
  private keys: { [key: string]: boolean };
  private isShootingHeld: boolean;
  private isSlowHeld: boolean;
  private invulnerableUntil: number;
  private animationId: number;
  private lastTime: number;
  private enemySpawnTimer: number;
  private enemySpawnInterval: number;
  private spritesLoaded: boolean;
  private patternIndex: number;
  private patternElapsed: number;
  private playerHitboxRadius = 4; // Chấm hitbox radius ~ 8px đường kính

  constructor() {
    this.canvas = document.getElementById('touhou-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.gameState = {
      isRunning: false,
      isPaused: false,
      score: 0,
      lives: 3,
      level: 1
    };

    this.player = {
      x: this.canvas.width / 2 - 16,
      y: this.canvas.height - 70,
      width: 32,
      height: 40,
      speed: 5,
      bullets: [],
      lastShot: 0,
      shootCooldown: 150,
      sprite: null,
      spriteWidth: 0,
      spriteHeight: 0,
      frameWidth: 32,
      frameHeight: 40,
      currentFrame: 0,
      animationSpeed: 150,
      lastFrameTime: 0,
      totalFrames: 4, // Frames per row
      framesPerRow: 4,
      currentRow: 0, // Start with idle animation (row 0)
      animationType: 'idle'
    };

    this.enemies = [];
    this.boss = null;
    this.particles = [];
    this.keys = {};
    this.isShootingHeld = false;
    this.isSlowHeld = false;
    this.invulnerableUntil = 0;
    this.animationId = 0;
    this.lastTime = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 2000;
    this.spritesLoaded = false;
    this.patternIndex = 0;
    this.patternElapsed = 0;

    this.setupEventListeners();
    this.setupUI();
    this.loadSprites();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (!this.gameState.isRunning || this.gameState.isPaused) return;
      
      this.keys[e.key.toLowerCase()] = true;
      
      if (e.key.toLowerCase() === 'z') this.isShootingHeld = true;
      if (e.key.toLowerCase() === 'shift') this.isSlowHeld = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'z') this.isShootingHeld = false;
      if (e.key.toLowerCase() === 'shift') this.isSlowHeld = false;
    });

    // Game button (RSS button now opens game)
    document.getElementById('nav-rss-link')?.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default RSS link behavior
      this.startGame();
    });

    // Game controls
    document.getElementById('game-close-btn')?.addEventListener('click', () => {
      this.endGame();
    });

    document.getElementById('game-pause-btn')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('game-restart-btn')?.addEventListener('click', () => {
      this.restartGame();
    });
  }

  private setupUI(): void {
    const overlay = document.getElementById('touhou-game-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  private loadSprites(): void {
    // Load Reimu sprite sheet (4x4 grid = 16 frames total)
    const reimuSprite = new Image();
    reimuSprite.onload = () => {
      this.player.sprite = reimuSprite;
      this.player.spriteWidth = reimuSprite.width;
      this.player.spriteHeight = reimuSprite.height;
      this.spritesLoaded = true;
      console.log('Reimu sprite loaded:', reimuSprite.width, 'x', reimuSprite.height);
    };
    reimuSprite.onerror = () => {
      console.log('Reimu sprite not found, using fallback');
      this.spritesLoaded = true;
    };
    reimuSprite.src = '/images/game-sprites/reimu.png';

    // Load Fairy sprite sheet (3x8 grid = 24 frames total)
    const fairySprite = new Image();
    fairySprite.onload = () => {
      // Store fairy sprite globally for enemies
      (this as any).fairySprite = fairySprite;
      (this as any).fairySpriteWidth = fairySprite.width;
      (this as any).fairySpriteHeight = fairySprite.height;
      console.log('Fairy sprite loaded:', fairySprite.width, 'x', fairySprite.height);
    };
    fairySprite.onerror = () => {
      console.log('Fairy sprite not found, using fallback');
    };
    fairySprite.src = '/images/game-sprites/fairy.png';
  }

  private startGame(): void {
    const overlay = document.getElementById('touhou-game-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.gameState.score = 0;
    this.gameState.lives = 3;
    this.gameState.level = 1;

    this.player.x = this.canvas.width / 2 - 16;
    this.player.y = this.canvas.height - 70;
    this.player.bullets = [];

    this.enemies = [];
    this.particles = [];
    this.enemySpawnTimer = 0;
    // Spawn a single boss at the top center
    this.boss = {
      x: this.canvas.width / 2 - 48,
      y: 40,
      width: 96,
      height: 96,
      health: 1000,
      maxHealth: 1000,
      bullets: [],
      sprite: null
    };
    this.patternIndex = 0;
    this.patternElapsed = 0;
    // Load boss sprite if available
    const bossImg = new Image();
    bossImg.onload = () => {
      if (this.boss) this.boss.sprite = bossImg;
    };
    bossImg.onerror = () => {
      // Fallback rectangle draw
    };
    bossImg.src = '/images/taichi.png';

    this.updateUI();
    this.gameLoop();
  }

  private endGame(): void {
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;

    const overlay = document.getElementById('touhou-game-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private togglePause(): void {
    if (!this.gameState.isRunning) return;
    
    this.gameState.isPaused = !this.gameState.isPaused;
    
    if (!this.gameState.isPaused) {
      this.gameLoop();
    }
  }

  private restartGame(): void {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
      gameOverScreen.classList.add('hidden');
    }
    this.startGame();
  }

  private gameLoop(): void {
    if (!this.gameState.isRunning || this.gameState.isPaused) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.updatePlayer(deltaTime);
    this.updateBoss(deltaTime);
    this.updateBullets();
    this.updateParticles(deltaTime);
    this.updateCollisions();
  }

  private updatePlayer(deltaTime: number): void {
    let isMoving = false;
    
    // Movement
    const speed = this.isSlowHeld ? this.player.speed * 0.4 : this.player.speed;
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.player.x = Math.max(0, this.player.x - speed);
      isMoving = true;
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + speed);
      isMoving = true;
    }
    if (this.keys['arrowup'] || this.keys['w']) {
      this.player.y = Math.max(0, this.player.y - speed);
      isMoving = true;
    }
    if (this.keys['arrowdown'] || this.keys['s']) {
      this.player.y = Math.min(this.canvas.height - this.player.height, this.player.y + speed);
      isMoving = true;
    }

    // Update animation type based on movement
    if (isMoving && this.player.animationType !== 'move') {
      this.player.animationType = 'move';
      this.player.currentRow = 1; // Row 1 for movement animation
      this.player.currentFrame = 0;
    } else if (!isMoving && this.player.animationType !== 'idle') {
      this.player.animationType = 'idle';
      this.player.currentRow = 0; // Row 0 for idle animation
      this.player.currentFrame = 0;
    }

    // Hold-to-shoot
    if (this.isShootingHeld) this.playerShoot();

    // Update player animation
    this.updateAnimation(this.player, deltaTime);
  }

  private updateBoss(deltaTime: number): void {
    if (!this.boss) return;
    // Horizontal float movement
    this.boss.x = this.canvas.width / 2 - this.boss.width / 2 + Math.sin(performance.now() / 800) * 80;
    // Pattern scheduling
    this.patternElapsed += deltaTime;
    const patterns: BossPattern[] = DefaultBossScript;
    if (patterns.length > 0) {
      const current = patterns[this.patternIndex % patterns.length];
      // spawn bullets for this tick
      const ctx: PatternContext = {
        bossPos: { x: this.boss.x + this.boss.width / 2, y: this.boss.y + this.boss.height / 2 },
        playerPos: { x: this.player.x + this.player.width / 2, y: this.player.y + this.player.height / 2 },
        tick: this.patternElapsed
      };
      const bullets = current.spawn(ctx);
      bullets.forEach(b => {
        const vx = Math.cos(b.angleRad) * b.speed;
        const vy = Math.sin(b.angleRad) * b.speed;
        this.boss!.bullets.push({
          x: b.position.x,
          y: b.position.y,
          width: b.width,
          height: b.height,
          speed: b.speed,
          type: 'enemy',
          vx,
          vy
        });
      });
      if (this.patternElapsed >= current.duration) {
        this.patternIndex++;
        this.patternElapsed = 0;
      }
    }
  }

  private updateBullets(): void {
    // Update player bullets
    this.player.bullets = this.player.bullets.filter(bullet => {
      if (typeof bullet.vx === 'number' && typeof bullet.vy === 'number') {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
      } else {
        bullet.y -= bullet.speed;
      }
      return bullet.y > -bullet.height && bullet.x >= -20 && bullet.x <= this.canvas.width + 20;
    });

    // Update boss bullets
    if (this.boss) {
      this.boss.bullets = this.boss.bullets.filter(bullet => {
        if (typeof bullet.vx === 'number' && typeof bullet.vy === 'number') {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
        } else {
          bullet.y += bullet.speed;
        }
        return bullet.y < this.canvas.height + bullet.height && bullet.y > -bullet.height - 10;
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx * deltaTime * 0.1;
      particle.y += particle.vy * deltaTime * 0.1;
      particle.life -= deltaTime;
      
      return particle.life > 0;
    });
  }

  private updateCollisions(): void {
    // Player bullets vs enemies
    this.player.bullets.forEach((bullet, bulletIndex) => {
      this.enemies.forEach((enemy, enemyIndex) => {
        if (this.checkCollision(bullet, enemy)) {
          this.player.bullets.splice(bulletIndex, 1);
          enemy.health--;
          
          // Create explosion particles
          this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          
          if (enemy.health <= 0) {
            this.enemies.splice(enemyIndex, 1);
            this.gameState.score += 100;
            this.updateUI();
          }
        }
      });
    });

    // Boss bullets vs player
    if (this.boss) {
      this.boss.bullets.forEach((bullet, bulletIndex) => {
        const hitbox = {
          x: this.player.x + this.player.width / 2 - this.playerHitboxRadius,
          y: this.player.y + this.player.height / 2 - this.playerHitboxRadius,
          width: this.playerHitboxRadius * 2,
          height: this.playerHitboxRadius * 2,
        };
        if (this.checkCollision(bullet, hitbox)) { // chỉ khi dính vào chấm giữa
          this.boss!.bullets.splice(bulletIndex, 1);
          // Apply iFrames so only one life per hit
          const now = Date.now();
          if (now >= this.invulnerableUntil) {
            this.gameState.lives--;
            this.invulnerableUntil = now + 1200; // 1.2s invulnerability
            this.updateUI();
            this.createExplosion(
              hitbox.x + this.playerHitboxRadius, hitbox.y + this.playerHitboxRadius
            );
            if (this.gameState.lives <= 0) this.gameOver();
          }
        }
      });
    }

    // Player bullets vs boss
    if (this.boss) {
      this.player.bullets.forEach((bullet, bulletIndex) => {
        if (this.checkCollision(bullet, { x: this.boss!.x, y: this.boss!.y, width: this.boss!.width, height: this.boss!.height })) {
          this.player.bullets.splice(bulletIndex, 1);
          this.boss!.health -= 1;
          if (this.boss!.health <= 0) {
            this.createExplosion(this.boss!.x + this.boss!.width / 2, this.boss!.y + this.boss!.height / 2);
            this.boss = null;
            this.gameOver();
          }
        }
      });
    }
  }

  // Enemy spawns removed in boss mode

  private spawnEnemy(): void {
    const enemy: Enemy = {
      x: Math.random() * (this.canvas.width - 32),
      y: -40,
      width: 32,
      height: 40,
      speed: 1 + Math.random() * 2,
      bullets: [],
      lastShot: 0,
      shootCooldown: 1000 + Math.random() * 2000,
      health: 1,
      maxHealth: 1,
      sprite: (this as any).fairySprite || null,
      spriteWidth: (this as any).fairySpriteWidth || 0,
      spriteHeight: (this as any).fairySpriteHeight || 0,
      frameWidth: 32,
      frameHeight: 40,
      currentFrame: 0,
      animationSpeed: 200,
      lastFrameTime: 0,
      totalFrames: 8, // Frames per row for fairy
      framesPerRow: 8,
      currentRow: 0, // Start with idle animation (row 0)
      animationType: 'idle'
    };
    
    this.enemies.push(enemy);
  }

  private playerShoot(): void {
    if (Date.now() - this.player.lastShot < this.player.shootCooldown) return;
  
    // 2 dòng đạn auto-aim về phía boss
    if (this.boss) {
      for (let i = 0; i < 2; i++) {
        const offsetX = (i === 0 ? -5 : 5);
        // Xác định góc bắn về phía boss
        const fromX = this.player.x + this.player.width / 2 + offsetX;
        const fromY = this.player.y;
        const toX = this.boss.x + this.boss.width / 2;
        const toY = this.boss.y + this.boss.height / 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const speed = 7; // Giữ speed cao hơn boss
        this.player.bullets.push({
          x: fromX,
          y: fromY,
          width: 4,
          height: 8,
          speed: speed,
          type: 'player',
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      }
      this.player.lastShot = Date.now();
    } else {
      // Nếu chưa có boss thì bắn thường như cũ
      const bullet = {
        x: this.player.x + this.player.width / 2 - 2,
        y: this.player.y,
        width: 4,
        height: 8,
        speed: 7,
        type: 'player',
        vx: 0,
        vy: -7,
      };
      this.player.bullets.push(bullet);
      this.player.lastShot = Date.now();
    }
  }

  // enemyShoot removed, boss patterns handle shooting

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private updateAnimation(character: Player | Enemy, deltaTime: number): void {
    if (Date.now() - character.lastFrameTime > character.animationSpeed) {
      character.currentFrame = (character.currentFrame + 1) % character.framesPerRow;
      character.lastFrameTime = Date.now();
    }
  }

  private createExplosion(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const particle: Particle = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 1000,
        maxLife: 1000,
        color: `hsl(${Math.random() * 60 + 300}, 100%, 50%)`,
        size: Math.random() * 4 + 2
      };
      
      this.particles.push(particle);
    }
  }

  private gameOver(): void {
    this.gameState.isRunning = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScore = document.getElementById('final-score');
    
    if (gameOverScreen) {
      gameOverScreen.classList.remove('hidden');
    }
    
    if (finalScore) {
      finalScore.textContent = this.gameState.score.toString();
    }
  }

  private updateUI(): void {
    const scoreElement = document.getElementById('game-score');
    const livesElement = document.getElementById('game-lives');
    
    if (scoreElement) {
      scoreElement.textContent = this.gameState.score.toString();
    }
    
    if (livesElement) {
      livesElement.textContent = this.gameState.lives.toString();
    }
  }

  private render(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background stars
    this.drawStars();
    
    // Draw player
    this.drawPlayer();
    
    // Draw boss
    if (this.boss) this.drawBoss(this.boss);
    
    // Draw bullets
    this.player.bullets.forEach(bullet => this.drawBullet(bullet));
    if (this.boss) this.boss.bullets.forEach(bullet => this.drawBullet(bullet));
    
    // Draw particles
    this.particles.forEach(particle => this.drawParticle(particle));

    // Draw boss HP bar
    if (this.boss) this.drawBossHpBar(this.boss);
  }

  private drawStars(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.canvas.width;
      const y = (i * 23) % this.canvas.height;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  private drawPlayer(): void {
    if (this.player.sprite) {
      // Draw sprite animation (4x4 grid for Reimu)
      const frameX = this.player.currentFrame * this.player.frameWidth;
      const frameY = this.player.currentRow * this.player.frameHeight;
      
      this.ctx.drawImage(
        this.player.sprite,
        frameX, frameY, this.player.frameWidth, this.player.frameHeight,
        this.player.x, this.player.y, this.player.width, this.player.height
      );
    } else {
      // Fallback: Draw Reimu (simple sprite for now)
      this.ctx.fillStyle = '#ff0066';
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      
      // Draw player glow effect
      this.ctx.shadowColor = '#ff0066';
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = '#ff3399';
      this.ctx.fillRect(this.player.x + 4, this.player.y + 4, this.player.width - 8, this.player.height - 8);
      this.ctx.shadowBlur = 0;
    }
    // Vẽ hitbox (dù có sprite hay không)
    const hitboxX = this.player.x + this.player.width / 2;
    const hitboxY = this.player.y + this.player.height / 2;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(hitboxX, hitboxY, this.playerHitboxRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#ffffffcc';
    this.ctx.strokeStyle = '#ff0066';
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    if (enemy.sprite) {
      // Draw sprite animation (3x8 grid for Fairy)
      const frameX = enemy.currentFrame * enemy.frameWidth;
      const frameY = enemy.currentRow * enemy.frameHeight;
      
      this.ctx.drawImage(
        enemy.sprite,
        frameX, frameY, enemy.frameWidth, enemy.frameHeight,
        enemy.x, enemy.y, enemy.width, enemy.height
      );
    } else {
      // Fallback: Draw Fairy (simple sprite for now)
      this.ctx.fillStyle = '#00ff66';
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      
      // Draw enemy glow effect
      this.ctx.shadowColor = '#00ff66';
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = '#33ff99';
      this.ctx.fillRect(enemy.x + 4, enemy.y + 4, enemy.width - 8, enemy.height - 8);
      this.ctx.shadowBlur = 0;
    }
  }

  private drawBoss(boss: Boss): void {
    if (boss.sprite) {
      this.ctx.drawImage(boss.sprite, boss.x, boss.y, boss.width, boss.height);
    } else {
      this.ctx.fillStyle = '#7e57c2';
      this.ctx.shadowColor = '#b388ff';
      this.ctx.shadowBlur = 12;
      this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
      this.ctx.shadowBlur = 0;
    }
  }

  private drawBullet(bullet: Bullet): void {
    if (bullet.type === 'player') {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.shadowColor = '#ffff00';
      this.ctx.shadowBlur = 5;
    } else {
      this.ctx.fillStyle = '#ff6600';
      this.ctx.shadowColor = '#ff6600';
      this.ctx.shadowBlur = 5;
    }
    
    this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    this.ctx.shadowBlur = 0;
  }

  private drawBossHpBar(boss: Boss): void {
    const margin = 16;
    const barWidth = this.canvas.width - margin * 2;
    const barHeight = 10;
    const ratio = Math.max(0, boss.health) / boss.maxHealth;
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.fillRect(margin, margin, barWidth, barHeight);
    this.ctx.fillStyle = '#ff4081';
    this.ctx.fillRect(margin, margin, barWidth * ratio, barHeight);
  }

  private drawParticle(particle: Particle): void {
    const alpha = particle.life / particle.maxLife;
    this.ctx.fillStyle = particle.color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    this.ctx.globalAlpha = 1;
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TouhouGame();
});
