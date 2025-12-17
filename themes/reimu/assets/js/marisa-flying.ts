// Marisa Flying Animation - Triggered by User Idle
interface IdleConfig {
  idleTime: number; // ms
  framePath: string;
  frameCount: number;
  frameDelay: number; // ms per frame
  flyDuration: number; // total animation duration (ms)
}

class MarisaFlying {
  private config: IdleConfig;
  private lastActivityTime: number;
  private idleTimer: NodeJS.Timeout | null;
  private isFlying: boolean;
  private flyingElement: HTMLDivElement | null;
  private preloadedFrames: Map<number, string> = new Map();

  constructor(config: Partial<IdleConfig> = {}) {
    this.config = {
      idleTime: 10000, // 10 seconds default
      framePath: '/images/marisa-anim/marisa_dir_change_',
      frameCount: 11,
      frameDelay: 60, // 60ms per frame
      flyDuration: 8000, // 8 seconds total flight
      ...config
    };

    this.lastActivityTime = Date.now();
    this.idleTimer = null;
    this.isFlying = false;
    this.flyingElement = null;

    this.preloadFrames();
    this.init();
  }

  private preloadFrames(): void {
    // Preload all frames as data URLs
    console.log(`[Marisa Flying] Preloading ${this.config.frameCount} frames from ${this.config.framePath}...`);
    let loadedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < this.config.frameCount; i++) {
      const src = `${this.config.framePath}${i}.png`;
      const img = new Image();
      img.src = src;
      // Cache in memory
      img.onload = () => {
        this.preloadedFrames.set(i, src);
        loadedCount++;
        if (loadedCount + errorCount === this.config.frameCount) {
          console.log(`[Marisa Flying] Preload complete: ${loadedCount} loaded, ${errorCount} failed`);
        }
      };
      img.onerror = () => {
        console.error(`[Marisa Flying] Failed to load frame: ${src}`);
        errorCount++;
        if (loadedCount + errorCount === this.config.frameCount) {
          console.log(`[Marisa Flying] Preload complete: ${loadedCount} loaded, ${errorCount} failed`);
        }
      };
    }
  }

  private init(): void {
    // Track user activity with throttling to avoid too frequent resets
    let mouseMoveThrottle: number | null = null;
    let scrollThrottle: number | null = null;
    
    document.addEventListener('click', () => this.resetIdle());
    document.addEventListener('mousemove', () => {
      // Throttle mousemove to once per 2 seconds
      if (!mouseMoveThrottle) {
        this.resetIdle();
        mouseMoveThrottle = window.setTimeout(() => {
          mouseMoveThrottle = null;
        }, 2000);
      }
    });
    document.addEventListener('keydown', () => this.resetIdle());
    document.addEventListener('scroll', () => {
      // Throttle scroll to once per 2 seconds
      if (!scrollThrottle) {
        this.resetIdle();
        scrollThrottle = window.setTimeout(() => {
          scrollThrottle = null;
        }, 2000);
      }
    });
    document.addEventListener('touchstart', () => this.resetIdle());
    document.addEventListener('touchmove', () => this.resetIdle());

    // Start idle detection
    this.startIdleDetection();
  }

  private resetIdle(): void {
    this.lastActivityTime = Date.now();
    
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Set new timer
    this.idleTimer = setTimeout(() => {
      console.log('[Marisa Flying] Idle timeout reached, checking if should fly...');
      if (!this.isFlying) {
        this.triggerFlight();
      } else {
        console.log('[Marisa Flying] Already flying, skipping...');
      }
    }, this.config.idleTime);
  }

  private startIdleDetection(): void {
    this.resetIdle();
  }

  public triggerFlight(): void {
    if (this.isFlying) return;

    this.isFlying = true;
    this.createFlyingElement();
    this.animate();

    // Reset flight status after duration
    setTimeout(() => {
      this.isFlying = false;
      if (this.flyingElement) {
        this.flyingElement.remove();
        this.flyingElement = null;
      }
      // Reset idle timer for next flight
      this.resetIdle();
    }, this.config.flyDuration);
  }

  private createFlyingElement(): void {
    const element = document.createElement('div');
    element.className = 'marisa-flying-container';
    
    // Random Y position (middle-ish area)
    const randomY = Math.random() * (window.innerHeight * 0.5) + window.innerHeight * 0.25;
    
    const startLeft = window.innerWidth + 150;
    const endLeft = -150;
    
    element.style.cssText = `
      position: fixed;
      left: ${startLeft}px;
      top: ${randomY}px;
      width: auto;
      height: auto;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.9;
    `;

    const img = document.createElement('img');
    img.src = `${this.config.framePath}0.png`;
    img.style.cssText = `
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    `;
    img.onload = () => {
      // Get actual image dimensions
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      element.style.width = width + 'px';
      element.style.height = height + 'px';
    };

    element.appendChild(img);
    document.body.appendChild(element);
    this.flyingElement = element;
    
    // Store animation data
    (element as any).startLeft = startLeft;
    (element as any).endLeft = endLeft;
  }

  private animate(): void {
    if (!this.flyingElement) {
      console.error('[Marisa Flying] No flying element to animate!');
      return;
    }

    const img = this.flyingElement.querySelector('img') as HTMLImageElement;
    if (!img) {
      console.error('[Marisa Flying] No img element found!');
      return;
    }

    const element = this.flyingElement;
    const startTime = Date.now();
    const frameCount = this.config.frameCount;
    const frameDelay = this.config.frameDelay;
    const startLeft = (element as any).startLeft;
    const endLeft = (element as any).endLeft;

    let lastFrameIndex = -1;
    let frameUpdateCount = 0;

    console.log('[Marisa Flying] Starting animation loop...');

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.config.flyDuration, 1);

      // Horizontal movement (right to left)
      const currentLeft = startLeft + (endLeft - startLeft) * progress;
      element.style.left = currentLeft + 'px';

      // Frame index - calculate which frame should be shown at this time
      let frameIndex = Math.floor((elapsed / frameDelay) % frameCount);

      // Update image if frame changed
      if (frameIndex !== lastFrameIndex) {
        if (this.preloadedFrames.has(frameIndex)) {
          img.src = this.preloadedFrames.get(frameIndex)!;
        } else {
          // If frame not preloaded, load directly
          img.src = `${this.config.framePath}${frameIndex}.png`;
          if (frameUpdateCount < 5) {
            console.warn(`[Marisa Flying] Frame ${frameIndex} not preloaded, loading directly`);
          }
        }
        frameUpdateCount++;
        if (frameUpdateCount <= 3) {
          console.log(`[Marisa Flying] Frame updated to ${frameIndex} (elapsed: ${elapsed}ms, progress: ${(progress*100).toFixed(1)}%)`);
        }
        lastFrameIndex = frameIndex;
      }

      // Opacity fade out at end
      if (progress > 0.8) {
        element.style.opacity = String(0.9 * (1 - (progress - 0.8) / 0.2));
      }

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        console.log(`[Marisa Flying] Animation complete. Duration: ${elapsed}ms, Total frame updates: ${frameUpdateCount}`);
      }
    };

    requestAnimationFrame(animateFrame);
  }

  // Public method to manually trigger
  public fly(): void {
    this.triggerFlight();
  }

  // Public method to stop idle detection
  public stop(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.isFlying = false;
    if (this.flyingElement) {
      this.flyingElement.remove();
      this.flyingElement = null;
    }
  }
}

