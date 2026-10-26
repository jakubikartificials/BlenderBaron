import * as THREE from 'three';
import { EnvironmentStyle } from '../types/game';

export const PORTAL_Z = -440;
export const SPAWN_Z = 35;

export interface BuiltWorld {
  group: THREE.Group;
  portalGroup: THREE.Group;
  update: (dt: number, elapsed: number, portalUnlocked: boolean) => void;
  dispose: () => void;
}

// Deterministic pseudo-random helper so each world's mountain peaks & city towers look sculptural and consistent
function seededNoise(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 0.043 + seed) * Math.cos(z * 0.037 - seed * 0.7) +
    0.5 * Math.sin(x * 0.095 - z * 0.082 + seed * 1.9);
  return n;
}

function createFracturedStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pale slate stone base matching land05_b0c1403d.png
  ctx.fillStyle = '#aeb6c2';
  ctx.fillRect(0, 0, 512, 512);

  // Staggered geometric rock slabs & dark charcoal crevices
  const rows = 12;
  const rowH = 512 / rows;
  ctx.strokeStyle = '#1f252d';
  ctx.lineWidth = 7;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (r % 2 === 0 ? 4 : -4));
    ctx.stroke();

    const cols = 6;
    const offset = (r % 2) * 42;
    for (let c = 0; c <= cols; c++) {
      const x = ((c * (512 / cols) + offset) % 512);
      // Slight tone variation per slab
      ctx.fillStyle = (r + c) % 3 === 0 ? '#9da6b4' : (r + c) % 2 === 0 ? '#bac2ce' : '#8b94a3';
      ctx.fillRect(x + 4, y + 4, 512 / cols - 8, rowH - 8);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (c % 2 === 0 ? 6 : -6), y + rowH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 24);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function buildWorldEnvironment(
  style: EnvironmentStyle,
  portalPrimaryHex: string,
  portalSecondaryHex: string,
  maxAnisotropy: number
): BuiltWorld {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const group = new THREE.Group();

  // 1. Environment Terrain & Landmarks matching land01 - land05
  if (style === EnvironmentStyle.CUBIC_METROPOLIS) {
    // Level 3: Blocky Brutalist Cubic City matching land04_3ddf8557.png
    const basePlaneGeo = track(new THREE.PlaneGeometry(520, 820));
    basePlaneGeo.rotateX(-Math.PI / 2);
    const baseMat = track(
      new THREE.MeshStandardMaterial({
        color: '#262b34',
        roughness: 0.82,
        metalness: 0.15,
      })
    );
    const ground = new THREE.Mesh(basePlaneGeo, baseMat);
    ground.position.set(0, -14, -230);
    ground.receiveShadow = true;
    group.add(ground);

    const cubeGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const cubeMat = track(
      new THREE.MeshStandardMaterial({
        roughness: 0.65,
        metalness: 0.22,
        flatShading: true,
      })
    );

    const blockCount = 340;
    const cityInstanced = new THREE.InstancedMesh(cubeGeo, cubeMat, blockCount);
    cityInstanced.castShadow = true;
    cityInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const palette = [
      new THREE.Color('#3b3734'),
      new THREE.Color('#475569'),
      new THREE.Color('#2d333d'),
      new THREE.Color('#524b42'),
      new THREE.Color('#334155'),
    ];

    let idx = 0;
    for (let z = 60; z > -620 && idx < blockCount; z -= 18) {
      for (let b = 0; b < 9 && idx < blockCount; b++) {
        // Leave central flight canyon passable while framing it dramatically with stepped towers
        const side = b % 2 === 0 ? -1 : 1;
        const distFromCenter = b < 2 ? (Math.random() - 0.5) * 32 : side * (22 + Math.floor(b / 2) * 20 + (b % 3) * 6);
        const isCenterLowPlaza = Math.abs(distFromCenter) < 19;

        const w = 14 + ((idx * 7) % 14);
        const d = 14 + ((idx * 11) % 14);
        const h = isCenterLowPlaza ? 4 + (idx % 6) : 18 + ((idx * 17) % 54);

        dummy.position.set(distFromCenter, -14 + h * 0.5, z + ((b * 5) % 12));
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();
        cityInstanced.setMatrixAt(idx, dummy.matrix);
        cityInstanced.setColorAt(idx, palette[idx % palette.length]);
        idx++;
      }
    }
    cityInstanced.count = idx;
    cityInstanced.instanceMatrix.needsUpdate = true;
    if (cityInstanced.instanceColor) cityInstanced.instanceColor.needsUpdate = true;
    cityInstanced.computeBoundingSphere();
    group.add(cityInstanced);
  } else {
    // Sculpted Heightfield Mesh for land01/02 (Sunlit Peaks), land03 (Smooth Synth Dunes), land05 (Fractured Canyon), and World 5
    const segX = style === EnvironmentStyle.SYNTH_DUNES ? 72 : 52;
    const segZ = style === EnvironmentStyle.SYNTH_DUNES ? 110 : 80;
    const width = 460;
    const length = 780;

    const planeGeo = new THREE.PlaneGeometry(width, length, segX, segZ);
    planeGeo.rotateX(-Math.PI / 2);

    const isSmoothDunes = style === EnvironmentStyle.SYNTH_DUNES;
    const isFractured = style === EnvironmentStyle.FRACTURED_CANYON;
    const terrainGeo = isSmoothDunes ? track(planeGeo) : track(planeGeo.toNonIndexed());
    if (!isSmoothDunes) planeGeo.dispose();

    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    const cLow = new THREE.Color();
    const cMid = new THREE.Color();
    const cHigh = new THREE.Color();
    const cPeak = new THREE.Color();
    const tempCol = new THREE.Color();

    if (style === EnvironmentStyle.SUNLIT_PEAKS) {
      // Matches land01_5dd48b02.png & land02_54e543e8.png: Deep red -> warm orange -> gold -> vibrant green peaks!
      cLow.set('#9a1c14');
      cMid.set('#d97706');
      cHigh.set('#eab308');
      cPeak.set('#4ade80');
    } else if (style === EnvironmentStyle.SYNTH_DUNES) {
      // Matches land03_409ea9db.png: Deep indigo/blue -> rich magenta/crimson -> luminous teal-cyan!
      cLow.set('#1e1b4b');
      cMid.set('#831843');
      cHigh.set('#be185d');
      cPeak.set('#14b8a6');
    } else if (style === EnvironmentStyle.FRACTURED_CANYON) {
      // Matches land05_b0c1403d.png: Pale alpine stone with slate contrast
      cLow.set('#94a3b8');
      cMid.set('#cbd5e1');
      cHigh.set('#e2e8f0');
      cPeak.set('#f8fafc');
    } else {
      // Finale Sanctuary: Azure lagoon -> golden sand -> emerald alpine spires
      cLow.set('#0284c7');
      cMid.set('#fcd34d');
      cHigh.set('#34d399');
      cPeak.set('#fef08a');
    }

    const seed =
      style === EnvironmentStyle.SUNLIT_PEAKS
        ? 1.2
        : style === EnvironmentStyle.SYNTH_DUNES
        ? 4.7
        : style === EnvironmentStyle.FRACTURED_CANYON
        ? 8.3
        : 12.1;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // Carve a scenic central flight valley around x = 0 so the biplane flies between soaring mountain ridges
      const valleyFactor = THREE.MathUtils.smoothstep(Math.abs(vx), 14, 78);
      const rawNoise = seededNoise(vx, vz, seed);

      let height = -14;
      if (style === EnvironmentStyle.SUNLIT_PEAKS) {
        // Sharp crystalline Blender-style peaks on both sides
        const spike = Math.pow(Math.max(0, rawNoise + 0.65), 2.15) * 34;
        height = -14 + valleyFactor * spike + (1 - valleyFactor) * Math.max(0, rawNoise) * 3.5;
      } else if (style === EnvironmentStyle.SYNTH_DUNES) {
        // Smooth flowing dunes
        const wave = (Math.sin(vx * 0.055) * Math.cos(vz * 0.045) + 1) * 0.5;
        height = -13 + valleyFactor * (wave * 32 + Math.max(0, rawNoise) * 18) + (1 - valleyFactor) * wave * 4;
      } else if (style === EnvironmentStyle.FRACTURED_CANYON) {
        // Flat cobbled canyon floor with towering steep rock walls
        const spire = Math.pow(Math.max(0, rawNoise + 0.55), 2.3) * 38;
        height = -13 + valleyFactor * spire;
      } else {
        const island = Math.pow(Math.max(0, rawNoise + 0.5), 1.9) * 28;
        height = -14 + valleyFactor * island;
      }

      // Keep clear approach right around the circular portal at PORTAL_Z
      const distToPortal = Math.hypot(vx, vz - PORTAL_Z + 230);
      if (Math.abs(vz - (PORTAL_Z + 230)) < 38 && Math.abs(vx) < 34) {
        height = Math.min(height, -11);
      }
      void distToPortal;

      posAttr.setY(i, height);

      const t = THREE.MathUtils.clamp((height + 14) / 52, 0, 1);
      if (isSmoothDunes) {
        // Rich lateral + vertical multi-tone vertex blend like land03
        const patch = (Math.sin(vx * 0.07 + vz * 0.05) + 1) * 0.5;
        if (patch < 0.33) tempCol.copy(cLow).lerp(cMid, t);
        else if (patch < 0.68) tempCol.copy(cMid).lerp(cHigh, t);
        else tempCol.copy(cMid).lerp(cPeak, Math.min(1, t * 1.35));
      } else {
        if (t < 0.35) tempCol.copy(cLow).lerp(cMid, t / 0.35);
        else if (t < 0.72) tempCol.copy(cMid).lerp(cHigh, (t - 0.35) / 0.37);
        else tempCol.copy(cHigh).lerp(cPeak, (t - 0.72) / 0.28);
      }

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    let stoneMap: THREE.CanvasTexture | null = null;
    if (isFractured) {
      stoneMap = track(createFracturedStoneTexture(maxAnisotropy));
    }

    const terrainMat = track(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: stoneMap,
        roughness: isSmoothDunes ? 0.36 : 0.72,
        metalness: isSmoothDunes ? 0.22 : 0.08,
        flatShading: !isSmoothDunes,
      })
    );

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.set(0, 0, -230);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);
  }

  // 2. Instanced Low-Poly Floating Clouds across the sky corridor
  const cloudGeo = track(new THREE.DodecahedronGeometry(3.4, 0));
  const cloudMat = track(
    new THREE.MeshStandardMaterial({
      color: style === EnvironmentStyle.SYNTH_DUNES ? '#f5d0fe' : '#f8fafc',
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    })
  );
  const cloudCount = 56;
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
  const cloudDummy = new THREE.Object3D();
  for (let i = 0; i < cloudCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    cloudDummy.position.set(
      side * (24 + ((i * 13) % 75)),
      22 + ((i * 7) % 24),
      30 - i * 11.5
    );
    cloudDummy.scale.set(
      1.6 + (i % 3) * 0.65,
      0.55 + (i % 2) * 0.25,
      1.2 + (i % 4) * 0.4
    );
    cloudDummy.rotation.y = i * 0.6;
    cloudDummy.updateMatrix();
    clouds.setMatrixAt(i, cloudDummy.matrix);
  }
  clouds.instanceMatrix.needsUpdate = true;
  clouds.computeBoundingSphere();
  group.add(clouds);

  // 3. Subtle Guide Flight Rings leading toward the end-of-level Circular Portal
  const guideRingGeo = track(new THREE.TorusGeometry(6.5, 0.16, 8, 24));
  const guideRingMat = track(
    new THREE.MeshStandardMaterial({
      color: portalSecondaryHex,
      emissive: portalSecondaryHex,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.5,
    })
  );
  [-80, -195, -315].forEach((rz, idx) => {
    const ring = new THREE.Mesh(guideRingGeo, guideRingMat);
    ring.position.set(idx === 1 ? 5 : idx === 2 ? -5 : 0, 8 + idx * 1.2, rz);
    group.add(ring);
  });

  // 4. Monumental End-of-Level Circular Portal at PORTAL_Z
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 9.5, PORTAL_Z);

  const outerRingGeo = track(new THREE.TorusGeometry(14.5, 1.15, 10, 32));
  const frameMat = track(
    new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.28,
      metalness: 0.78,
      flatShading: true,
    })
  );
  const outerRing = new THREE.Mesh(outerRingGeo, frameMat);
  outerRing.castShadow = true;
  portalGroup.add(outerRing);

  // Rotating inner energy ring
  const innerRingGeo = track(new THREE.TorusGeometry(12.6, 0.45, 8, 28));
  const innerRingMat = track(
    new THREE.MeshStandardMaterial({
      color: portalPrimaryHex,
      emissive: portalPrimaryHex,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4,
      flatShading: true,
    })
  );
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  portalGroup.add(innerRing);

  // 12 radial portal teeth around the circular frame
  const toothGeo = track(new THREE.BoxGeometry(1.1, 2.4, 1.8));
  const teethGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, frameMat);
    tooth.position.set(Math.cos(angle) * 14.5, Math.sin(angle) * 14.5, 0);
    tooth.rotation.z = angle + Math.PI / 2;
    teethGroup.add(tooth);
  }
  portalGroup.add(teethGroup);

  // Swirling Circular Portal Vortex Shader Disc
  const vortexGeo = track(new THREE.CircleGeometry(12.3, 36));
  const primaryColor = new THREE.Color(portalPrimaryHex);
  const secondaryColor = new THREE.Color(portalSecondaryHex);
  const lockedColor = new THREE.Color('#f59e0b');
  const lockedCore = new THREE.Color('#ef4444');

  const vortexUniforms = {
    uTime: { value: 0 },
    uUnlocked: { value: 0 },
    uColorA: { value: primaryColor },
    uColorB: { value: secondaryColor },
    uLockedA: { value: lockedColor },
    uLockedB: { value: lockedCore },
  };

  const vortexMat = track(
    new THREE.ShaderMaterial({
      uniforms: vortexUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uUnlocked;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uLockedA;
        uniform vec3 uLockedB;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          if (r > 1.0) discard;

          float angle = atan(p.y, p.x);
          float swirl = sin(r * 14.0 - uTime * 4.2 + angle * 4.0) * 0.5 + 0.5;
          float rings = sin(r * 22.0 - uTime * 5.5) * 0.5 + 0.5;

          vec3 openCol = mix(uColorA, uColorB, swirl * 0.7 + rings * 0.3);
          vec3 lockCol = mix(uLockedB, uLockedA, rings);
          vec3 finalCol = mix(lockCol, openCol, uUnlocked);

          float rimGlow = smoothstep(0.68, 0.99, r);
          finalCol += rimGlow * 0.45;

          float alpha = mix(0.42, 0.76, swirl) * (0.45 + 0.55 * r);
          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
    })
  );

  const vortexDisc = new THREE.Mesh(vortexGeo, vortexMat);
  vortexDisc.renderOrder = 4;
  portalGroup.add(vortexDisc);

  group.add(portalGroup);

  const update = (dt: number, elapsed: number, portalUnlocked: boolean) => {
    vortexUniforms.uTime.value = elapsed;
    vortexUniforms.uUnlocked.value = THREE.MathUtils.damp(
      vortexUniforms.uUnlocked.value,
      portalUnlocked ? 1.0 : 0.0,
      5,
      dt
    );
    innerRing.rotation.z = elapsed * (portalUnlocked ? 1.4 : 0.35);
    teethGroup.rotation.z = -elapsed * (portalUnlocked ? 0.45 : 0.12);
    innerRingMat.color.copy(portalUnlocked ? primaryColor : lockedColor);
    innerRingMat.emissive.copy(portalUnlocked ? primaryColor : lockedCore);
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    group,
    portalGroup,
    update,
    dispose,
  };
}
