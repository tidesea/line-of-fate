import * as THREE from "three";
import type { LevelDefinition } from "../config/levels.config";
import type { CombatFx, FloatingAnchor, UnitState } from "../core/types";
import { GridSystem } from "../core/GridSystem";
import { BoardRenderer } from "./BoardRenderer";

type Cell = { col: number; row: number };

export class SceneManager {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-8.7, 8.7, 5.2, -5.2, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly clock = new THREE.Clock();
  private readonly board: BoardRenderer;
  private readonly resizeObserver: ResizeObserver;
  private frame = 0;
  private animationId = 0;
  private zoom = 1;
  private pinchDistance = 0;
  private pinchStartZoom = 1;

  constructor(
    private container: HTMLDivElement,
    private level: LevelDefinition,
    private onClickCell: (cell: Cell) => void,
    private onHoverCell: (cell: Cell | null) => void,
    private onProjection: (anchors: FloatingAnchor[]) => void,
    private onZoomChange: (zoom: number) => void,
  ) {
    // Slightly cooler night-ops backdrop; soft fog keeps distant clutter readable.
    this.scene.background = new THREE.Color(0x0e1612);
    const mapSpan = Math.max(level.cols, level.rows);
    this.scene.fog = new THREE.Fog(0x0e1612, mapSpan * 1.25, mapSpan * 3.1);
    this.camera.position.set(mapSpan * 0.78, mapSpan * 0.82, mapSpan * 0.78);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xfff5e8, 0x1a2a22, 1.05));
    const key = new THREE.DirectionalLight(0xfff0da, 2.35);
    key.position.set(5, 13, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x57beff, 0.9); rim.position.set(-8, 4, -8); this.scene.add(rim);
    // Soft fill so toon bands don't crush into black on the shadow side.
    const fill = new THREE.DirectionalLight(0xb8ff9a, 0.28); fill.position.set(-2, 6, 8); this.scene.add(fill);

    this.board = new BoardRenderer(this.scene, level);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.domElement.addEventListener("pointermove", this.handleMove);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.addEventListener("click", this.handleClick);
    this.renderer.domElement.addEventListener("wheel", this.handleWheel, { passive: false });
    this.renderer.domElement.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.renderer.domElement.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.renderer.domElement.addEventListener("touchend", this.handleTouchEnd);
    this.resize();
    this.animate();
  }

  sync(units: UnitState[], activeUnitId: string | null, playerFaction: string, consumedCrates: string[], moves: Cell[], attacks: Cell[], hover: Cell | null, zoom: number, fx: CombatFx | null) {
    this.board.syncUnits(units, activeUnitId, playerFaction, consumedCrates);
    const active = units.find(unit => unit.id === activeUnitId && unit.hp > 0);
    this.board.setHighlights(moves, attacks, hover, active ? { col: active.col, row: active.row } : null);
    if (fx) this.board.playFx(fx);
    this.setZoom(zoom, false);
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    const aspect = width / Math.max(1, height);
    const span = this.level.cols + this.level.rows;
    const heightView = Math.max(10, span * 0.44 + 1.5, (span * 0.7) / Math.max(0.65, aspect) + 1.5);
    this.camera.left = -(heightView * aspect) / 2;
    this.camera.right = (heightView * aspect) / 2;
    this.camera.top = heightView / 2;
    this.camera.bottom = -heightView / 2;
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
  }

  private pick(event: Pick<MouseEvent | PointerEvent, "clientX" | "clientY">) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // Cell-based picking: intersect the ground plane only. Unit sprites / tall
    // meshes never steal clicks from neighbouring cells.
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    const col = Math.round(hit.x + (this.level.cols - 1) / 2);
    const row = Math.round(hit.z + (this.level.rows - 1) / 2);
    return GridSystem.inBounds(col, row, this.level) ? { col, row } : null;
  }

  private handleMove = (event: PointerEvent) => { if (event.pointerType === "mouse") this.onHoverCell(this.pick(event)); };
  private handleClick = (event: MouseEvent) => { const cell = this.pick(event); if (cell) this.onClickCell(cell); };
  private handleWheel = (event: WheelEvent) => { event.preventDefault(); this.setZoom(this.zoom + (event.deltaY < 0 ? 0.12 : -0.12)); };
  private handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    this.pinchDistance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    this.pinchStartZoom = this.zoom;
  };
  private handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || this.pinchDistance <= 0) return;
    event.preventDefault();
    const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    this.setZoom(this.pinchStartZoom * (distance / this.pinchDistance));
  };
  private handleTouchEnd = () => { this.pinchDistance = 0; };

  private setZoom(value: number, emit = true) {
    const next = Math.min(2.4, Math.max(0.72, Number(value.toFixed(2))));
    if (Math.abs(next - this.zoom) < 0.005) return;
    this.zoom = next;
    this.camera.zoom = next;
    this.camera.updateProjectionMatrix();
    if (emit) this.onZoomChange(next);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.frame += 1;
    this.board.tick(this.clock.getElapsedTime());
    if (this.frame % 6 === 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const anchors: FloatingAnchor[] = [];
      this.board.getUnitGroups().forEach((group, id) => {
        const p = group.position.clone(); p.y += ((group.userData.baseScale as number) ?? 1) * 1.05 + 0.2; p.project(this.camera);
        anchors.push({ id, x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height, visible: p.z >= -1 && p.z <= 1 });
      });
      this.onProjection(anchors);
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener("pointermove", this.handleMove);
    this.renderer.domElement.removeEventListener("click", this.handleClick);
    this.renderer.domElement.removeEventListener("wheel", this.handleWheel);
    this.renderer.domElement.removeEventListener("touchstart", this.handleTouchStart);
    this.renderer.domElement.removeEventListener("touchmove", this.handleTouchMove);
    this.renderer.domElement.removeEventListener("touchend", this.handleTouchEnd);
    this.board.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
