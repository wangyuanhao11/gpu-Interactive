import { Component, OnInit } from '@angular/core';
import { GPUComputationRenderer, Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { VertexColors, ShaderMaterial, Vector2 } from 'three';
import { map, mapTo, takeUntil, switchMap, scan } from 'rxjs/operators';
import { fromEvent, Subject, merge, Observable } from 'rxjs';
import { Raycaster, Vector3, Object3D } from 'three';
export interface Ng3MosueDragEvent {
  origin: Vector2;
  current: Vector2;
  last: Vector2;
  tag: 'mouseup' | 'mousedown' | 'mousemove' | 'mouseleave' | 'mouseenter';
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  WIDTH = 128;
  BOUNDS = 512;
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  mouseMoved = false;
  mouseCoords = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  container: HTMLElement;
  stats: Stats;
  controls: OrbitControls;

  gpuCompute: any;
  heightmapVariable: Variable;
  material: ShaderMaterial;
  move?: Observable<Event>;
  mesh: THREE.Mesh;
  waterUniforms: any;
  drag$: Observable<Ng3MosueDragEvent>;
  up$: Observable<{
    position: Vector2;
    tag: "mouseup" | "mousedown" | "mousemove" | "mouseleave" | "mouseenter";
}>;
  stop = new Subject<void>();
  leave$ : Observable<{
    position: Vector2;
    tag: "mouseup" | "mousedown" | "mousemove" | "mouseleave" | "mouseenter";
}>;
  down$ : Observable<{
    position: Vector2;
    tag: "mouseup" | "mousedown" | "mousemove" | "mouseleave" | "mouseenter";
}>;

  position$ : Observable<{
    position: Vector2;
    tag: "mouseup" | "mousedown" | "mousemove" | "mouseleave" | "mouseenter";
}>;


  constructor() {

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    
    this.up$ = this.fromEventCurrentPosition('mouseup')
    .pipe

    ();
    this.leave$ = this.fromEventCurrentPosition('mouseleave')
    .pipe
    // sampleTime(sampleTimeInW.mouseEvent),
    ();
    this.down$ = this.fromEventCurrentPosition('mousedown')
    .pipe
    // sampleTime(sampleTimeInW.mouseEvent),
    ();

    this.position$ = this.fromEventCurrentPosition('mousemove')
    .pipe
    // sampleTime(sampleTimeInW.mouseEvent),
    ();
    this.drag$ = this.createDrag$();

    
  }
  ngOnInit(): void {
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.minDistance = 100;
    // this.controls.maxDistance = 1000;

    // this.move =
    //     fromEvent(this.renderer.domElement, 'mousemove');
    //   this.move.subscribe(x => {
    //     // this.onDocumentMouseMove((x as MouseEvent).clientX, (x as MouseEvent).clientY);
    //     this.onDocumentMouseMove((x as MouseEvent).clientX!, (x as MouseEvent).clientY!);
    //   })

    this.drag$.subscribe(
      (p) => {
        console.log(p);
        const point = new Vector2(p.current.x, p.current.y);
        this.onDocumentMouseMove(point.x, point.y);
      },
      e => console.error(e)
    )

    this.init();
    this.render();
  }

  init() {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera.position.set(0, 0, 350);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);


    this.stats = Stats();
    this.container.appendChild(this.stats.dom);
    this.shader();
  }

  shader() {
    let geometry = new THREE.PlaneBufferGeometry(512, 512);
    this.material = new THREE.ShaderMaterial({
      uniforms: { "colortexture": { value: null }, "liping": { value: null } },
      vertexShader: Vertex,
      fragmentShader: fragment,
    });
    this.waterUniforms = this.material.uniforms;
    // let blueMaterial = new THREE.MeshBasicMaterial({color:0x7074FF});
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.z = - 10;
    this.scene.add(this.mesh);

    this.gpuCompute = new GPUComputationRenderer(this.WIDTH * 18, this.WIDTH * 18, this.renderer);
    if (this.isSafari()) {

      this.gpuCompute.setDataType(THREE.HalfFloatType);

    }
    var heightmap0 = this.gpuCompute.createTexture();

    this.heightmapVariable = this.gpuCompute.addVariable("heightmap", heightmapFragmentShader, heightmap0)
    this.gpuCompute.setVariableDependencies(this.heightmapVariable, [this.heightmapVariable]);
    this.heightmapVariable.material.uniforms["mousePos"] = { value: new THREE.Vector2(10000, 10000) };
    this.heightmapVariable.material.defines.BOUNDS = this.BOUNDS.toFixed(1);
    var error = this.gpuCompute.init();
    if (error !== null) {

      console.error(error);

    }
  }

  onDocumentMouseMove(x: number, y: number) {
    let a = x; let b = y;
    this.setMouseCoords(a, b);

  }
  setMouseCoords(x: number, y: number) {

    this.mouseCoords.set((x / this.renderer.domElement.clientWidth) * 2 - 1, - (y / this.renderer.domElement.clientHeight) * 2 + 1);
    this.mouseMoved = true;
  }
  isSafari() {

    return !!navigator.userAgent.match(/Safari/i) && !navigator.userAgent.match(/Chrome/i);

  }
  render() {
    var uniforms = this.heightmapVariable.material.uniforms;
    if (this.mouseMoved) {
      this.mouseMoved = false;
      // console.log(this.mouseMoved);
      this.raycaster.setFromCamera(this.mouseCoords, this.camera);

      var intersects = this.raycaster.intersectObject(this.mesh);
      if (intersects.length > 0) {
        let point = intersects[0].point;
        uniforms["mousePos"].value = new Vector2(point.x, point.y);
      }
      console.log(this.heightmapVariable.material.uniforms["mousePos"].value);
    }

    this.gpuCompute.compute();
    this.waterUniforms["colortexture"].value = this.gpuCompute.getCurrentRenderTarget(this.heightmapVariable).texture;




    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => {
      this.render();
    });
    this.stats.update();
  }

  fromEventCurrentPosition(
    name: 'mouseup' | 'mousedown' | 'mousemove' | 'mouseleave' | 'mouseenter',
  ) {
    // const element =
    const element = this.renderer.domElement;
    return fromEvent<MouseEvent>(element, name).pipe(
      map((e: MouseEvent) => {
        const p = new Vector2(e.clientX, e.clientY);
        return {
          position: p,
          tag: name,
        };
      }),
      // map(p => { {position: this.sceneService.clientPosition2ScenePosition(p.position), tag: p.tag} }
      // ),
      // map((p: Vector2) => { return {position: this.sceneService.clientPosition2ScenePosition(p),tag: name} } ),
      takeUntil(this.stop),
    );
  }

  createDrag$(): Observable<Ng3MosueDragEvent> {
    const cancel = merge(this.up$, this.leave$);
    return this.down$.pipe(
      switchMap((d) => {
        return merge(this.down$, this.position$).pipe(
          map((c) => {
            return {
              origin: d.position,
              current: c.position,
              last: c.position,
              tag: c.tag,
            };
          }),
          takeUntil(cancel),
        );
      }),
      takeUntil(this.stop),
      scan((acc, cur) => ({ ...cur, last: acc.current })),
    );
  }










}






