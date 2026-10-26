import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  EnvironmentStyle,
  FINALE_WORLD,
  LEVELS,
  RepairVisualType,
  TelemetryData,
} from '../types/game';
import { createBiplane, BiplaneRig } from '../three/biplaneBuilder';
import { buildWorldEnvironment, BuiltWorld, PORTAL_Z, SPAWN_Z } from '../three/worldBuilder';
import { soundEngine } from '../audio/soundEngine';

interface GameCanvasProps {
  currentLevel: number;
  completedTasksInLevel: number;
  isMalfunctioning: boolean;
  activeVisualType: RepairVisualType | null;
  lastCompletedVisual: RepairVisualType | null;
  repairPulseCount: number;
  resetSignal: number;
  onPortalEntered: () => void;
  onTriggerMalfunction: () => void;
  onTelemetryUpdate: (data: TelemetryData) => void;
  onPortalBlockedNotice: () => void;
}

const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _particleDummy = new THREE.Object3D();

// Pink-purple blurred smoke colors
const _colorPink = new THREE.Color('#f43f5e');
const _colorMagenta = new THREE.Color('#ec4899');
const _colorPurple = new THREE.Color('#a855f7');
const _colorDeepViolet = new THREE.Color('#7e22ce');
const _colorSoftOrchid = new THREE.Color('#e879f9');
const _colorTempSmoke = new THREE.Color();

const _colorFire = new THREE.Color('#fb923c');
const _colorRepair = new THREE.Color('#34d399');
const _colorTrail = new THREE.Color('#d8b4fe');

function createSkyTexture(topHex: string, horizonHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.54, horizonHex);
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