// Reimu Flying Animation - Same as Marisa but different sprite
class ReimuflyingAnimation {
  private framePath: string = '/images/reimu-anim/reimu2_stand_';
  private frameCount: number = 12;
  private frameDelay: number = 60; // ms per frame
  private animationDuration: number = 8000; // total duration
  
  private flyingElement: HTMLDivElement | null = null;
  private preloadedFrames: Map<number, string> = new Map();

  constructor() {
    this.preloadFrames();
  }

  private preloadFrames(): void {
    // Preload all frames
    console.log(`[Reimu Flying] Preloading ${this.frameCount} frames from ${this.framePath}...`);
    let loadedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < this.frameCount; i++) {
      const src = `${this.framePath}${i}.png`;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.preloadedFrames.set(i, src);
        loadedCount++;
        if (loadedCount + errorCount === this.frameCount) {
          console.log(`[Reimu Flying] Preload complete: ${loadedCount} loaded, ${errorCount} failed`);
        }
      };
      img.onerror = () => {
        console.error(`[Reimu Flying] Failed to load frame: ${src}`);
        errorCount++;
        if (loadedCount + errorCount === this.frameCount) {
          console.log(`[Reimu Flying] Preload complete: ${loadedCount} loaded, ${errorCount} failed`);
        }
      };
    }
  }

  public fly(): void {
    this.createFlyingElement();
    this.animate();
  }

  private createFlyingElement(): void {
    const element = document.createElement('div');
    element.className = 'reimu-flying-container';
    
    // Random Y position (middle-ish area)
    const randomY = Math.random() * (window.innerHeight * 0.5) + window.innerHeight * 0.25;
    
    const startLeft = window.innerWidth + 150;
    const endLeft = -150;
    
    element.style.cssText = `
      position: fixed;
      left: ${startLeft}px;
      top: ${randomY}px;
      width: auto;
      height: auto;
      pointer-events: none;
      z-index: 9998;
      opacity: 0.9;
    `;

    const img = document.createElement('img');
    img.src = `${this.framePath}0.png`;
    img.style.cssText = `
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    `;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      element.style.width = width + 'px';
      element.style.height = height + 'px';
    };

    element.appendChild(img);
    document.body.appendChild(element);
    this.flyingElement = element;
    
    (element as any).startLeft = startLeft;
    (element as any).endLeft = endLeft;
  }

  private animate(): void {
    if (!this.flyingElement) {
      console.error('[Reimu Flying] No flying element to animate!');
      return;
    }

    const img = this.flyingElement.querySelector('img') as HTMLImageElement;
    if (!img) {
      console.error('[Reimu Flying] No img element found!');
      return;
    }

    const element = this.flyingElement;
    const startTime = Date.now();
    const startLeft = (element as any).startLeft;
    const endLeft = (element as any).endLeft;

    let lastFrameIndex = -1;
    let frameUpdateCount = 0;

    console.log('[Reimu Flying] Starting animation loop...');

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);

      // Horizontal movement (right to left)
      const currentLeft = startLeft + (endLeft - startLeft) * progress;
      element.style.left = currentLeft + 'px';

      // Frame index - loop through frames
      let frameIndex = Math.floor((elapsed / this.frameDelay) % this.frameCount);

      // Update image if frame changed
      if (frameIndex !== lastFrameIndex) {
        if (this.preloadedFrames.has(frameIndex)) {
          img.src = this.preloadedFrames.get(frameIndex)!;
        } else {
          // If frame not preloaded, load directly
          img.src = `${this.framePath}${frameIndex}.png`;
          if (frameUpdateCount < 5) {
            console.warn(`[Reimu Flying] Frame ${frameIndex} not preloaded, loading directly`);
          }
        }
        frameUpdateCount++;
        if (frameUpdateCount <= 3) {
          console.log(`[Reimu Flying] Frame updated to ${frameIndex}`);
        }
        lastFrameIndex = frameIndex;
      }

      // Opacity fade out at end
      if (progress > 0.8) {
        element.style.opacity = String(0.9 * (1 - (progress - 0.8) / 0.2));
      }

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        console.log(`[Reimu Flying] Animation complete. Total frame updates: ${frameUpdateCount}`);
        if (element.parentElement) {
          element.remove();
        }
        this.flyingElement = null;
      }
    };

    requestAnimationFrame(animateFrame);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Marisa Flying] Initializing idle animation system...');
  
  const marisaFlying = new MarisaFlying({
    idleTime: 15000, // 15 seconds
    frameCount: 11, // 11 frames (0-10) for dir_change set
    frameDelay: 60, // 60ms per frame for smoother animation
    flyDuration: 8000
  });
  
  const reimuFlying = new ReimuflyingAnimation();

  // Override triggerFlight to trigger both animations
  const originalTriggerFlight = marisaFlying.triggerFlight.bind(marisaFlying);
  (marisaFlying as any).triggerFlight = function() {
    console.log('[Marisa Flying] Triggering flight animation!');
    originalTriggerFlight();
    reimuFlying.fly();
  };

  // Expose to window for debugging/manual trigger
  (window as any).marisaFlying = marisaFlying;
  (window as any).reimuFlying = reimuFlying;
  
  console.log('[Marisa Flying] System initialized. Wait 15 seconds of idle or call window.marisaFlying.fly() to test.');
});
