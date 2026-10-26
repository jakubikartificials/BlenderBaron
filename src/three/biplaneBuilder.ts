import * as THREE from 'three';
import { RepairVisualType } from '../types/game';

export interface BiplaneRig {
  root: THREE.Group;
  propellerGroup: THREE.Group;
  engineAssembly: THREE.Group;
  upperWingGroup: THREE.Group;
  lowerWingGroup: THREE.Group;
  rightOuterStrut: THREE.Mesh;
  tailGroup: THREE.Group;
  elevatorGroup: THREE.Group;
  rudderMesh: THREE.Mesh;
  landingGearGroup: THREE.Group;
  rightWingTipExtrude: THREE.Mesh;
  debrisBlock: THREE.Mesh;
  orangeOutlineGroup: THREE.Group;
  editModeOverlay: THREE.Group;
  axisGizmoGroup: THREE.Group;
  axisX: THREE.Line;
  axisY: THREE.Line;
  axisZ: THREE.Line;
  knifeCutLine: THREE.Line;
  update: (
    dt: number,
    elapsed: number,
    activeVisual: RepairVisualType | null,
    isFalling: boolean,
    repairFlashTimer: number,
    lastCompletedVisual: RepairVisualType | null
  ) => void;
  dispose: () => void;
}

function createWingHalfGeometry(span: number, chord: number, thickness: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const halfChord = chord * 0.5;
  const tipStart = span - 0.55;

  shape.moveTo(0, -halfChord);
  shape.lineTo(tipStart, -halfChord * 0.94);
  shape.lineTo(span - 0.18, -halfChord * 0.62);
  shape.lineTo(span, 0);
  shape.lineTo(span - 0.18, halfChord * 0.62);
  shape.lineTo(tipStart, halfChord * 0.94);
  shape.lineTo(0, halfChord);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, thickness * 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

function createRadialStarGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const points = 7;
  const outerR = 0.62;
  const innerR = 0.36;

  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 1,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function createFuselageGeometry(): THREE.BufferGeometry {
  const sections = [
    { z: -2.25, rx: 0.46, ryTop: 0.44, ryBot: 0.44 },
    { z: -1.15, rx: 0.62, ryTop: 0.56, ryBot: 0.54 },
    { z: 0.15, rx: 0.60, ryTop: 0.54, ryBot: 0.50 },
    { z: 1.65, rx: 0.40, ryTop: 0.42, ryBot: 0.34 },
    { z: 2.95, rx: 0.20, ryTop: 0.28, ryBot: 0.18 },
  ];

  const unitRing = [
    [-0.45, 1.0],
    [0.45, 1.0],
    [1.0, 0.32],
    [0.82, -0.78],
    [0.38, -1.0],
    [-0.38, -1.0],
    [-0.82, -0.78],
    [-1.0, 0.32],
  ];

  const silver = new THREE.Color('#bfc4cc');
  const silverBelly = new THREE.Color('#aeb4be');
  const purple = new THREE.Color('#6f1d7e');

  const positions: number[] = [];
  const colors: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    col: THREE.Color
  ) => {
    positions.push(...a, ...b, ...c);
    colors.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);
  };

  const getRingPts = (sec: typeof sections[0]): [number, number, number][] =>
    unitRing.map(([ux, uy]) => [
      ux * sec.rx,
      uy >= 0 ? uy * sec.ryTop : uy * sec.ryBot,
      sec.z,
    ]);

  for (let s = 0; s < sections.length - 1; s++) {
    const rA = getRingPts(sections[s]);
    const rB = getRingPts(sections[s + 1]);

    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8;
      const isPurpleFace = i === 1 || i === 7;
      const isBelly = i >= 3 && i <= 5;
      const faceCol = isPurpleFace ? purple : isBelly ? silverBelly : silver;

      pushTri(rA[i], rB[i], rB[next], faceCol);
      pushTri(rA[i], rB[next], rA[next], faceCol);
    }
  }

  const frontRing = getRingPts(sections[0]);
  const frontCenter: [number, number, number] = [0, 0, sections[0].z - 0.06];
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    pushTri(frontCenter, frontRing[next], frontRing[i], silverBelly);
  }

  const backRing = getRingPts(sections[sections.length - 1]);
  const backCenter: [number, number, number] = [0, 0.04, sections[sections.length - 1].z + 0.08];
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    pushTri(backCenter, backRing[i], backRing[next], silver);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createBiplane(): BiplaneRig {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();

  const fuselageMat = track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.46,
      metalness: 0.18,
      flatShading: true,
    })
  );

  const wingMat = track(
    new THREE.MeshStandardMaterial({
      color: '#cbd0d8',
      roughness: 0.52,
      metalness: 0.15,
      flatShading: true,
    })
  );

  const purpleTrimMat = track(
    new THREE.MeshStandardMaterial({
      color: '#6f1d7e',
      roughness: 0.38,
      metalness: 0.22,
      flatShading: true,
    })
  );

  const metalEngineMat = track(
    new THREE.MeshStandardMaterial({
      color: '#d4d9e2',
      roughness: 0.24,
      metalness: 0.72,
      flatShading: true,
    })
  );

  const woodPropMat = track(
    new THREE.MeshStandardMaterial({
      color: '#c4a27a',
      roughness: 0.65,
      metalness: 0.05,
      flatShading: true,
    })
  );

  const strutMat = track(
    new THREE.MeshStandardMaterial({
      color: '#17171c',
      roughness: 0.35,
      metalness: 0.55,
      flatShading: true,
    })
  );

  const tireMat = track(
    new THREE.MeshStandardMaterial({
      color: '#141418',
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    })
  );

  const leatherMat = track(
    new THREE.MeshStandardMaterial({
      color: '#4e2e18',
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
    })
  );

  const pilotSkinMat = track(
    new THREE.MeshStandardMaterial({
      color: '#cfa98a',
      roughness: 0.7,
      metalness: 0.02,
      flatShading: true,
    })
  );

  // Fuselage
  const fuselageGeo = track(createFuselageGeometry());
  const fuselageMesh = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselageMesh.castShadow = true;
  fuselageMesh.receiveShadow = true;
  root.add(fuselageMesh);

  // Cockpit & Pilot
  const cockpitGroup = new THREE.Group();
  cockpitGroup.position.set(0, 0.56, -0.52);
  const coamingGeo = track(new THREE.CylinderGeometry(0.32, 0.42, 0.24, 8));
  const coaming = new THREE.Mesh(coamingGeo, leatherMat);
  coaming.scale.set(0.95, 1, 1.35);
  cockpitGroup.add(coaming);

  const headGeo = track(new THREE.CylinderGeometry(0.18, 0.15, 0.28, 7));
  const pilotHead = new THREE.Mesh(headGeo, pilotSkinMat);
  pilotHead.position.set(0, 0.24, 0.02);
  cockpitGroup.add(pilotHead);

  const capGeo = track(new THREE.SphereGeometry(0.19, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.58));
  const pilotCap = new THREE.Mesh(capGeo, leatherMat);
  pilotCap.position.set(0, 0.34, 0.02);
  cockpitGroup.add(pilotCap);
  root.add(cockpitGroup);

  // Radial Engine & Propeller
  const engineAssembly = new THREE.Group();
  engineAssembly.position.set(0, 0, -2.38);

  const noseCollarGeo = track(new THREE.CylinderGeometry(0.36, 0.42, 0.22, 8));
  noseCollarGeo.rotateX(Math.PI / 2);
  const noseCollar = new THREE.Mesh(noseCollarGeo, metalEngineMat);
  noseCollar.position.z = 0.08;
  engineAssembly.add(noseCollar);

  const radialStarGeo = track(createRadialStarGeometry());
  const radialStar = new THREE.Mesh(radialStarGeo, metalEngineMat);
  radialStar.position.z = -0.06;
  radialStar.castShadow = true;
  engineAssembly.add(radialStar);

  const propellerGroup = new THREE.Group();
  propellerGroup.position.z = -0.26;

  const spinnerGeo = track(new THREE.ConeGeometry(0.14, 0.24, 8));
  spinnerGeo.rotateX(-Math.PI / 2);
  const spinner = new THREE.Mesh(spinnerGeo, metalEngineMat);
  propellerGroup.add(spinner);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.06, 0);
  bladeShape.lineTo(-0.13, 0.65);
  bladeShape.lineTo(-0.08, 1.18);
  bladeShape.lineTo(0.07, 1.15);
  bladeShape.lineTo(0.12, 0.55);
  bladeShape.lineTo(0.06, 0);
  bladeShape.closePath();

  const bladeGeo = track(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
    })
  );

  const blade1 = new THREE.Mesh(bladeGeo, woodPropMat);
  blade1.position.z = -0.02;
  blade1.rotation.y = 0.14;
  propellerGroup.add(blade1);

  const blade2 = new THREE.Mesh(bladeGeo, woodPropMat);
  blade2.rotation.z = Math.PI;
  blade2.rotation.y = -0.14;
  blade2.position.z = -0.02;
  propellerGroup.add(blade2);

  engineAssembly.add(propellerGroup);
  root.add(engineAssembly);

  // Wings
  const wingHalfGeo = track(createWingHalfGeometry(4.15, 1.38, 0.11));
  const dihedral = 0.048;

  const upperWingGroup = new THREE.Group();
  upperWingGroup.position.set(0, 1.24, -0.68);

  const upperRightWing = new THREE.Mesh(wingHalfGeo, wingMat);
  upperRightWing.rotation.z = dihedral;
  upperRightWing.castShadow = true;
  upperRightWing.receiveShadow = true;
  upperWingGroup.add(upperRightWing);

  const upperLeftWing = new THREE.Mesh(wingHalfGeo, wingMat);
  upperLeftWing.scale.x = -1;
  upperLeftWing.rotation.z = -dihedral;
  upperLeftWing.castShadow = true;
  upperLeftWing.receiveShadow = true;
  upperWingGroup.add(upperLeftWing);

  const centerBridgeGeo = track(new THREE.BoxGeometry(0.6, 0.12, 1.38));
  const upperBridge = new THREE.Mesh(centerBridgeGeo, wingMat);
  upperBridge.position.y = 0.055;
  upperWingGroup.add(upperBridge);

  const extrudeTipGeo = track(new THREE.BoxGeometry(0.75, 0.12, 1.15));
  const rightWingTipExtrude = new THREE.Mesh(extrudeTipGeo, wingMat);
  rightWingTipExtrude.position.set(3.85, 0.22, 0);
  rightWingTipExtrude.visible = false;
  upperWingGroup.add(rightWingTipExtrude);

  root.add(upperWingGroup);

  const lowerWingGroup = new THREE.Group();
  lowerWingGroup.position.set(0, -0.48, -0.68);

  const lowerRightWing = new THREE.Mesh(wingHalfGeo, wingMat);
  lowerRightWing.rotation.z = dihedral * 0.85;
  lowerRightWing.castShadow = true;
  lowerRightWing.receiveShadow = true;
  lowerWingGroup.add(lowerRightWing);

  const lowerLeftWing = new THREE.Mesh(wingHalfGeo, wingMat);
  lowerLeftWing.scale.x = -1;
  lowerLeftWing.rotation.z = -dihedral * 0.85;
  lowerLeftWing.castShadow = true;
  lowerLeftWing.receiveShadow = true;
  lowerWingGroup.add(lowerLeftWing);

  const lowerBridge = new THREE.Mesh(centerBridgeGeo, wingMat);
  lowerBridge.position.y = 0.055;
  lowerWingGroup.add(lowerBridge);
  root.add(lowerWingGroup);

  // Struts
  const strutGeo = track(new THREE.CylinderGeometry(0.032, 0.032, 1.74, 6));
  const strutPositionsX = [-3.05, -1.42, 1.42, 3.05];
  let rightOuterStrut!: THREE.Mesh;

  strutPositionsX.forEach((sx) => {
    const yLift = Math.abs(sx) * Math.sin(dihedral);
    const strut = new THREE.Mesh(strutGeo, strutMat);
    strut.position.set(sx, 0.39 + yLift, -0.68);
    strut.castShadow = true;
    root.add(strut);
    if (sx > 2.5) {
      rightOuterStrut = strut;
    }
  });

  // Tail
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.24, 2.58);

  const elevatorGroup = new THREE.Group();
  const hStabShape = new THREE.Shape();
  hStabShape.moveTo(-1.45, -0.15);
  hStabShape.lineTo(-1.18, -0.52);
  hStabShape.lineTo(1.18, -0.52);
  hStabShape.lineTo(1.45, -0.15);
  hStabShape.lineTo(1.38, 0.38);
  hStabShape.lineTo(-1.38, 0.38);
  hStabShape.closePath();

  const hStabGeo = track(
    new THREE.ExtrudeGeometry(hStabShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.02,
      bevelSegments: 1,
    })
  );
  hStabGeo.rotateX(Math.PI / 2);
  const hStabMesh = new THREE.Mesh(hStabGeo, [wingMat, purpleTrimMat]);
  hStabMesh.castShadow = true;
  elevatorGroup.add(hStabMesh);
  tailGroup.add(elevatorGroup);

  const finShape = new THREE.Shape();
  finShape.moveTo(-0.48, 0);
  finShape.lineTo(0.42, 0);
  finShape.lineTo(0.38, 0.85);
  finShape.lineTo(0.16, 1.15);
  finShape.lineTo(-0.14, 1.12);
  finShape.lineTo(-0.32, 0.78);
  finShape.closePath();

  const finGeo = track(
    new THREE.ExtrudeGeometry(finShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
    })
  );
  finGeo.rotateY(Math.PI / 2);
  finGeo.translate(-0.045, 0.02, 0);
  const rudderMesh = new THREE.Mesh(finGeo, wingMat);
  rudderMesh.castShadow = true;
  tailGroup.add(rudderMesh);

  const skidGeo = track(new THREE.CylinderGeometry(0.03, 0.018, 0.62, 6));
  const tailSkid = new THREE.Mesh(skidGeo, strutMat);
  tailSkid.position.set(0, -0.48, 0.08);
  tailSkid.rotation.x = -0.68;
  tailGroup.add(tailSkid);

  root.add(tailGroup);

  // Landing Gear
  const landingGearGroup = new THREE.Group();
  landingGearGroup.position.set(0, -0.52, -0.92);

  const legGeo = track(new THREE.BoxGeometry(0.11, 1.24, 0.42));
  const wheelGeo = track(new THREE.CylinderGeometry(0.38, 0.38, 0.16, 10));
  wheelGeo.rotateZ(Math.PI / 2);

  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(legGeo, wingMat);
    leg.position.set(side * 0.72, -0.52, -0.12);
    leg.rotation.z = side * 0.46;
    leg.rotation.x = 0.18;
    leg.castShadow = true;
    landingGearGroup.add(leg);

    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(side * 1.06, -1.04, -0.24);
    wheel.castShadow = true;
    landingGearGroup.add(wheel);
  });
  root.add(landingGearGroup);

  // Debris block (Task 10 Delete X)
  const debrisGeo = track(new THREE.DodecahedronGeometry(0.58, 0));
  const debrisMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#991b1b',
      emissiveIntensity: 0.45,
      roughness: 0.4,
      flatShading: true,
    })
  );
  const debrisBlock = new THREE.Mesh(debrisGeo, debrisMat);
  debrisBlock.position.set(0.35, 0.32, -2.15);
  debrisBlock.visible = false;
  root.add(debrisBlock);

  // Selection Wireframes & Overlays
  const orangeOutlineGroup = new THREE.Group();
  const orangeLineMat = track(
    new THREE.LineBasicMaterial({
      color: '#ff8c1a',
      transparent: true,
      opacity: 0.95,
    })
  );
  const fuselageEdges = track(new THREE.EdgesGeometry(fuselageGeo, 12));
  orangeOutlineGroup.add(new THREE.LineSegments(fuselageEdges, orangeLineMat));

  const wingBoxProxy = track(new THREE.BoxGeometry(8.3, 0.16, 1.42));
  const wingEdges = track(new THREE.EdgesGeometry(wingBoxProxy));
  const topWingWire = new THREE.LineSegments(wingEdges, orangeLineMat);
  topWingWire.position.set(0, 1.32, -0.68);
  orangeOutlineGroup.add(topWingWire);
  orangeOutlineGroup.visible = false;
  root.add(orangeOutlineGroup);

  const editModeOverlay = new THREE.Group();
  const editWireMat = track(
    new THREE.LineBasicMaterial({ color: '#111827', transparent: true, opacity: 0.85 })
  );
  editModeOverlay.add(new THREE.LineSegments(fuselageEdges, editWireMat));

  const vertsMat = track(
    new THREE.PointsMaterial({
      color: '#ff9900',
      size: 0.14,
      sizeAttenuation: true,
    })
  );
  const fuselageVerts = new THREE.Points(fuselageGeo, vertsMat);
  editModeOverlay.add(fuselageVerts);
  editModeOverlay.visible = false;
  root.add(editModeOverlay);

  // Axis Gizmos
  const axisGizmoGroup = new THREE.Group();
  const makeAxisLine = (dir: THREE.Vector3, hex: string): THREE.Line => {
    const g = track(
      new THREE.BufferGeometry().setFromPoints([
        dir.clone().multiplyScalar(-6.5),
        dir.clone().multiplyScalar(6.5),
      ])
    );
    const m = track(new THREE.LineBasicMaterial({ color: hex }));
    const line = new THREE.Line(g, m);
    line.visible = false;
    axisGizmoGroup.add(line);
    return line;
  };

  const axisX = makeAxisLine(new THREE.Vector3(1, 0, 0), '#ff3352');
  const axisY = makeAxisLine(new THREE.Vector3(0, 1, 0), '#8bdc00');
  const axisZ = makeAxisLine(new THREE.Vector3(0, 0, 1), '#2890ff');
  root.add(axisGizmoGroup);

  const knifeGeo = track(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.6, 1.38, -1.35),
      new THREE.Vector3(-1.8, 1.38, -0.02),
      new THREE.Vector3(1.8, 1.38, -1.35),
      new THREE.Vector3(2.6, 1.38, -0.02),
    ])
  );
  const knifeMat = track(new THREE.LineBasicMaterial({ color: '#34d399' }));
  const knifeCutLine = new THREE.Line(knifeGeo, knifeMat);
  knifeCutLine.visible = false;
  root.add(knifeCutLine);

  const update = (
    dt: number,
    elapsed: number,
    activeVisual: RepairVisualType | null,
    isFalling: boolean,
    repairFlashTimer: number,
    lastCompletedVisual: RepairVisualType | null
  ) => {
    const propSpeed = isFalling ? 9 + Math.sin(elapsed * 22) * 5 : 32;
    propellerGroup.rotation.z += propSpeed * dt;

    rightOuterStrut.visible = activeVisual !== RepairVisualType.DUPLICATE_STRUT;
    rudderMesh.rotation.y = THREE.MathUtils.damp(
      rudderMesh.rotation.y,
      activeVisual === RepairVisualType.ROTATE_PROP ? 0.58 : 0,
      8,
      dt
    );
    engineAssembly.position.x = THREE.MathUtils.damp(
      engineAssembly.position.x,
      activeVisual === RepairVisualType.GRAB_ENGINE ? 0.68 : 0,
      8,
      dt
    );
    engineAssembly.position.y = THREE.MathUtils.damp(
      engineAssembly.position.y,
      activeVisual === RepairVisualType.GRAB_ENGINE ? -0.42 : 0,
      8,
      dt
    );

    const targetWingScale = activeVisual === RepairVisualType.SCALE_WINGS ? 0.62 : 1.0;
    upperWingGroup.scale.x = THREE.MathUtils.damp(upperWingGroup.scale.x, targetWingScale, 8, dt);
    lowerWingGroup.scale.x = THREE.MathUtils.damp(lowerWingGroup.scale.x, targetWingScale, 8, dt);

    fuselageMesh.rotation.z =
      activeVisual === RepairVisualType.CANCEL_GLITCH ? Math.sin(elapsed * 18) * 0.22 : 0;

    elevatorGroup.rotation.x = THREE.MathUtils.damp(
      elevatorGroup.rotation.x,
      activeVisual === RepairVisualType.ROTATE_X ? 0.65 : 0,
      8,
      dt
    );

    upperWingGroup.position.y = THREE.MathUtils.damp(
      upperWingGroup.position.y,
      activeVisual === RepairVisualType.GRAB_Z ? 0.64 : 1.24,
      8,
      dt
    );

    const squashScale = activeVisual === RepairVisualType.SCALE_PLANE ? 0.72 : 1.0;
    fuselageMesh.scale.set(
      THREE.MathUtils.damp(fuselageMesh.scale.x, squashScale, 8, dt),
      THREE.MathUtils.damp(fuselageMesh.scale.y, activeVisual === RepairVisualType.MERGE_VERTICES ? 1.18 : 1.0, 8, dt),
      1.0
    );

    debrisBlock.visible = activeVisual === RepairVisualType.DELETE_DEBRIS;
    if (debrisBlock.visible) {
      debrisBlock.rotation.x += dt * 3;
      debrisBlock.rotation.y += dt * 2.4;
    }

    upperRightWing.scale.x = THREE.MathUtils.damp(
      upperRightWing.scale.x,
      activeVisual === RepairVisualType.EXTRUDE_X ? 0.72 : 1.0,
      8,
      dt
    );
    rightWingTipExtrude.visible =
      repairFlashTimer > 0 && lastCompletedVisual === RepairVisualType.EXTRUDE_X;

    landingGearGroup.position.x =
      activeVisual === RepairVisualType.SELECT_LINKED ? Math.sin(elapsed * 30) * 0.08 : 0;

    const showEditCage =
      activeVisual === RepairVisualType.EDIT_MODE ||
      activeVisual === RepairVisualType.SLIDE_VERTEX ||
      activeVisual === RepairVisualType.SELECT_ELEMENTS ||
      activeVisual === RepairVisualType.MERGE_VERTICES ||
      activeVisual === RepairVisualType.KNIFE_CUT ||
      (repairFlashTimer > 0 && lastCompletedVisual === RepairVisualType.EDIT_MODE);

    editModeOverlay.visible = showEditCage;
    orangeOutlineGroup.visible = isFalling || repairFlashTimer > 0;
    knifeCutLine.visible =
      activeVisual === RepairVisualType.KNIFE_CUT ||
      (repairFlashTimer > 0 && lastCompletedVisual === RepairVisualType.KNIFE_CUT);

    const currentFocus = repairFlashTimer > 0 ? lastCompletedVisual : activeVisual;
    axisX.visible =
      currentFocus === RepairVisualType.ROTATE_X ||
      currentFocus === RepairVisualType.EXTRUDE_X ||
      currentFocus === RepairVisualType.SCALE_PLANE;
    axisY.visible = currentFocus === RepairVisualType.SCALE_PLANE;
    axisZ.visible =
      currentFocus === RepairVisualType.GRAB_Z || currentFocus === RepairVisualType.ROTATE_PROP;
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    root,
    propellerGroup,
    engineAssembly,
    upperWingGroup,
    lowerWingGroup,
    rightOuterStrut,
    tailGroup,
    elevatorGroup,
    rudderMesh,
    landingGearGroup,
    rightWingTipExtrude,
    debrisBlock,
    orangeOutlineGroup,
    editModeOverlay,
    axisGizmoGroup,
    axisX,
    axisY,
    axisZ,
    knifeCutLine,
    update,
    dispose,
  };
}