// Procedural soft blurred radial smoke puff texture
function createBlurredSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(0.48, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface ParticleState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  spin: number;
  life: number;
  maxLife: number;
  scale: number;
  colorVariant: number;
  kind: 'smoke' | 'spark' | 'repair' | 'trail';
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  currentLevel,
  completedTasksInLevel,
  isMalfunctioning,
  activeVisualType,
  lastCompletedVisual,
  repairPulseCount,
  resetSignal,
  onPortalEntered,
  onTriggerMalfunction,
  onTelemetryUpdate,
  onPortalBlockedNotice,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    currentLevel,
    completedTasksInLevel,
    isMalfunctioning,
    activeVisualType,
    lastCompletedVisual,
    onPortalEntered,
    onTriggerMalfunction,
    onTelemetryUpdate,
    onPortalBlockedNotice,
  });

  stateRef.current = {
    currentLevel,
    completedTasksInLevel,
    isMalfunctioning,
    activeVisualType,
    lastCompletedVisual,
    onPortalEntered,
    onTriggerMalfunction,
    onTelemetryUpdate,
    onPortalBlockedNotice,
  };

  const simRef = useRef({
    planePos: new THREE.Vector3(0, 14, SPAWN_Z),
    yaw: 0,
    pitch: 0,
    roll: 0,
    airspeed: 32,
    hullIntegrity: 100,
    repairFlashTimer: 0,
    nextMalfunctionCooldown: 1.1,
    warpFlash: 0,
    blockedNoticeCooldown: 0,
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    spawnRepairBurst: false,
  });

  const worldBuilderRef = useRef<{
    rebuildWorld: (lvl: number) => void;
  } | null>(null);

  const prevPulseRef = useRef(repairPulseCount);
  useEffect(() => {
    if (repairPulseCount !== prevPulseRef.current) {
      prevPulseRef.current = repairPulseCount;
      simRef.current.repairFlashTimer = 1.65;
      simRef.current.nextMalfunctionCooldown = 1.85;
      simRef.current.spawnRepairBurst = true;
      simRef.current.hullIntegrity = Math.min(100, simRef.current.hullIntegrity + 18);
    }
  }, [repairPulseCount]);

  useEffect(() => {
    simRef.current.planePos.set(0, 14.5, SPAWN_Z);
    simRef.current.yaw = 0;
    simRef.current.pitch = 0;
    simRef.current.roll = 0;
    simRef.current.airspeed = 32;
    simRef.current.hullIntegrity = 100;
    simRef.current.nextMalfunctionCooldown = 1.15;
    simRef.current.warpFlash = 1.0;
    worldBuilderRef.current?.rebuildWorld(currentLevel);
  }, [currentLevel, resetSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      850
    );
    camera.position.set(0, 17, SPAWN_Z + 11.5);

    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#78350f', 0.85);
    hemiLight.position.set(0, 80, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fffbeb', 1.85);
    keyLight.position.set(45, 75, 35);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 260;
    const shadowBound = 65;
    keyLight.shadow.camera.left = -shadowBound;
    keyLight.shadow.camera.right = shadowBound;
    keyLight.shadow.camera.top = shadowBound;
    keyLight.shadow.camera.bottom = -shadowBound;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight('#93c5fd', 0.65);
    rimLight.position.set(-40, 28, -60);
    scene.add(rimLight);

    const biplane: BiplaneRig = createBiplane();
    biplane.root.position.copy(simRef.current.planePos);
    scene.add(biplane.root);

    // Blurred Soft Smoke & Particle System
    const maxParticles = 180;
    const smokeTexture = createBlurredSmokeTexture();
    const particleGeo = new THREE.PlaneGeometry(1, 1);
    const particleMat = new THREE.MeshBasicMaterial({
      map: smokeTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, maxParticles);
    particleMesh.frustumCulled = false;
    particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxParticles * 3),
      3
    );
    scene.add(particleMesh);

    const particles: ParticleState[] = Array.from({ length: maxParticles }, () => ({
      active: false,
      x: 0,
      y: -999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rot: 0,
      spin: 0,
      life: 0,
      maxLife: 1,
      scale: 0.001,
      colorVariant: 0,
      kind: 'smoke',
    }));
    let particleCursor = 0;

    const spawnParticle = (
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      maxLife: number,
      scale: number,
      kind: ParticleState['kind']
    ) => {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % maxParticles;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.rot = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 1.8;
      p.life = 0;
      p.maxLife = maxLife;
      p.scale = scale;
      p.colorVariant = Math.random();
      p.kind = kind;
    };

    let activeWorld: BuiltWorld | null = null;
    let activeSkyTex: THREE.CanvasTexture | null = null;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const rebuildWorld = (lvl: number) => {
      if (activeWorld) {
        scene.remove(activeWorld.group);
        activeWorld.dispose();
        activeWorld = null;
      }
      if (activeSkyTex) {
        activeSkyTex.dispose();
        activeSkyTex = null;
      }

      const cfg =
        lvl >= 1 && lvl <= LEVELS.length
          ? LEVELS[lvl - 1]
          : {
              ...FINALE_WORLD,
              style: EnvironmentStyle.GOLDEN_SANCTUARY,
            };

      activeSkyTex = createSkyTexture(cfg.skyTopColor, cfg.skyHorizonColor);
      scene.background = activeSkyTex;
      scene.fog = new THREE.FogExp2(cfg.fogColor, 0.0022);

      activeWorld = buildWorldEnvironment(
        cfg.style,
        cfg.portalColor,
        cfg.portalSecondaryColor,
        maxAnisotropy
      );
      scene.add(activeWorld.group);
    };

    worldBuilderRef.current = { rebuildWorld };
    rebuildWorld(stateRef.current.currentLevel);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.initFlightAudio();
      if (e.code === 'ArrowUp') simRef.current.keys.up = true;
      if (e.code === 'ArrowDown') simRef.current.keys.down = true;
      if (e.code === 'ArrowLeft') simRef.current.keys.left = true;
      if (e.code === 'ArrowRight') simRef.current.keys.right = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') simRef.current.keys.up = false;
      if (e.code === 'ArrowDown') simRef.current.keys.down = false;
      if (e.code === 'ArrowLeft') simRef.current.keys.left = false;
      if (e.code === 'ArrowRight') simRef.current.keys.right = false;
    };

    const onPointerDown = () => {
      soundEngine.initFlightAudio();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    container.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();
    let smokeEmitTimer = 0;
    let telemetryTimer = 0;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.1);
      const elapsed = clock.getElapsedTime();

      const st = stateRef.current;
      const sim = simRef.current;
      const isFinale = st.currentLevel > LEVELS.length;
      const allRepaired = isFinale || st.completedTasksInLevel >= 4;

      if (!isFinale && !st.isMalfunctioning && st.completedTasksInLevel < 4) {
        sim.nextMalfunctionCooldown -= dt;
        if (sim.nextMalfunctionCooldown <= 0) {
          st.onTriggerMalfunction();
        }
      }

      if (sim.repairFlashTimer > 0) {
        sim.repairFlashTimer = Math.max(0, sim.repairFlashTimer - dt);
      }
      if (sim.warpFlash > 0) {
        sim.warpFlash = Math.max(0, sim.warpFlash - dt * 1.8);
      }
      if (sim.blockedNoticeCooldown > 0) {
        sim.blockedNoticeCooldown = Math.max(0, sim.blockedNoticeCooldown - dt);
      }

      const steerX = (sim.keys.right ? 1 : 0) - (sim.keys.left ? 1 : 0);
      const steerY = (sim.keys.up ? 1 : 0) - (sim.keys.down ? 1 : 0);

      const targetYaw =
        steerX !== 0
          ? -steerX * 0.42
          : THREE.MathUtils.clamp(-sim.planePos.x * 0.022, -0.25, 0.25);

      sim.yaw = THREE.MathUtils.damp(sim.yaw, targetYaw, 4.5, dt);

      let targetPitch = steerY * 0.34;
      if (st.isMalfunctioning) {
        targetPitch -= 0.24;
      } else if (sim.repairFlashTimer > 0) {
        targetPitch += 0.22;
      } else if (steerY === 0 && allRepaired) {
        targetPitch = THREE.MathUtils.clamp((9.8 - sim.planePos.y) * 0.035, -0.18, 0.18);
      }

      sim.pitch = THREE.MathUtils.damp(sim.pitch, targetPitch, 5.0, dt);

      const malfunctionWobble = st.isMalfunctioning
        ? Math.sin(elapsed * 8.5) * 0.14
        : 0;
      const targetRoll = -steerX * 0.52 + malfunctionWobble;
      sim.roll = THREE.MathUtils.damp(sim.roll, targetRoll, 6.0, dt);

      const targetSpeed = st.isMalfunctioning
        ? 21
        : sim.repairFlashTimer > 0
        ? 44
        : allRepaired
        ? 38
        : 31;
      sim.airspeed = THREE.MathUtils.damp(sim.airspeed, targetSpeed, 3.5, dt);

      sim.planePos.x += -Math.sin(sim.yaw) * sim.airspeed * dt;
      sim.planePos.x = THREE.MathUtils.clamp(sim.planePos.x, -26, 26);

      const sinkRate = st.isMalfunctioning ? -3.15 : 0;
      const climbBoost = sim.repairFlashTimer > 0 ? 5.2 : 0;
      sim.planePos.y += (Math.sin(sim.pitch) * sim.airspeed * 0.65 + sinkRate + climbBoost) * dt;

      if (sim.planePos.y < -3.5) {
        sim.planePos.y = -3.2;
        sim.pitch = 0.28;
        sim.hullIntegrity = Math.max(20, sim.hullIntegrity - 12);
      }
      sim.planePos.y = Math.min(34, sim.planePos.y);

      sim.planePos.z -= Math.cos(sim.yaw) * sim.airspeed * dt;

      const distToPortal = Math.max(0, sim.planePos.z - PORTAL_Z);
      if (sim.planePos.z <= PORTAL_Z + 5.5) {
        if (allRepaired) {
          soundEngine.playPortalWarp();
          st.onPortalEntered();
        } else {
          sim.planePos.z = PORTAL_Z + 115;
          sim.planePos.y = Math.max(sim.planePos.y, 13);
          if (sim.blockedNoticeCooldown <= 0) {
            sim.blockedNoticeCooldown = 3.0;
            st.onPortalBlockedNotice();
          }
        }
      }

      biplane.root.position.copy(sim.planePos);
      biplane.root.rotation.set(sim.pitch, sim.yaw, sim.roll, 'YXZ');
      biplane.update(
        dt,
        elapsed,
        st.activeVisualType,
        st.isMalfunctioning,
        sim.repairFlashTimer,
        st.lastCompletedVisual
      );

      keyLight.position.set(sim.planePos.x + 40, 75, sim.planePos.z + 35);
      keyLight.target.position.copy(sim.planePos);

      // Celebration repair particle burst
      if (sim.spawnRepairBurst) {
        sim.spawnRepairBurst = false;
        for (let i = 0; i < 28; i++) {
          const ang = (i / 28) * Math.PI * 2;
          spawnParticle(
            sim.planePos.x + Math.cos(ang) * 1.4,
            sim.planePos.y + Math.sin(ang) * 0.9,
            sim.planePos.z - 0.5,
            Math.cos(ang) * 7.5,
            Math.sin(ang) * 6.5 + 2,
            (Math.random() - 0.5) * 6,
            0.75,
            1.6,
            'repair'
          );
        }
      }

      // Emission of blurred pink-purple smoke when malfunctioning, or soft contrail when flying healthy
      smokeEmitTimer += dt;
      if (smokeEmitTimer >= 0.038) {
        smokeEmitTimer = 0;
        if (st.isMalfunctioning) {
          // Billowing soft pink & purple volumetric smoke puffs from the engine
          spawnParticle(
            sim.planePos.x + (Math.random() - 0.5) * 0.5,
            sim.planePos.y + (Math.random() - 0.5) * 0.35,
            sim.planePos.z + 1.6,
            (Math.random() - 0.5) * 1.8,
            0.8 + Math.random() * 1.2,
            5.8,
            1.25,
            1.85,
            Math.random() < 0.22 ? 'spark' : 'smoke'
          );
        } else {
          // Subtle soft blurred lavender-pink contrail puffs from the wingtips
          [-4.0, 4.0].forEach((wx) => {
            spawnParticle(
              sim.planePos.x + wx * Math.cos(sim.roll),
              sim.planePos.y + wx * Math.sin(sim.roll) + 0.35,
              sim.planePos.z + 0.2,
              0,
              0,
              3.5,
              0.55,
              0.65,
              'trail'
            );
          });
        }
      }

      // Update and billboard particles to face camera
      for (let i = 0; i < maxParticles; i++) {
        const p = particles[i];
        if (!p.active) {
          _particleDummy.position.set(0, -999, 0);
          _particleDummy.scale.setScalar(0.001);
          _particleDummy.updateMatrix();
          particleMesh.setMatrixAt(i, _particleDummy.matrix);
          continue;
        }
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _particleDummy.position.set(0, -999, 0);
          _particleDummy.scale.setScalar(0.001);
          _particleDummy.updateMatrix();
          particleMesh.setMatrixAt(i, _particleDummy.matrix);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        const progress = p.life / p.maxLife;

        // Smooth expansion and volumetric billowing for blurred smoke
        let s: number;
        if (p.kind === 'smoke') {
          s = p.scale * (0.8 + progress * 2.8);
        } else if (p.kind === 'trail') {
          s = p.scale * (0.9 + progress * 1.6);
        } else {
          s = p.scale * (1 - progress);
        }

        _particleDummy.position.set(p.x, p.y, p.z);
        // Billboard rotation: face camera, with slight 2D spin for organic fluid smoke motion
        _particleDummy.quaternion.copy(camera.quaternion);
        _particleDummy.rotateZ(p.rot + progress * p.spin);
        _particleDummy.scale.setScalar(Math.max(0.01, s));
        _particleDummy.updateMatrix();
        particleMesh.setMatrixAt(i, _particleDummy.matrix);

        if (p.kind === 'smoke') {
          // Rich, vibrant pink to purple gradient as smoke billows and softens
          if (p.colorVariant < 0.5) {
            _colorTempSmoke.copy(_colorPink).lerp(_colorPurple, progress * 1.15);
          } else {
            _colorTempSmoke.copy(_colorSoftOrchid).lerp(_colorDeepViolet, progress);
          }
          // Smooth alpha fade out
          const fade = Math.max(0, 1 - Math.pow(progress, 1.6));
          _colorTempSmoke.multiplyScalar(fade);
          particleMesh.setColorAt(i, _colorTempSmoke);
        } else if (p.kind === 'spark') {
          _colorTempSmoke.copy(_colorFire).multiplyScalar(1 - progress);
          particleMesh.setColorAt(i, _colorTempSmoke);
        } else if (p.kind === 'repair') {
          _colorTempSmoke.copy(_colorRepair).multiplyScalar(1 - progress);
          particleMesh.setColorAt(i, _colorTempSmoke);
        } else {
          _colorTempSmoke.copy(_colorTrail).multiplyScalar((1 - progress) * 0.75);
          particleMesh.setColorAt(i, _colorTempSmoke);
        }
      }
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

      activeWorld?.update(dt, elapsed, allRepaired);

      _camTargetPos.set(
        sim.planePos.x * 0.78 - Math.sin(sim.yaw) * 3.5,
        sim.planePos.y + 3.45 - sim.pitch * 2.2,
        sim.planePos.z + 11.4
      );
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 6.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 10.5, dt);

      _camLookTarget.set(
        sim.planePos.x,
        sim.planePos.y + 0.65,
        sim.planePos.z - 14
      );
      camera.lookAt(_camLookTarget);
      camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, sim.roll * 0.22, 5, dt);

      const targetFov = sim.repairFlashTimer > 0 || sim.warpFlash > 0 ? 65 : 58;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();
      }

      soundEngine.updateEngine(sim.airspeed, st.isMalfunctioning);

      telemetryTimer += dt;
      if (telemetryTimer >= 0.15) {
        telemetryTimer = 0;
        st.onTelemetryUpdate({
          altitude: Math.max(0, Math.round((sim.planePos.y + 14) * 12)),
          airspeed: Math.round(sim.airspeed * 4.8),
          distanceToPortal: Math.round(distToPortal),
          portalUnlocked: allRepaired,
          isFalling: st.isMalfunctioning,
          hullIntegrity: Math.round(sim.hullIntegrity),
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      activeWorld?.dispose();
      activeSkyTex?.dispose();
      smokeTexture.dispose();
      envTex.dispose();
      biplane.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden"
      aria-label="3D pohľad z tretej osoby na let dvojplošníka"
    />
  );
};
