import { Component, ElementRef, OnDestroy, AfterViewInit, ViewChild, HostListener } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

interface Obstacle { x: number; y: number; w: number; h: number; }

@Component({ selector: 'app-game', templateUrl: './game.component.html' })
export class GameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;

  mode: 'jump' | 'dodge' = 'jump';   // landscape = jump, portrait = dodge

  private W = 760;
  private H = 220;
  private ground = 180;
  private scale = 1;

  private dog = { x: 60, y: 0, vy: 0, w: 48, h: 46, onGround: true };
  private targetX = 0;               // dodge: where the player wants the dog
  private gravity = 0.9;
  private jumpV = -15;

  private obstacles: Obstacle[] = [];
  private spawnTimer = 0;
  private spawnGap = 90;
  private speed = 6;
  private frame = 0;

  state: 'idle' | 'running' | 'over' = 'idle';
  score = 0;
  high = 0;

  constructor(private theme: ThemeService) {
    this.high = +(localStorage.getItem('snoopy_game_high') ?? 0);
  }

  ngAfterViewInit(): void {
    this.resize(); this.draw();
    // re-measure once layout has fully settled (sidebar/transition)
    setTimeout(() => { if (this.state !== 'running') { this.resize(); this.draw(); } }, 60);
  }
  ngOnDestroy(): void { cancelAnimationFrame(this.raf); }

  // ── responsive sizing + mode select ──
  @HostListener('window:resize')
  resize(): void {
    const wrap = this.canvasRef.nativeElement.parentElement!;
    // Mode follows the VIEWPORT, not the (possibly mis-measured) card width.
    // Narrow viewport (phones, portrait) → dodge; wide (desktop/landscape) → jump.
    const portrait = window.innerWidth < 768;
    this.mode = portrait ? 'dodge' : 'jump';

    // Fill the actual game area (matches the device viewport).
    this.W = Math.max(280, wrap.clientWidth || window.innerWidth);
    this.H = Math.max(320, wrap.clientHeight || Math.round(window.innerHeight * 0.7));

    const c = this.canvasRef.nativeElement;
    c.width = this.W; c.height = this.H;

    // keep entities a sensible size regardless of how large the canvas gets
    this.scale = portrait
      ? Math.min(Math.max(this.W / 360, 1), 2.4)
      : Math.min(Math.max(this.H / 260, 1), 2.4);
    this.dog.h = 46 * this.scale;
    this.dog.w = 48 * this.scale;

    if (this.mode === 'jump') {
      this.ground = this.H - Math.round(this.H * 0.14);
      this.dog.x = Math.round(this.W * 0.12);
      // cap jump apex so a tall canvas doesn't make the dog float forever
      const apex = Math.min(this.H * 0.5, 230 * this.scale);
      this.gravity = 0.9 * this.scale;
      this.jumpV = -Math.sqrt(2 * this.gravity * apex);
      this.speed = Math.max(5, this.W * 0.007);
    } else {
      // dodge: dog sits near bottom, moves horizontally
      this.ground = this.H - Math.round(this.dog.h + 18);
      this.speed = Math.min(Math.max(4, this.H * 0.009), 8) * this.scale;
      if (this.state !== 'running') { this.dog.x = this.W / 2 - this.dog.w / 2; this.targetX = this.dog.x; }
    }

    if (this.state !== 'running') this.draw();
  }

  // ── input ──
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (this.mode === 'jump') {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this.action(); }
    } else {
      if (e.code === 'ArrowLeft')  { e.preventDefault(); this.targetX -= this.W * 0.22; this.clampTarget(); if (this.state !== 'running') this.action(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); this.targetX += this.W * 0.22; this.clampTarget(); if (this.state !== 'running') this.action(); }
      else if (e.code === 'Space') { e.preventDefault(); if (this.state !== 'running') this.action(); }
    }
  }

  /** Pointer drag/tap to steer in dodge mode. */
  onPointer(e: PointerEvent): void {
    if (this.mode !== 'dodge' || this.state !== 'running') return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.W / rect.width);
    this.targetX = x - this.dog.w / 2;
    this.clampTarget();
  }

  private clampTarget(): void {
    this.targetX = Math.max(0, Math.min(this.W - this.dog.w, this.targetX));
  }

  action(): void {
    if (this.state === 'running') { if (this.mode === 'jump') this.jump(); }
    else this.start();
  }

  private start(): void {
    this.resize();
    this.obstacles = [];
    this.score = 0; this.spawnTimer = 0; this.spawnGap = 90; this.frame = 0;
    if (this.mode === 'jump') {
      this.dog.y = 0; this.dog.vy = 0; this.dog.onGround = true;
    } else {
      this.dog.x = this.W / 2 - this.dog.w / 2; this.targetX = this.dog.x;
    }
    // this.speed already set by resize() for the current mode
    this.state = 'running';
    cancelAnimationFrame(this.raf);
    this.loop();
  }

  private jump(): void {
    if (this.dog.onGround) { this.dog.vy = this.jumpV; this.dog.onGround = false; }
  }

  private loop = (): void => {
    this.update(); this.draw();
    if (this.state === 'running') this.raf = requestAnimationFrame(this.loop);
  };

  private update(): void {
    this.frame++;
    this.mode === 'jump' ? this.updateJump() : this.updateDodge();
    this.score += 1;
    if (this.frame % 240 === 0) this.speed += this.mode === 'jump' ? 0.5 : 0.4;
  }

  private updateJump(): void {
    this.dog.vy += this.gravity;
    this.dog.y += this.dog.vy;
    if (this.dog.y >= 0) { this.dog.y = 0; this.dog.vy = 0; this.dog.onGround = true; }

    if (--this.spawnTimer <= 0) {
      const h = (24 + Math.random() * 26) * this.scale;
      this.obstacles.push({ x: this.W, y: this.ground - h, w: (16 + Math.random() * 14) * this.scale, h });
      this.spawnGap = Math.max(54, this.spawnGap - 0.5);
      this.spawnTimer = this.spawnGap + Math.random() * 40;
    }
    for (const o of this.obstacles) o.x -= this.speed;
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -10);

    const dogTop = this.ground - this.dog.h + this.dog.y;
    const pad = 8 * this.scale;
    for (const o of this.obstacles) {
      if (this.dog.x + this.dog.w - pad > o.x && this.dog.x + pad < o.x + o.w && dogTop + this.dog.h - pad * .75 > o.y) {
        this.gameOver(); return;
      }
    }
  }

  private updateDodge(): void {
    // smooth steer toward target
    this.dog.x += (this.targetX - this.dog.x) * 0.35;

    if (--this.spawnTimer <= 0) {
      const w = (34 + Math.random() * 40) * this.scale;
      this.obstacles.push({ x: Math.random() * (this.W - w), y: -40, w, h: (22 + Math.random() * 18) * this.scale });
      this.spawnGap = Math.max(34, this.spawnGap - 0.4);
      this.spawnTimer = this.spawnGap + Math.random() * 26;
    }
    for (const o of this.obstacles) o.y += this.speed;
    this.obstacles = this.obstacles.filter(o => o.y < this.H + 20);

    const dy = this.ground;                 // dog top (fixed near bottom)
    const pad = 7 * this.scale;
    for (const o of this.obstacles) {
      if (this.dog.x + this.dog.w - pad > o.x && this.dog.x + pad < o.x + o.w &&
          dy + pad < o.y + o.h && dy + this.dog.h - pad > o.y) {
        this.gameOver(); return;
      }
    }
  }

  private gameOver(): void {
    this.state = 'over';
    const final = Math.floor(this.score / 6);
    if (final > this.high) { this.high = final; localStorage.setItem('snoopy_game_high', String(final)); }
  }

  get displayScore(): number { return Math.floor(this.score / 6); }

  // ── render ──
  private draw(): void {
    const ctx = this.ctx ?? (this.ctx = this.canvasRef.nativeElement.getContext('2d')!);
    const dark = this.theme.theme === 'dark';
    const ink = dark ? '#e3e9f3' : '#1f2933';
    const sky = dark ? '#14224a' : '#eaf6fd';
    const grass = dark ? '#15402a' : '#4f9d4a';
    const obs = dark ? '#6aa6e2' : '#2c5a8c';

    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.W, this.H);

    if (this.mode === 'jump') {
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, this.ground + 2); ctx.lineTo(this.W, this.ground + 2); ctx.stroke();
      ctx.fillStyle = grass; ctx.fillRect(0, this.ground + 2, this.W, this.H - this.ground);
      this.drawObstacles(ctx, obs, ink);
      this.drawDog(ctx, this.dog.x, this.ground - this.dog.h + this.dog.y, ink, dark, false);
    } else {
      // dodge: thin grass strip at bottom, falling obstacles, dog steering
      ctx.fillStyle = grass; ctx.fillRect(0, this.H - 14, this.W, 14);
      this.drawObstacles(ctx, obs, ink);
      this.drawDog(ctx, this.dog.x, this.ground, ink, dark, true);
    }
  }

  private drawObstacles(ctx: CanvasRenderingContext2D, fill: string, ink: string): void {
    ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    for (const o of this.obstacles) {
      ctx.beginPath();
      (ctx as any).roundRect ? (ctx as any).roundRect(o.x, o.y, o.w, o.h, 5) : ctx.rect(o.x, o.y, o.w, o.h);
      ctx.fill(); ctx.stroke();
    }
  }

  private drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, dark: boolean, facingUp: boolean): void {
    const step = Math.floor(this.frame / 6) % 2 === 0;
    const white = dark ? '#e3e9f3' : '#fff';
    const ear = '#c98a5e';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.scale, this.scale);
    ctx.lineWidth = 3; ctx.strokeStyle = ink;

    ctx.fillStyle = white;
    ctx.beginPath(); ctx.ellipse(24, 28, 20, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(40, 16, 13, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ear;
    ctx.beginPath(); ctx.ellipse(34, 10, 6, 9, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.ellipse(50, 19, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(54, 18, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(43, 14, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, 24); ctx.quadraticCurveTo(-6, 18, -2, 12); ctx.stroke();
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.dog.onGround || this.mode === 'dodge') {
      ctx.moveTo(16, 38); ctx.lineTo(step ? 10 : 18, 46);
      ctx.moveTo(32, 38); ctx.lineTo(step ? 38 : 30, 46);
    } else {
      ctx.moveTo(16, 38); ctx.lineTo(14, 45);
      ctx.moveTo(32, 38); ctx.lineTo(34, 45);
    }
    ctx.stroke();
    ctx.strokeStyle = '#4a90d9'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(34, 26); ctx.lineTo(46, 24); ctx.stroke();
    ctx.restore();
  }
}
