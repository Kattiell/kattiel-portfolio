import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

const GRAVITY = 24;
const HEIGHT = 1.7, RADIUS = 0.35;

/** Jogador em primeira pessoa: cápsula + Octree (mesmo esquema do exemplo oficial games_fps). */
export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.capsule = new Capsule(new THREE.Vector3(0, RADIUS, 0), new THREE.Vector3(0, HEIGHT - 0.1, 0), RADIUS);
    this.vel = new THREE.Vector3(); this.onFloor = false;
    this.octree = new Octree();
    this.keys = {}; this.yaw = 0; this.pitch = 0; this.enabled = false;
    // rendered view (follows yaw/pitch and the capsule with damping) + walk motion
    this.view = { yaw: 0, pitch: 0, y: 0, roll: 0, fov: null, phase: 0, bob: 0 };
    this.reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduzido');
    this.touch = { x: 0, y: 0, lookX: 0, lookY: 0 };
    this.sensitivity = 0.0022;
    addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    dom.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * this.sensitivity; this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
  }
  setWorld(graphNode) { this.octree = new Octree(); this.octree.fromGraphNode(graphNode); }
  teleport(pos, yaw = this.yaw) {
    this.capsule.start.set(pos.x, pos.y + RADIUS, pos.z); this.capsule.end.set(pos.x, pos.y + HEIGHT - 0.1, pos.z);
    this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0; this.sync();
  }
  get feet() { return new THREE.Vector3(this.capsule.start.x, this.capsule.start.y - RADIUS, this.capsule.start.z); }
  // snaps the camera to the current state (teleport, scripted turns): no smoothing
  sync() {
    this.camera.position.copy(this.capsule.end).y += 0.05;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    Object.assign(this.view, { yaw: this.yaw, pitch: this.pitch, y: this.camera.position.y, roll: 0, bob: 0 });
  }
  // free-walk view: smoothed look, step smoothing, light stride bob, lean on strafe, wider lens when running
  smoothView(dt) {
    const v = this.view, k = this.reduced ? 0 : 1;
    const a = (l) => 1 - Math.exp(-l * dt);
    // look: shortest path on yaw, ~60 ms lag (heavy, but never "slippery")
    let dy = this.yaw - v.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
    const yawStep = dy * (k ? a(16) : 1);
    v.yaw += yawStep; v.pitch += (this.pitch - v.pitch) * (k ? a(16) : 1);
    // height: steps and stairs become a short glide instead of a jump
    const eye = this.capsule.end.y + 0.05;
    v.y = Math.abs(eye - v.y) > 1.2 ? eye : v.y + (eye - v.y) * (k ? a(14) : 1);
    // stride
    const sp = Math.hypot(this.vel.x, this.vel.z), moving = this.onFloor ? Math.min(1, sp / 4.6) : 0;
    v.phase += sp * dt * 1.75;
    v.bob += (moving - v.bob) * a(6);
    const bobY = Math.sin(v.phase * 2) * 0.028 * v.bob * k, bobX = Math.sin(v.phase) * 0.02 * v.bob * k;
    // lean: into the strafe and into fast turns
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    const strafe = (this.vel.x * rightX + this.vel.z * rightZ) / 9;
    const turn = yawStep / Math.max(dt, 1e-4);
    v.roll += (THREE.MathUtils.clamp(-strafe * 0.05 + turn * 0.012, -0.045, 0.045) * k - v.roll) * a(5);
    this.camera.position.set(this.capsule.end.x + rightX * bobX, v.y + bobY, this.capsule.end.z + rightZ * bobX);
    this.camera.rotation.set(v.pitch, v.yaw, v.roll + Math.sin(v.phase) * 0.004 * v.bob * k, 'YXZ');
    // lens: opens a little when running
    if (v.fov === null) v.fov = this.camera.fov;
    const running = (this.keys.ShiftLeft || this.keys.ShiftRight) && moving > 0.5;
    const alvo = 70 + (running ? 7 : 0) * k;
    v.fov += (alvo - v.fov) * a(4);
    if (Math.abs(this.camera.fov - v.fov) > 0.01) { this.camera.fov = v.fov; this.camera.updateProjectionMatrix(); }
  }
  collide() {
    const r = this.octree.capsuleIntersect(this.capsule); this.onFloor = false;
    if (r) {
      this.onFloor = r.normal.y > 0.5;
      if (!this.onFloor) this.vel.addScaledVector(r.normal, -r.normal.dot(this.vel));
      if (r.depth >= 1e-10) this.capsule.translate(r.normal.multiplyScalar(r.depth));
    }
  }
  update(dt) {
    if (!this.enabled) { this.sync(); return; }
    const steps = 5; const h = Math.min(0.05, dt) / steps;
    // olhar pelo toque
    this.yaw -= this.touch.lookX * dt * 2.2; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - this.touch.lookY * dt * 1.6));
    for (let i = 0; i < steps; i++) {
      const speed = (this.keys.ShiftLeft || this.keys.ShiftRight ? 9 : 4.6) * (this.onFloor ? 1 : 0.35);
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const wish = new THREE.Vector3();
      if (this.keys.KeyW || this.keys.ArrowUp) wish.add(fwd);
      if (this.keys.KeyS || this.keys.ArrowDown) wish.sub(fwd);
      if (this.keys.KeyD || this.keys.ArrowRight) wish.add(right);
      if (this.keys.KeyA || this.keys.ArrowLeft) wish.sub(right);
      wish.addScaledVector(fwd, -this.touch.y).addScaledVector(right, this.touch.x);
      if (wish.lengthSq() > 1) wish.normalize();
      const damp = Math.exp(-(this.onFloor ? 10 : 1) * h) - 1;
      this.vel.addScaledVector(this.vel, damp);
      this.vel.addScaledVector(wish, speed * h * (this.onFloor ? 10 : 2));
      if (!this.onFloor) this.vel.y -= GRAVITY * h;
      else if (this.vel.y < 0) this.vel.y = Math.max(this.vel.y, -2);
      this.capsule.translate(this.vel.clone().multiplyScalar(h));
      this.collide();
    }
    // rede de segurança: se cair abaixo do mundo, volta ao último ponto seguro
    if (this.onFloor) this.lastSafe = this.feet;
    if (this.capsule.start.y < -12 && this.lastSafe) { this.teleport(this.lastSafe); return; }
    this.smoothView(dt);
  }
}
