import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Ashima Arts 3D simplex noise (MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

const VERT = /* glsl */ `
uniform float uTime;
uniform float uAmp;
varying vec3 vN;
varying vec3 vView;
varying float vNoise;
${NOISE}
float disp(vec3 p){
  return snoise(p*0.9+vec3(0.0,uTime*0.22,uTime*0.05))*0.32 + snoise(p*2.3-uTime*0.12)*0.07;
}
vec3 bend(vec3 p){ vec3 n=normalize(p); return n*(1.0+disp(n)*uAmp); }
void main(){
  vec3 n=normalize(position);
  vec3 tangent=normalize(abs(n.y)<0.99?cross(n,vec3(0.0,1.0,0.0)):cross(n,vec3(1.0,0.0,0.0)));
  vec3 bit=normalize(cross(n,tangent));
  float e=0.012;
  vec3 p=bend(n)*1.35;
  vec3 pa=bend(n+tangent*e)*1.35;
  vec3 pb=bend(n+bit*e)*1.35;
  vec3 nrm=normalize(cross(pa-p,pb-p));
  if(dot(nrm,n)<0.0) nrm=-nrm;
  vNoise=disp(n);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vN=normalize(normalMatrix*nrm);
  vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}`

const FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vView;
varying float vNoise;
vec3 pal(float t){
  return vec3(0.55,0.42,0.62)+vec3(0.45,0.36,0.38)*cos(6.28318*(t+vec3(0.72,0.92,0.52)));
}
void main(){
  float fres=pow(1.0-max(dot(vN,vView),0.0),2.0);
  vec3 deep=vec3(0.22,0.06,0.62);
  vec3 coral=vec3(0.98,0.44,0.34);
  vec3 base=mix(deep,coral,smoothstep(-0.25,0.45,vNoise+vN.y*0.35+vN.x*0.15));
  vec3 irid=pal(fres*0.85+vNoise*0.7+uTime*0.025);
  vec3 col=mix(base,irid,0.42);
  vec3 L=normalize(vec3(-0.5,0.8,0.65));
  float diff=max(dot(vN,L),0.0);
  float spec=pow(max(dot(reflect(-L,vN),vView),0.0),48.0);
  col*=0.42+diff*0.78;
  col+=spec*0.7+fres*vec3(0.85,0.72,1.0)*0.75;
  gl_FragColor=vec4(col,1.0);
}`

export function Hero3D() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      el.classList.add('no-webgl')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0, 7.4)

    const uniforms = { uTime: { value: 0 }, uAmp: { value: 1 } }
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 72),
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG }),
    )
    const group = new THREE.Group()
    group.add(blob)

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.006, 8, 240), ringMat)
    ring1.rotation.set(1.25, 0.25, 0)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.004, 8, 240), ringMat.clone())
    ;(ring2.material as THREE.MeshBasicMaterial).opacity = 0.12
    ring2.rotation.set(1.1, -0.5, 0.3)
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffe2c4 }))
    group.add(ring1, ring2, moon)

    const N = 520
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 2 + Math.random() * 2.6
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      pos[i * 3 + 2] = r * Math.cos(ph)
    }
    const pgeo = new THREE.BufferGeometry()
    pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dust = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false }))
    scene.add(group, dust)

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.position.z = w / h < 0.9 ? 10 : 8.2
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(el)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) return
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = (uniforms.uTime.value += reduce ? 0 : dt)
      mouse.x += (mouse.tx - mouse.x) * 0.05
      mouse.y += (mouse.ty - mouse.y) * 0.05
      const scroll = Math.min(window.scrollY / window.innerHeight, 1.2)
      group.rotation.y = t * 0.12 + mouse.x * 0.5
      group.rotation.x = mouse.y * 0.35 + scroll * 0.6
      group.position.y = scroll * 0.9
      blob.scale.setScalar(1 - scroll * 0.12)
      uniforms.uAmp.value = 1 + Math.sin(t * 0.6) * 0.15 + scroll * 0.6
      const a = t * 0.5
      moon.position.set(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25).applyEuler(ring1.rotation)
      dust.rotation.y = -t * 0.02
      dust.rotation.x = mouse.y * 0.1
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      renderer.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="hero-3d" aria-hidden />
}