const Vertex = `
uniform sampler2D colortexture;
varying highp vec3 vTextureCoord;
void main(){
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
  vTextureCoord = vec3( modelMatrix * vec4(position, 1.0));
}
`;
const fragment = `
varying highp vec3 vTextureCoord;
uniform sampler2D colortexture;
void main(){
  vec2 uv = vec2((vTextureCoord.x +256.0)/ 512.0,(vTextureCoord.y +256.0)/ 512.0);
  vec4 heightmapValue = texture2D(colortexture, uv );
  gl_FragColor = heightmapValue;
 // gl_FragColor = vec4(1.0,1.0,1.0,1.0);
}
`;
const heightmapFragmentShader = `
uniform vec2 mousePos;

void main()	{
  vec2 cellSize = 1.0 / resolution.xy;

  vec2 uv = gl_FragCoord.xy * cellSize;
 vec2 uworld = ( uv - vec2( 0.5 ) ) * 512.0;
 vec4 heightmapValue = texture2D( heightmap, uv );


 if ((uworld.x - mousePos.x)<0.5 && (uworld.x - mousePos.x)>-0.5 &&(uworld.y - mousePos.y)<0.5 &&(uworld.y - mousePos.y)>-0.5){
   heightmapValue.x =1.0;
  gl_FragColor =heightmapValue;}else{
    gl_FragColor =heightmapValue;
  }


}
`;