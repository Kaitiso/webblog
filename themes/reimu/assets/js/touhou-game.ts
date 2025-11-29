// Touhou Mini Game - Scrolling Shooter Version
interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  lives: number;
  scrollY: number;
  maxScrollY: number;
  bossPhase: boolean;
  nextExtend: number;
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
  frameWidth: number;
  frameHeight: number;
  currentFrame: number;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'player' | 'enemy';
  bulletType: number;
  vx?: number;
  vy?: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  bullets: Bullet[];
  lastShot: number;
  shootCooldown: number;
  sprite: HTMLImageElement | null;
  fairyType: number;
  currentFrame: number;
  animationSpeed: number;
  lastFrameTime: number;
  patternType: number;
  movementType: number;
  spawnTime: number;
  targetX?: number;
  targetY?: number;
  isStationary?: boolean;
}

interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  bullets: Bullet[];
  lastShot: number;
  sprite: HTMLImageElement | null;
  phase: number;
  currentFrame: number;
  animationSpeed: number;
  lastFrameTime: number;
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
  private enemies: Enemy[];
  private boss: Boss | null;
  private particles: Particle[];
  private orphanBullets: Bullet[]; // Bullets from dead enemies
  private keys: { [key: string]: boolean };
  private isShootingHeld: boolean;
  private isSlowHeld: boolean;
  private animationId: number;
  private lastTime: number;
  private enemySpawnTimer: number;
  private playerHitboxRadius = 4;
  
  // Sprites
  private bgSprite: HTMLImageElement | null;
  private bulletSprite: HTMLImageElement | null;
  private fairySprites: (HTMLImageElement | null)[];
  private bossSprite: HTMLImageElement | null;
  
  // Audio
  private stageMusicAudio: HTMLAudioElement | null;
  private bossMusicAudio: HTMLAudioElement | null;

  constructor() {
    this.canvas = document.getElementById('touhou-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Disable image smoothing for crisp pixel art
    this.ctx.imageSmoothingEnabled = false;

    
    this.gameState = {
      isRunning: false,
      isPaused: false,
      score: 0,
      lives: 5,
      scrollY: 1920, // Start from very bottom of background
      maxScrollY: 1920,
      bossPhase: false,
      nextExtend: 4000
    };

    this.player = {
      x: this.canvas.width / 2 - 30,
      y: this.canvas.height - 120,
      width: 60,
      height: 78,
      speed: 5,
      bullets: [],
      lastShot: 0,
      shootCooldown: 80,
      sprite: null,
      frameWidth: 167,
      frameHeight: 218,
      currentFrame: 0
    };

    this.enemies = [];
    this.boss = null;
    this.particles = [];
    this.orphanBullets = [];
    this.keys = {};
    this.isShootingHeld = false;
    this.isSlowHeld = false;
    this.animationId = 0;
    this.lastTime = 0;
    this.enemySpawnTimer = 0;
    
    this.bgSprite = null;
    this.bulletSprite = null;
    this.fairySprites = [null, null, null, null];
    this.bossSprite = null;
    this.stageMusicAudio = null;
    this.bossMusicAudio = null;

    this.setupEventListeners();
    this.setupUI();
    this.loadSprites();
  }

  private loadSprites(): void {
    // Background
    const bg = new Image();
    bg.onload = () => { this.bgSprite = bg; };
    bg.src = '/images/game-sprites/background/bgstage.png';


    // Reimu
    const reimu = new Image();
    reimu.onload = () => { this.player.sprite = reimu; };
    reimu.src = '/images/game-sprites/reimu98.png';

    // Bullets
    const bullet = new Image();
    bullet.onload = () => { 
      this.bulletSprite = bullet;
      console.log('Bullet sprite loaded:', bullet.width, 'x', bullet.height);
    };
    bullet.onerror = () => {
      console.error('Failed to load bullet sprite');
    };
    bullet.src = '/images/game-sprites/bullet/bullet.png';

    // Fairies
    for (let i = 0; i < 4; i++) {
      const fairy = new Image();
      fairy.onload = () => { this.fairySprites[i] = fairy; };
      fairy.src = `/images/game-sprites/fairy/fairy${i + 1}.png`;
    }

    // Boss (Alice)
    const boss = new Image();
    boss.onload = () => { this.bossSprite = boss; };
    boss.src = '/images/game-sprites/boss/boss3.png';
  }

  private setupEventListeners(): void {
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

    document.getElementById('nav-rss-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.startGame();
    });


    document.getElementById('game-close-btn')?.addEventListener('click', () => {
      this.endGame();
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

  private startGame(): void {
    const overlay = document.getElementById('touhou-game-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    this.gameState.isRunning = true;
    this.gameState.isPaused = false;
    this.gameState.score = 0;
    this.gameState.lives = 5;
    this.gameState.scrollY = 1920; // Start from very bottom
    this.gameState.bossPhase = false;
    this.gameState.nextExtend = 4000;
    
    this.player.x = this.canvas.width / 2 - 25;
    this.player.y = this.canvas.height - 100;
    this.player.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.orphanBullets = [];
    this.enemySpawnTimer = 0;

    this.updateUI();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
    
    // Play stage music
    this.playStageMusic();
  }


  private playStageMusic(): void {
    if (this.stageMusicAudio) {
      this.stageMusicAudio.pause();
      this.stageMusicAudio.currentTime = 0;
    }
    this.stageMusicAudio = new Audio('/audio/stage3.mp3');
    this.stageMusicAudio.loop = true;
    this.stageMusicAudio.volume = 0.5;
    this.stageMusicAudio.play().catch(() => {});
  }

  private playBossMusic(): void {
    if (this.stageMusicAudio) {
      this.stageMusicAudio.pause();
    }
    if (this.bossMusicAudio) {
      this.bossMusicAudio.pause();
      this.bossMusicAudio.currentTime = 0;
    }
    this.bossMusicAudio = new Audio('/audio/boss.mp3');
    this.bossMusicAudio.loop = true;
    this.bossMusicAudio.volume = 0.6;
    this.bossMusicAudio.play().catch(() => {});
  }

  private endGame(): void {
    this.gameState.isRunning = false;
    cancelAnimationFrame(this.animationId);
    
    if (this.stageMusicAudio) this.stageMusicAudio.pause();
    if (this.bossMusicAudio) this.bossMusicAudio.pause();

    const overlay = document.getElementById('touhou-game-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  private restartGame(): void {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
      gameOverScreen.classList.add('hidden');
    }
    this.startGame();
  }


  private gameLoop(currentTime: number): void {
    if (!this.gameState.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  private update(deltaTime: number): void {
    this.updatePlayer(deltaTime);
    this.updateBullets();
    this.updateEnemies(deltaTime);
    this.updateParticles();
    
    if (!this.gameState.bossPhase) {
      this.updateScroll(deltaTime);
      this.spawnEnemies(deltaTime);
    } else {
      this.updateBoss(deltaTime);
    }
    
    this.checkCollisions();
  }
  
  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updatePlayer(deltaTime: number): void {
    let movingLeft = false;
    let movingRight = false;
    
    const speed = this.isSlowHeld ? this.player.speed * 0.4 : this.player.speed;
    
    if (this.keys['arrowleft'] || this.keys['a']) {
      this.player.x = Math.max(0, this.player.x - speed);
      movingLeft = true;
    }
    if (this.keys['arrowright'] || this.keys['d']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + speed);
      movingRight = true;
    }
    if (this.keys['arrowup'] || this.keys['w']) {
      this.player.y = Math.max(0, this.player.y - speed);
    }
    if (this.keys['arrowdown'] || this.keys['s']) {
      this.player.y = Math.min(this.canvas.height - this.player.height, this.player.y + speed);
    }

    // Update sprite frame
    if (movingLeft && !movingRight) {
      this.player.currentFrame = 1;
    } else if (movingRight && !movingLeft) {
      this.player.currentFrame = 2;
    } else {
      this.player.currentFrame = 0;
    }

    if (this.isShootingHeld) this.playerShoot();
  }

  private playerShoot(): void {
    const now = Date.now();
    if (now - this.player.lastShot < this.player.shootCooldown) return;

    const centerX = this.player.x + this.player.width / 2;
    const topY = this.player.y;
    const speed = 12;
    
    // 3 straight bullets from top (center, left, right)
    for (let i = -1; i <= 1; i++) {
      this.player.bullets.push({
        x: centerX - 4 + i * 15,
        y: topY,
        width: 8,
        height: 16,
        speed: speed,
        type: 'player',
        bulletType: 0,
        vx: 0,
        vy: -speed
      });
    }
    
    // 2 homing bullets from sides (left and right)
    let targetX = centerX;
    let targetY = 0;
    
    if (this.boss) {
      targetX = this.boss.x + this.boss.width / 2;
      targetY = this.boss.y + this.boss.height / 2;
    } else if (this.enemies.length > 0) {
      const nearest = this.enemies[0];
      targetX = nearest.x + nearest.width / 2;
      targetY = nearest.y + nearest.height / 2;
    }
    
    // Left homing bullet
    const leftX = this.player.x;
    const leftY = this.player.y + this.player.height / 2;
    let dx = targetX - leftX;
    let dy = targetY - leftY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    this.player.bullets.push({
      x: leftX - 4,
      y: leftY,
      width: 8,
      height: 16,
      speed: speed,
      type: 'player',
      bulletType: 0,
      vx: dist > 0 ? (dx / dist) * speed : 0,
      vy: dist > 0 ? (dy / dist) * speed : -speed
    });
    
    // Right homing bullet
    const rightX = this.player.x + this.player.width;
    const rightY = this.player.y + this.player.height / 2;
    dx = targetX - rightX;
    dy = targetY - rightY;
    dist = Math.sqrt(dx * dx + dy * dy);
    
    this.player.bullets.push({
      x: rightX - 4,
      y: rightY,
      width: 8,
      height: 16,
      speed: speed,
      type: 'player',
      bulletType: 0,
      vx: dist > 0 ? (dx / dist) * speed : 0,
      vy: dist > 0 ? (dy / dist) * speed : -speed
    });

    this.player.lastShot = now;
  }

  private updateScroll(deltaTime: number): void {
    if (this.gameState.scrollY > 0) {
      this.gameState.scrollY -= 0.12; // Scroll up slowly
      if (this.gameState.scrollY < 0) this.gameState.scrollY = 0;
    } else if (!this.gameState.bossPhase) {
      console.log('Spawning boss! ScrollY:', this.gameState.scrollY);
      this.gameState.bossPhase = true;
      this.spawnBoss();
      this.playBossMusic();
    }
  }


  private spawnEnemies(deltaTime: number): void {
    this.enemySpawnTimer += deltaTime;
    
    if (this.enemySpawnTimer > 500) { // Spawn very frequently
      this.enemySpawnTimer = 0;
      
      const spawnPos = Math.random();
      let x, vx, vy;
      
      if (spawnPos < 0.33) {
        x = Math.random() * 80;
        vx = 0.5;
      } else if (spawnPos < 0.66) {
        x = this.canvas.width / 2 - 20 + (Math.random() - 0.5) * 100;
        vx = 0;
      } else {
        x = this.canvas.width - 80 - Math.random() * 80;
        vx = -0.5;
      }
      
      const fairyType = Math.floor(Math.random() * 4);
      const patternType = Math.floor(Math.random() * 10); // 10 patterns now
      const movementType = Math.floor(Math.random() * 6); // 6 movement types
      
      // Movement speed based on type
      if (movementType === 0) vy = 0.8; // Slow
      else if (movementType === 1) vy = 2.5; // Fast
      else if (movementType === 4 || movementType === 5) vy = 1.2; // Stop and circle
      else vy = 1.5; // Normal
      
      const targetY = movementType === 4 ? 150 + Math.random() * 100 : undefined;
      
      // Health scales with scrollY position
      // scrollY=1920 (bottom/start): 4 HP
      // scrollY=960 (middle): ~12 HP
      // scrollY=0 (top/boss): 24 HP
      const progress = 1 - (this.gameState.scrollY / 1920); // 0 at start, 1 at boss
      const maxHealth = Math.floor(4 + progress * 20); // 4 to 24 health
      
      this.enemies.push({
        x: x,
        y: -50,
        width: 44,
        height: 44,
        vx: vx,
        vy: vy,
        health: maxHealth,
        maxHealth: maxHealth,
        bullets: [],
        lastShot: Date.now(),
        shootCooldown: 1200 + Math.random() * 800,
        sprite: this.fairySprites[fairyType],
        fairyType: fairyType,
        currentFrame: 0,
        animationSpeed: 150,
        lastFrameTime: Date.now(),
        patternType: patternType,
        movementType: movementType,
        spawnTime: Date.now(),
        targetY: targetY,
        isStationary: false
      });
    }
  }


  private updateEnemies(deltaTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const timeAlive = Date.now() - enemy.spawnTime;
      
      // Movement patterns
      if (enemy.movementType === 0) {
        // Slow straight down
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
      } else if (enemy.movementType === 1) {
        // Fast straight down
        enemy.y += enemy.vy;
      } else if (enemy.movementType === 2) {
        // Arc movement
        enemy.x += Math.sin(timeAlive / 500) * 2;
        enemy.y += enemy.vy;
      } else if (enemy.movementType === 3) {
        // Zigzag
        enemy.x += Math.sin(timeAlive / 200) * 3;
        enemy.y += enemy.vy;
      } else if (enemy.movementType === 4) {
        // Move then stop and circle
        if (enemy.targetY && enemy.y < enemy.targetY) {
          enemy.y += enemy.vy;
        } else {
          enemy.isStationary = true;
          enemy.x += Math.cos(timeAlive / 300) * 2;
          enemy.y += Math.sin(timeAlive / 300) * 2;
        }
      } else {
        // Stop then circle multiple times
        if (timeAlive < 1000) {
          enemy.y += enemy.vy;
        } else {
          enemy.isStationary = true;
          const radius = 30;
          const speed = timeAlive / 400;
          enemy.x += Math.cos(speed) * 1.5;
          enemy.y += Math.sin(speed) * 1.5;
        }
      }
      
      // Animation
      if (Date.now() - enemy.lastFrameTime > enemy.animationSpeed) {
        enemy.currentFrame = (enemy.currentFrame + 1) % 4;
        enemy.lastFrameTime = Date.now();
      }
      
      // Shoot
      if (Date.now() - enemy.lastShot > enemy.shootCooldown) {
        this.enemyShoot(enemy);
        enemy.lastShot = Date.now();
      }
      
      // Remove if off screen or dead
      if (enemy.y > this.canvas.height + 50 || enemy.health <= 0) {
        if (enemy.health <= 0) {
          // Transfer bullets to orphan bullets so they continue
          this.orphanBullets.push(...enemy.bullets);
          this.gameState.score += 100;
          this.updateUI();
        }
        this.enemies.splice(i, 1);
      }
    }
  }

  private enemyShoot(enemy: Enemy): void {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    const enemyCenterX = enemy.x + enemy.width / 2;
    const enemyCenterY = enemy.y + enemy.height / 2;
    
    if (enemy.patternType === 0) {
      // Straight down
      enemy.bullets.push({
        x: enemyCenterX - 6,
        y: enemyCenterY,
        width: 12,
        height: 12,
        speed: 2.5,
        type: 'enemy',
        bulletType: enemy.fairyType,
        vx: 0,
        vy: 2.5
      });
    }
 else if (enemy.patternType === 1) {
      // Aimed at player
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 2.5;
      
      enemy.bullets.push({
        x: enemyCenterX - 6,
        y: enemyCenterY,
        width: 12,
        height: 12,
        speed: speed,
        type: 'enemy',
        bulletType: (enemy.fairyType + 1) % 8,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed
      });
    } else if (enemy.patternType === 2) {
      // Spread pattern (3 bullets)
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI / 2) + (i - 1) * 0.4;
        const speed = 2;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 2) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 3) {
      // Circle pattern (5 bullets)
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        const speed = 1.8;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 3) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 4) {
      // Double aimed (2 bullets slightly offset)
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const speed = 2.2;
      
      for (let i = 0; i < 2; i++) {
        const offsetAngle = (i - 0.5) * 0.2;
        const angle = Math.atan2(dy, dx) + offsetAngle;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 4) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 5) {
      // Laser (line of bullets)
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const angle = Math.atan2(dy, dx);
      const speed = 3;
      
      for (let i = 0; i < 4; i++) {
        enemy.bullets.push({
          x: enemyCenterX - 6 + Math.cos(angle) * i * 15,
          y: enemyCenterY - 6 + Math.sin(angle) * i * 15,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 5) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 6) {
      // Flower pattern (8 bullets in circle)
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Date.now() / 1000;
        const speed = 1.5;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 6) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 7) {
      // Wave pattern (5 bullets in wave)
      for (let i = 0; i < 5; i++) {
        const baseAngle = Math.PI / 2;
        const waveOffset = Math.sin(Date.now() / 200 + i) * 0.5;
        const angle = baseAngle + (i - 2) * 0.2 + waveOffset;
        const speed = 2;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType + 7) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (enemy.patternType === 8) {
      // Cross pattern (4 directions)
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i;
        const speed = 2.5;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (enemy.fairyType) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else {
      // Random spray (6 bullets random directions)
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 1.5;
        
        enemy.bullets.push({
          x: enemyCenterX - 6,
          y: enemyCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: Math.floor(Math.random() * 8),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    }
  }

  private spawnBoss(): void {
    // Alice sprite: 273x70 per frame (4 frames horizontal)
    // Each frame: 68.25x70 (width < height)
    // Scale to 50x70 for better proportion
    this.boss = {
      x: this.canvas.width / 2 - 25,
      y: 70,
      width: 50,
      height: 70,
      health: 3000, // Boss health
      maxHealth: 3000,
      bullets: [],
      lastShot: Date.now(),
      sprite: this.bossSprite,
      phase: 0,
      currentFrame: 0,
      animationSpeed: 200,
      lastFrameTime: Date.now()
    };
  }


  private updateBoss(deltaTime: number): void {
    if (!this.boss) return;
    
    // Boss movement patterns (changes every 4 seconds)
    const movementCycle = Math.floor(Date.now() / 4000) % 4;
    const time = Date.now() / 1000;
    
    if (movementCycle === 0) {
      // Horizontal sine wave
      this.boss.x += Math.sin(time) * 2;
    } else if (movementCycle === 1) {
      // Triangle pattern (left-right-center)
      const phase = (time % 3) / 3;
      if (phase < 0.33) {
        this.boss.x -= 1.5;
      } else if (phase < 0.66) {
        this.boss.x += 1.5;
      } else {
        const centerX = this.canvas.width / 2 - this.boss.width / 2;
        this.boss.x += (centerX - this.boss.x) * 0.05;
      }
    } else if (movementCycle === 2) {
      // Up and down
      this.boss.y = 70 + Math.sin(time * 2) * 30;
    } else {
      // Square pattern
      const phase = Math.floor((time % 4) / 1);
      const speed = 2;
      if (phase === 0) this.boss.x += speed; // Right
      else if (phase === 1) this.boss.y += speed * 0.5; // Down
      else if (phase === 2) this.boss.x -= speed; // Left
      else this.boss.y -= speed * 0.5; // Up
    }
    
    // Keep boss in bounds
    this.boss.x = Math.max(0, Math.min(this.canvas.width - this.boss.width, this.boss.x));
    this.boss.y = Math.max(50, Math.min(200, this.boss.y));
    
    // Boss animation
    if (Date.now() - this.boss.lastFrameTime > this.boss.animationSpeed) {
      this.boss.currentFrame = (this.boss.currentFrame + 1) % 4;
      this.boss.lastFrameTime = Date.now();
    }
    
    // Boss shoot
    const shootInterval = 400;
    if (Date.now() - this.boss.lastShot > shootInterval) {
      this.bossShoot();
      this.boss.lastShot = Date.now();
    }
    
    // Check boss defeated
    if (this.boss.health <= 0) {
      this.gameState.score += 10000;
      this.updateUI();
      this.showVictory();
    }
  }

  private bossShoot(): void {
    if (!this.boss) return;
    
    const bossCenterX = this.boss.x + this.boss.width / 2;
    const bossCenterY = this.boss.y + this.boss.height / 2;
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    
    // Change pattern based on time (cycles through patterns)
    const patternCycle = Math.floor(Date.now() / 2500) % 12; // Change every 2.5 seconds, 12 patterns
    
    if (patternCycle === 0) {
      // Phase 1: Circular pattern with bullet type 0
      const bulletCount = 12;
      for (let i = 0; i < bulletCount; i++) {
        const angle = (Math.PI * 2 / bulletCount) * i + Date.now() / 500;
        const speed = 6;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (patternCycle === 1) {
      // Phase 2: Double spiral with bullet types 1 & 2
      const bulletCount = 12;
      const spiralOffset = Date.now() / 100;
      for (let i = 0; i < bulletCount; i++) {
        const angle1 = (Math.PI * 2 / bulletCount) * i + spiralOffset;
        const angle2 = (Math.PI * 2 / bulletCount) * i - spiralOffset;
        const speed = 3;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: 1,
          vx: Math.cos(angle1) * speed,
          vy: Math.sin(angle1) * speed
        });
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: 2,
          vx: Math.cos(angle2) * speed,
          vy: Math.sin(angle2) * speed
        });
      }
    } else if (patternCycle === 2) {
      // Phase 3: Aimed lasers with bullet type 3
      const dx = playerCenterX - bossCenterX;
      const dy = playerCenterY - bossCenterY;
      const angle = Math.atan2(dy, dx);
      
      for (let i = 0; i < 5; i++) {
        const offsetAngle = angle + (i - 2) * 0.15;
        const speed = 4;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: 3,
          vx: Math.cos(offsetAngle) * speed,
          vy: Math.sin(offsetAngle) * speed
        });
      }
    } else if (patternCycle === 3) {
      // Phase 4: Cross pattern with bullet type 4
      const directions = 8;
      for (let i = 0; i < directions; i++) {
        const angle = (Math.PI * 2 / directions) * i;
        const speed = 2.8;
        
        for (let j = 0; j < 3; j++) {
          this.boss.bullets.push({
            x: bossCenterX - 6 + Math.cos(angle) * j * 20,
            y: bossCenterY - 6 + Math.sin(angle) * j * 20,
            width: 12,
            height: 12,
            speed: speed,
            type: 'enemy',
            bulletType: 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
          });
        }
      }
    } else if (patternCycle === 4) {
      // Phase 5: Flower burst with bullet types 5 & 6
      const layers = 2;
      for (let layer = 0; layer < layers; layer++) {
        const bulletCount = 12;
        const layerOffset = layer * Math.PI / 12;
        for (let i = 0; i < bulletCount; i++) {
          const angle = (Math.PI * 2 / bulletCount) * i + Date.now() / 400 + layerOffset;
          const speed = 2.2 + layer * 0.6;
          
          this.boss.bullets.push({
            x: bossCenterX - 6,
            y: bossCenterY - 6,
            width: 12,
            height: 12,
            speed: speed,
            type: 'enemy',
            bulletType: layer === 0 ? 5 : 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
          });
        }
      }
    } else if (patternCycle === 5) {
      // Pattern 6: Chaos pattern
      const bulletCount = 10;
      const time = Date.now() / 300;
      for (let i = 0; i < bulletCount; i++) {
        const angle = (Math.PI * 2 / bulletCount) * i + time;
        const speed = 2 + Math.sin(time + i) * 1.5;
        const bulletType = i % 2 === 0 ? 7 : Math.floor(Math.random() * 7);
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: bulletType,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (patternCycle === 6) {
      // Pattern 7: Dense circle
      const bulletCount = 12;
      for (let i = 0; i < bulletCount; i++) {
        const angle = (Math.PI * 2 / bulletCount) * i;
        const speed = 2;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: i % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (patternCycle === 7) {
      // Pattern 8: Wave aimed at player
      for (let i = 0; i < 7; i++) {
        const dx = playerCenterX - bossCenterX;
        const dy = playerCenterY - bossCenterY;
        const baseAngle = Math.atan2(dy, dx);
        const angle = baseAngle + (i - 3) * 0.15;
        const speed = 3;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: (i + 1) % 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (patternCycle === 8) {
      // Pattern 9: Triple spiral
      for (let layer = 0; layer < 3; layer++) {
        const bulletCount = 10;
        const offset = (Date.now() / 200) + layer * (Math.PI * 2 / 3);
        for (let i = 0; i < bulletCount; i++) {
          const angle = (Math.PI * 2 / bulletCount) * i + offset;
          const speed = 2 + layer * 0.5;
          
          this.boss.bullets.push({
            x: bossCenterX - 6,
            y: bossCenterY - 6,
            width: 12,
            height: 12,
            speed: speed,
            type: 'enemy',
            bulletType: (layer + 2) % 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
          });
        }
      }
    } else if (patternCycle === 9) {
      // Pattern 10: Random spray
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2;
        
        this.boss.bullets.push({
          x: bossCenterX - 6,
          y: bossCenterY - 6,
          width: 12,
          height: 12,
          speed: speed,
          type: 'enemy',
          bulletType: Math.floor(Math.random() * 8),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
    } else if (patternCycle === 10) {
      // Pattern 11: Flower burst (multiple expanding rings)
      const rings = 4;
      const bulletsPerRing = 12;
      const time = Date.now() / 1000;
      
      for (let ring = 0; ring < rings; ring++) {
        const ringOffset = ring * Math.PI / 8;
        for (let i = 0; i < bulletsPerRing; i++) {
          const angle = (Math.PI * 2 / bulletsPerRing) * i + time + ringOffset;
          const speed = 1.8 + ring * 0.4;
          
          this.boss.bullets.push({
            x: bossCenterX - 6,
            y: bossCenterY - 6,
            width: 12,
            height: 12,
            speed: speed,
            type: 'enemy',
            bulletType: ring % 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
          });
        }
      }
    } else {
      // Pattern 12: Spiral galaxy (continuous spiral)
      const arms = 3;
      const bulletsPerArm = 10;
      const time = Date.now() / 100;
      
      for (let arm = 0; arm < arms; arm++) {
        const armAngle = (Math.PI * 2 / arms) * arm;
        for (let i = 0; i < bulletsPerArm; i++) {
          const spiralAngle = armAngle + (i * 0.3) + time;
          const speed = 2.5;
          
          this.boss.bullets.push({
            x: bossCenterX - 6,
            y: bossCenterY - 6,
            width: 12,
            height: 12,
            speed: speed,
            type: 'enemy',
            bulletType: (arm + i) % 8,
            vx: Math.cos(spiralAngle) * speed,
            vy: Math.sin(spiralAngle) * speed
          });
        }
      }
    }
  }


  private updateBullets(): void {
    // Player bullets - remove when off screen (optimized)
    for (let i = this.player.bullets.length - 1; i >= 0; i--) {
      const bullet = this.player.bullets[i];
      bullet.x += bullet.vx!;
      bullet.y += bullet.vy!;
      
      // Remove if out of bounds (smaller buffer for performance)
      if (bullet.y < -10 || bullet.y > this.canvas.height + 10 || 
          bullet.x < -10 || bullet.x > this.canvas.width + 10) {
        this.player.bullets.splice(i, 1);
      }
    }
    
    // Enemy bullets - remove when off screen (optimized)
    for (const enemy of this.enemies) {
      for (let i = enemy.bullets.length - 1; i >= 0; i--) {
        const bullet = enemy.bullets[i];
        bullet.x += bullet.vx!;
        bullet.y += bullet.vy!;
        
        if (bullet.y < -10 || bullet.y > this.canvas.height + 10 || 
            bullet.x < -10 || bullet.x > this.canvas.width + 10) {
          enemy.bullets.splice(i, 1);
        }
      }
    }
    
    // Orphan bullets - remove when off screen (optimized)
    for (let i = this.orphanBullets.length - 1; i >= 0; i--) {
      const bullet = this.orphanBullets[i];
      bullet.x += bullet.vx!;
      bullet.y += bullet.vy!;
      
      if (bullet.y < -10 || bullet.y > this.canvas.height + 10 || 
          bullet.x < -10 || bullet.x > this.canvas.width + 10) {
        this.orphanBullets.splice(i, 1);
      }
    }
    
    // Boss bullets - remove when off screen (optimized)
    if (this.boss) {
      for (let i = this.boss.bullets.length - 1; i >= 0; i--) {
        const bullet = this.boss.bullets[i];
        bullet.x += bullet.vx!;
        bullet.y += bullet.vy!;
        
        if (bullet.y < -10 || bullet.y > this.canvas.height + 10 || 
            bullet.x < -10 || bullet.x > this.canvas.width + 10) {
          this.boss.bullets.splice(i, 1);
        }
      }
    }
  }

  private checkCollisions(): void {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    
    // Player bullets hit enemies
    for (const bullet of this.player.bullets) {
      for (const enemy of this.enemies) {
        if (this.checkRectCollision(bullet, enemy)) {
          enemy.health--;
          this.player.bullets.splice(this.player.bullets.indexOf(bullet), 1);
          break;
        }
      }
    }

    
    // Player bullets hit boss
    if (this.boss) {
      for (const bullet of this.player.bullets) {
        if (this.checkRectCollision(bullet, this.boss)) {
          this.boss.health--;
          this.player.bullets.splice(this.player.bullets.indexOf(bullet), 1);
          break;
        }
      }
    }
    
    // Enemy bullets hit player
    for (const enemy of this.enemies) {
      for (const bullet of enemy.bullets) {
        const dx = bullet.x + bullet.width / 2 - playerCenterX;
        const dy = bullet.y + bullet.height / 2 - playerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.playerHitboxRadius + bullet.width / 2) {
          this.playerHit();
          enemy.bullets.splice(enemy.bullets.indexOf(bullet), 1);
          break;
        }
      }
    }
    
    // Orphan bullets hit player
    for (let i = this.orphanBullets.length - 1; i >= 0; i--) {
      const bullet = this.orphanBullets[i];
      const dx = bullet.x + bullet.width / 2 - playerCenterX;
      const dy = bullet.y + bullet.height / 2 - playerCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.playerHitboxRadius + bullet.width / 2) {
        this.playerHit();
        this.orphanBullets.splice(i, 1);
        break;
      }
    }
    
    // Boss bullets hit player
    if (this.boss) {
      for (const bullet of this.boss.bullets) {
        const dx = bullet.x + bullet.width / 2 - playerCenterX;
        const dy = bullet.y + bullet.height / 2 - playerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.playerHitboxRadius + bullet.width / 2) {
          this.playerHit();
          this.boss.bullets.splice(this.boss.bullets.indexOf(bullet), 1);
          break;
        }
      }
    }
  }

  private checkRectCollision(a: any, b: any): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }


  private playerHit(): void {
    this.gameState.lives--;
    this.updateUI();
    
    // Create particles from cleared bullets
    for (const enemy of this.enemies) {
      for (const bullet of enemy.bullets) {
        this.createBulletClearEffect(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
      }
      enemy.bullets = [];
    }
    
    // Clear orphan bullets too
    for (const bullet of this.orphanBullets) {
      this.createBulletClearEffect(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
    }
    this.orphanBullets = [];
    
    if (this.boss) {
      for (const bullet of this.boss.bullets) {
        this.createBulletClearEffect(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
      }
      this.boss.bullets = [];
    }
    
    if (this.gameState.lives <= 0) {
      this.showGameOver();
    }
  }
  
  private createBulletClearEffect(x: number, y: number): void {
    // Create small flash effect at bullet position
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20,
        maxLife: 20,
        color: '#ffffff',
        size: 3
      });
    }
  }

  private showGameOver(): void {
    this.gameState.isRunning = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScore = document.getElementById('final-score');
    
    if (gameOverScreen && finalScore) {
      finalScore.textContent = this.gameState.score.toString();
      gameOverScreen.classList.remove('hidden');
    }
    
    if (this.stageMusicAudio) this.stageMusicAudio.pause();
    if (this.bossMusicAudio) this.bossMusicAudio.pause();
  }

  private showVictory(): void {
    this.gameState.isRunning = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScore = document.getElementById('final-score');
    const gameOverTitle = gameOverScreen?.querySelector('h2');
    
    if (gameOverScreen && finalScore && gameOverTitle) {
      gameOverTitle.textContent = 'Victory!';
      finalScore.textContent = this.gameState.score.toString();
      gameOverScreen.classList.remove('hidden');
    }
    
    if (this.bossMusicAudio) this.bossMusicAudio.pause();
  }

  private updateUI(): void {
    const scoreEl = document.getElementById('game-score');
    const livesEl = document.getElementById('game-lives');
    
    if (scoreEl) scoreEl.textContent = this.gameState.score.toString().padStart(8, '0');
    if (livesEl) livesEl.textContent = '♥ '.repeat(this.gameState.lives);
    
    // Check for extend (every 4000 points)
    if (this.gameState.score >= this.gameState.nextExtend) {
      this.gameState.lives++;
      this.gameState.nextExtend += 4000;
      console.log('Extend! Lives:', this.gameState.lives);
    }
  }


  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawBackground();
    this.drawParticles();
    this.drawPlayer();
    this.drawEnemies();
    this.drawBoss();
    this.drawBullets();
  }
  
  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawBackground(): void {
    if (this.bgSprite) {
      const bgWidth = 225;
      const bgHeight = 1920;
      const scale = this.canvas.width / bgWidth; // Scale to fit canvas width (600/225 ≈ 2.67)
      const canvasHeightInBg = this.canvas.height / scale; // Canvas height in bg coordinates
      
      // Calculate source Y to show bottom part first
      // scrollY goes from 1920 (bottom) to 0 (top)
      // We want to show the part of bg that corresponds to scrollY
      const maxSourceY = bgHeight - canvasHeightInBg;
      const sourceY = Math.max(0, Math.min(maxSourceY, (this.gameState.scrollY / 1920) * maxSourceY));
      
      // Draw background scaled to fit canvas
      this.ctx.drawImage(
        this.bgSprite,
        0, sourceY, // Source Y position
        bgWidth, canvasHeightInBg, // Source dimensions
        0, 0, // Destination position
        this.canvas.width, this.canvas.height // Destination dimensions
      );
    } else {
      this.ctx.fillStyle = '#1a0033';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawPlayer(): void {
    if (this.player.sprite) {
      const frameX = this.player.currentFrame * this.player.frameWidth;
      
      this.ctx.drawImage(
        this.player.sprite,
        frameX, 0, this.player.frameWidth, this.player.frameHeight,
        this.player.x, this.player.y, this.player.width, this.player.height
      );
    } else {
      this.ctx.fillStyle = '#ff0066';
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    }
    
    // Hitbox
    const hitboxX = this.player.x + this.player.width / 2;
    const hitboxY = this.player.y + this.player.height / 2;
    this.ctx.beginPath();
    this.ctx.arc(hitboxX, hitboxY, this.playerHitboxRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#ffffffcc';
    this.ctx.strokeStyle = '#ff0066';
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();
  }


  private drawEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.sprite) {
        const frameWidth = 36.5;
        const frameX = enemy.currentFrame * frameWidth;
        
        this.ctx.drawImage(
          enemy.sprite,
          frameX, 0, frameWidth, 37,
          enemy.x, enemy.y, enemy.width, enemy.height
        );
      } else {
        this.ctx.fillStyle = '#00ff66';
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    }
  }

  private drawBoss(): void {
    if (!this.boss) return;
    
    if (this.boss.sprite) {
      const frameWidth = 68.25; // 273 / 4
      const frameX = this.boss.currentFrame * frameWidth;
      
      this.ctx.drawImage(
        this.boss.sprite,
        frameX, 0, frameWidth, 70,
        this.boss.x, this.boss.y, this.boss.width, this.boss.height
      );
    } else {
      this.ctx.fillStyle = '#ff00ff';
      this.ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);
    }
    
    // Boss health bar (longer and thicker)
    const barWidth = this.canvas.width - 100;
    const barHeight = 15;
    const barX = 50;
    const barY = 20;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Dark bar
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar with gradient
    const healthPercent = this.boss.health / this.boss.maxHealth;
    const gradient = this.ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (healthPercent > 0.5) {
      gradient.addColorStop(0, '#ff0066');
      gradient.addColorStop(1, '#ff3399');
    } else if (healthPercent > 0.2) {
      gradient.addColorStop(0, '#ff6600');
      gradient.addColorStop(1, '#ff9933');
    } else {
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(1, '#ff3333');
    }
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Boss name
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px "Courier New"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ALICE MARGATROID', this.canvas.width / 2, barY - 10);
  }


  private drawBullets(): void {
    // Player bullets - bright yellow stars
    for (const bullet of this.player.bullets) {
      const centerX = bullet.x + bullet.width / 2;
      const centerY = bullet.y + bullet.height / 2;
      
      // Glow effect
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ffff00';
      
      // Star shape
      this.ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * bullet.width / 2;
        const y = centerY + Math.sin(angle) * bullet.height / 2;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0;
    }
    
    // Enemy bullets - colorful shapes
    for (const enemy of this.enemies) {
      for (const bullet of enemy.bullets) {
        const centerX = bullet.x + bullet.width / 2;
        const centerY = bullet.y + bullet.height / 2;
        const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff', '#0066ff', '#ff00ff', '#ff0066'];
        const color = colors[bullet.bulletType % 8];
        
        // Glow effect
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = color;
        
        // Different shapes based on bullet type
        if (bullet.bulletType % 4 === 0) {
          // Circle
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, bullet.width / 2, 0, Math.PI * 2);
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        } else if (bullet.bulletType % 4 === 1) {
          // Diamond
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY - bullet.height / 2);
          this.ctx.lineTo(centerX + bullet.width / 2, centerY);
          this.ctx.lineTo(centerX, centerY + bullet.height / 2);
          this.ctx.lineTo(centerX - bullet.width / 2, centerY);
          this.ctx.closePath();
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        } else if (bullet.bulletType % 4 === 2) {
          // Square
          this.ctx.fillStyle = color;
          this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
          // Triangle
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY - bullet.height / 2);
          this.ctx.lineTo(centerX + bullet.width / 2, centerY + bullet.height / 2);
          this.ctx.lineTo(centerX - bullet.width / 2, centerY + bullet.height / 2);
          this.ctx.closePath();
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
      }
    }
    
    // Orphan bullets (from dead enemies) - same as enemy bullets
    for (const bullet of this.orphanBullets) {
      const centerX = bullet.x + bullet.width / 2;
      const centerY = bullet.y + bullet.height / 2;
      const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff', '#0066ff', '#ff00ff', '#ff0066'];
      const color = colors[bullet.bulletType % 8];
      
      // Glow effect
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = color;
      
      // Different shapes based on bullet type
      if (bullet.bulletType % 4 === 0) {
        // Circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, bullet.width / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      } else if (bullet.bulletType % 4 === 1) {
        // Diamond
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - bullet.height / 2);
        this.ctx.lineTo(centerX + bullet.width / 2, centerY);
        this.ctx.lineTo(centerX, centerY + bullet.height / 2);
        this.ctx.lineTo(centerX - bullet.width / 2, centerY);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      } else if (bullet.bulletType % 4 === 2) {
        // Square
        this.ctx.fillStyle = color;
        this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
      } else {
        // Triangle
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - bullet.height / 2);
        this.ctx.lineTo(centerX + bullet.width / 2, centerY + bullet.height / 2);
        this.ctx.lineTo(centerX - bullet.width / 2, centerY + bullet.height / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      
      this.ctx.shadowBlur = 0;
    }
    
    // Boss bullets - larger and more elaborate
    if (this.boss) {
      for (const bullet of this.boss.bullets) {
        const centerX = bullet.x + bullet.width / 2;
        const centerY = bullet.y + bullet.height / 2;
        const colors = ['#ff0066', '#ff3399', '#ff66cc', '#9933ff', '#6666ff', '#33ccff', '#ff9933', '#ffcc00'];
        const color = colors[bullet.bulletType % 8];
        
        // Strong glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        
        // Elaborate shapes
        if (bullet.bulletType % 3 === 0) {
          // Star
          this.ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = i % 2 === 0 ? bullet.width / 2 : bullet.width / 4;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
          }
          this.ctx.closePath();
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else if (bullet.bulletType % 3 === 1) {
          // Hexagon
          this.ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = centerX + Math.cos(angle) * bullet.width / 2;
            const y = centerY + Math.sin(angle) * bullet.height / 2;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
          }
          this.ctx.closePath();
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else {
          // Double circle
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, bullet.width / 2, 0, Math.PI * 2);
          this.ctx.fillStyle = color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, bullet.width / 3, 0, Math.PI * 2);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fill();
        }
        
        this.ctx.shadowBlur = 0;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TouhouGame();
});
