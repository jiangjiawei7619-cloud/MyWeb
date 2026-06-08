'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

type BackgroundCanvasProps = {
  intensity?: number;
  isNavCollapsed?: boolean;
};

const FULLSCREEN_VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const COMMON_GLSL = /* glsl */ `
  #define sat(a) clamp(a, 0., 1.)
  #define PI 3.141592653

  mat2 r2d(float a) { float c = cos(a), s = sin(a); return mat2(c,-s,s,c);}
  float lenny(vec2 v) { return abs(v.x)+abs(v.y); }

  vec3 cyberRedGrade(vec3 c) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 darkBase = vec3(0.01, 0.0, 0.0);
    vec3 deepRed = vec3(0.40, 0.02, 0.02) * l;
    vec3 hotRed = vec3(1.00, 0.22, 0.22) * pow(max(l, 0.0), 1.15);
    vec3 graded = darkBase + deepRed + hotRed * 0.65;
    return max(graded, vec3(0.0));
  }
`;

const BUFFER_A_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec4 iMouse;
  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform sampler2D iChannel2;
  uniform sampler2D iChannel3;
  uniform float uIntensity;

  ${COMMON_GLSL}

  #define UPSIDEDOWN
  #define FFT(f) (texture(iChannel1, vec2(f, 0.)).x)

  float _speed = 20.;
  float _time;

  float _cube(vec3 p, vec3 s) {
    vec3 l = abs(p)-s;
    return max(l.x, max(l.y, l.z));
  }

  vec2 _min(vec2 a, vec2 b) {
    if (a.x < b.x) return a;
    return b;
  }

  float _cars(vec3 op, vec3 s) {
    op.z += _time*20.;
    float carStp = 10.5;
    vec3 pcar = op;
    float idxCar = floor((pcar.z+.5*carStp)/carStp);
    pcar.z = mod(pcar.z+.5*carStp, carStp)-.5*carStp;
    pcar.x += sin(idxCar);
    pcar.y += sin(idxCar*5.+_time);
    return _cube(pcar, s*(sin(idxCar)*.5+.5));
  }

  vec2 map(vec3 p) {
    p.z += _time*_speed;
    vec3 op = p;

    p.y = abs(p.y)-100.;
    vec2 acc = vec2(100., -1.);
    vec2 ground = vec2(_cube(p, vec3(50., .1, 50.)), 0.);

    vec3 pBat = p;
    vec2 repBat = vec2(10.);
    vec2 idxBat = floor((pBat.xz+repBat*.5)/ repBat);
    pBat.xz = mod(pBat.xz+repBat*.5, repBat)-repBat*.5;
    float height = mix(1., 8., (sin(idxBat.x+idxBat.y*10.)*.5+.5));
    height += (texture(iChannel0, idxBat*.1).x-.5)*5.;
    float width = texture(iChannel0, idxBat/10.).x*.75;
    pBat.xz += sin(idxBat*10.)*.5;
    vec2 bat = vec2(_cube(pBat, vec3(5.5*width,height*8.,3.7)), 0.);

    acc = _min(acc, ground);
    acc = _min(acc, bat);
    acc = _min(acc, vec2(_cars(op-vec3(0.,10.,0.), vec3(.5,.5,1.5)), 1.));
    acc = _min(acc, vec2(_cars(op-vec3(50.,10.,0.), vec3(.5,.5,1.5)), 1.));

    float repz = 50.;
    float idxz = op.z / repz;
    op.z = mod(op.z+.5*repz, repz)-repz*.5;
    op.xz *= r2d(1.57);
    op.y += sin(idxz)*25.;
    acc = _min(acc, vec2(_cars(op, vec3(.5,.5,2.5)), 1.));
    return acc;
  }

  vec3 trace(vec3 ro, vec3 rd, float dist, int steps) {
    vec3 p = ro;
    for (int i = 0; i < steps && ((dist > 0.0 && distance(ro, p) < dist) || dist < 0.0); ++i) {
      vec2 res = map(p);
      if (res.x < 0.01) {
        return vec3(res.x, distance(ro, p), res.y);
      }
      p += rd * min(res.x,.5+(distance(ro, p)/120.));
    }
    return vec3(-1.);
  }

  float traceShadow(vec3 ro, vec3 rd, float dist, int steps) {
    vec3 p = ro;
    float acc = 1.;
    for (int i = 0; i < steps && distance(p, ro) < dist; ++i) {
      vec2 res = map(p);
      if (res.x < 0.01) return 0.;
      float d = min(res.x,1.5);
      acc = min(acc, 30.*d/distance(p, ro));
      p += rd * d;
    }
    return acc;
  }

  vec3 getCam(vec3 rd, vec2 uv) {
    vec3 r = normalize(cross(rd, vec3(0.,1.,0.)));
    vec3 u = normalize(cross(rd, r));
    float fov = 4.;
    return normalize(rd+(uv.x*r+uv.y*u)*fov);
  }

  vec3 getNormal(float d, vec3 p) {
    vec2 e = vec2(0.04, 0.);
    return normalize(vec3(d)-vec3(map(p-e.xyy).x, map(p-e.yxy).x, map(p-e.yyx).x));
  }

  vec3 rdr(vec2 uv) {
    vec3 col = vec3(0.);
    vec3 ro = vec3(sin(_time*.3)*15.,15.+sin(_time*.15)*15.,-75.)*.75;
    vec3 ta = vec3(0.,-10.,0.)*.5;

    vec3 rd = normalize(ta-ro);
    rd = getCam(rd, uv);

    vec3 res = trace(ro, rd, -1., 256);
    if (res.y > 0.) {
      vec3 p = ro+rd*res.y;
      vec3 n = getNormal(res.x, p);

      float lDist = 550.;
      vec3 shadowO = p+n*0.01;
      vec3 ldir = vec3(1.,-2.,5.)*lDist;

      float shadowRes = traceShadow(shadowO, normalize(ldir), lDist, int(650.*(1.-sat((length(p.xz)-150.)*.01))));
      vec3 ambientCol = vec3(0.18,0.02,0.02);
      vec3 diffuseCol = vec3(0.95,0.18,0.18);
      col = ambientCol;

      col *= sat(pow(sat(shadowRes),.5)+.15);
      if (shadowRes > 0.01) {
        vec3 h = normalize(ldir+rd);
        col += 500.*sat(dot(n, normalize(ldir)))*diffuseCol/lDist;
        float specPower = mix(1.,.01, sat(sin(p.y*2.)*50.));
        col += (.025/specPower)*100.*vec3(1.000,0.300,0.300)*pow(sat(abs(dot(n, h))),specPower)/lDist;
      }

      col += mix(vec3(0.), mix(vec3(1.000,0.160,0.160), vec3(1.), sat(abs(length(p.xz)*.0025))), 1.-sat(exp(-distance(p, ro)/500.)));
      p.z += _time*_speed;

      col += float(dot(n, vec3(0.,-1.,0.)) < 0.1)*vec3(0.900,0.450,0.320)*pow(texture(iChannel2, p*.02).x,20.)*2.;
      col += .3*vec3(0.680,0.220,0.180)*(sat(p.y*.1+5.))*pow(texture(iChannel2, vec3(1.,4.,1.)*p*.02+vec3(.5*_time*sign(sin(p.z*5.)), 0., 0.)).x,20.);
    } else {
      col = sat(
        mix(
          mix(vec3(.45, .03, .03), vec3(1.000,0.160,0.160)*.65, .15),
          texture(iChannel3, vec2(-rd.x, rd.y)*vec2(2.,-8.)-vec2(0.,.7)).xyz * vec3(1.0, 0.2, 0.2),
          (sat((rd.y-.175)*40.))*.5*sat(length(uv*2.))
        )
      );
    }

    col += (1.-sat(lenny(rd.xy*vec2(1.,4.)*.5)))*vec3(1.000,0.220,0.220)*.45*float(res.y<0.);
    col += 3.*pow(1.-sat(lenny(rd.xy*.15*vec2(1.,8.))),5.)*vec3(1.000,0.220,0.220)*.35;
    col *= mix(.75,1.5,pow(sat(FFT(0.5)),2.));
    return col;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    _time = iTime + texture(iChannel0, fragCoord/8.).x*.25;
    vec2 uv = (fragCoord-vec2(.5)*iResolution.xy)/iResolution.xx;
    vec3 col = rdr(uv);

    col = pow(col, vec3(.85));
    col *= (1.-sat(lenny(uv*2.)-.5));
    col = mix(col, texture(iChannel3, fragCoord/iResolution.xy).xyz, sat(.9)*sat(length(uv*2.)));

    col = cyberRedGrade(col);
    col *= mix(0.35, 1.0, sat(uIntensity));

    fragColor = vec4(col, 1.0);
  }

  void main() {
    vec4 fragColor = vec4(0.0);
    mainImage(fragColor, gl_FragCoord.xy);
    gl_FragColor = fragColor;
  }
`;

const IMAGE_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec4 iMouse;
  uniform sampler2D iChannel0;
  uniform float uIntensity;
  uniform float uMobile;
  uniform float uNavCollapsed;

  ${COMMON_GLSL}

  vec3 doBloom(vec2 uv, float blur, float threshold) {
    vec3 col = vec3(0.0);
    int cnt = 50;
    float fcnt = float(cnt);
    for (int i = 0; i < cnt; ++i) {
      float fi = float(i);
      float coef = (fi / fcnt);
      float samplePerTurn = 5.;
      float an = (fi/(fcnt/samplePerTurn))*PI;
      vec2 p = uv - vec2(sin(an), cos(an))*an*blur*.1;
      vec3 smple = texture(iChannel0, p).xyz;
      if (length(smple) > threshold) col += smple;
    }
    return col / float(cnt);
  }

  vec3 chromaFlare(vec2 uv, vec2 ouv, float sz) {
    vec3 col = vec3(0.);
    float c = abs(length(ouv)-.3-sz*9.)-sz;
    vec3 rgb = vec3(0.0);
    float a = atan(ouv.y, ouv.x);
    float cnt = 16.;
    for (float i = 0.; i < cnt; ++i) {
      rgb += vec3(1.) *
        (sat((sin(a*400.)+sin(a*200.)+sin(a*100.))*.2+.5)*.5+.5) *
        texture(iChannel0, vec2(.5)+((uv-vec2(.5))*(i+1.)*0.01*r2d((i-cnt/2.)*.025)*-1.*sat(length(ouv*2.)))).x;
    }
    col += pow((1.-sat(c*5.))*pow(rgb/cnt, vec3(1.)), vec3(1.));
    return col*.2;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float zoom = 1.0 + uNavCollapsed * 0.015;
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * zoom + 0.5;
    vec2 cuv = (fragCoord-vec2(.5)*iResolution.xy)/iResolution.xx;

    vec3 col = texture(iChannel0, uv).xyz;

    float bloomIntensity = 424./640.;
    vec3 bloomSample = doBloom(uv, 40./360., 237./640.);
    bloomSample = pow(bloomSample, vec3(0.5));
    col += bloomSample * bloomIntensity * vec3(1.0, 0.2, 0.2);

    if (uMobile < 0.5) {
      col += chromaFlare(uv, cuv, 0.01) * vec3(1.0, 0.15, 0.15);
    }

    col = mix(col, col.zyx, pow(sat(length(cuv*2.)),4.) * 0.35);

    float scanline = sin(fragCoord.y * (1.6 + uNavCollapsed * 1.2) + iTime * 4.0) * 0.018;
    col *= 1.0 + scanline;

    col = cyberRedGrade(col);
    col = pow(col, vec3(1.55));
    col *= mix(0.35, 1.0, sat(uIntensity));

    fragColor = vec4(col, 1.);
  }

  void main() {
    vec4 fragColor = vec4(0.0);
    mainImage(fragColor, gl_FragCoord.xy);
    gl_FragColor = fragColor;
  }
`;

function makeNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const v = Math.floor(Math.random() * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeFFTTexture(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i += 1) {
    data[i * 4] = 0;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function MultiPassShader({
  intensity,
  isNavCollapsed,
  mouse,
}: {
  intensity: number;
  isNavCollapsed: boolean;
  mouse: React.MutableRefObject<THREE.Vector4>;
}) {
  const { gl, size, viewport } = useThree();
  const isMobile = viewport.width < 8 || size.width < 900;
  const targetIntensity = Math.max(0, Math.min(1, intensity));
  const smoothIntensity = useRef(targetIntensity);

  const noise0 = useMemo(() => makeNoiseTexture(256), []);
  const noise2 = useMemo(() => makeNoiseTexture(256), []);
  const noise3 = useMemo(() => makeNoiseTexture(256), []);
  const fftTex = useMemo(() => makeFFTTexture(128), []);

  const fbo = useFBO(
    Math.max(1, Math.floor(size.width * 0.75)),
    Math.max(1, Math.floor(size.height * 0.75)),
    {
      depthBuffer: false,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    },
  );

  const rtScene = useMemo(() => new THREE.Scene(), []);
  const imageScene = useMemo(() => new THREE.Scene(), []);
  const orthoCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  const bufferMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        iTime: { value: 0 },
        iMouse: { value: new THREE.Vector4() },
        iChannel0: { value: noise0 },
        iChannel1: { value: fftTex },
        iChannel2: { value: noise2 },
        iChannel3: { value: noise3 },
        uIntensity: { value: targetIntensity },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BUFFER_A_FRAG,
      depthWrite: false,
      depthTest: false,
    });
  }, [noise0, fftTex, noise2, noise3, targetIntensity]);

  const imageMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        iTime: { value: 0 },
        iMouse: { value: new THREE.Vector4() },
        iChannel0: { value: fbo.texture },
        uIntensity: { value: targetIntensity },
        uMobile: { value: isMobile ? 1 : 0 },
        uNavCollapsed: { value: isNavCollapsed ? 1 : 0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: IMAGE_FRAG,
      depthWrite: false,
      depthTest: false,
    });
  }, [fbo.texture, targetIntensity, isMobile, isNavCollapsed]);

  useEffect(() => {
    fbo.setSize(
      Math.max(1, Math.floor(size.width * 0.75)),
      Math.max(1, Math.floor(size.height * 0.75)),
    );
  }, [fbo, size.width, size.height]);

  useEffect(() => {
    return () => {
      noise0.dispose();
      noise2.dispose();
      noise3.dispose();
      fftTex.dispose();
      bufferMaterial.dispose();
      imageMaterial.dispose();
    };
  }, [noise0, noise2, noise3, fftTex, bufferMaterial, imageMaterial]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    smoothIntensity.current += (targetIntensity - smoothIntensity.current) * 0.08;

    const fft = fftTex.image.data as Uint8Array;
    for (let i = 0; i < 128; i += 1) {
      const wave = 0.55 + 0.45 * Math.sin(t * 3.8 + i * 0.17);
      fft[i * 4] = Math.floor(255 * wave);
      fft[i * 4 + 1] = fft[i * 4];
      fft[i * 4 + 2] = fft[i * 4];
      fft[i * 4 + 3] = 255;
    }
    fftTex.needsUpdate = true;

    const bufferUniforms = bufferMaterial.uniforms;
    bufferUniforms.iTime.value = t;
    bufferUniforms.iMouse.value.copy(mouse.current);
    bufferUniforms.iResolution.value.set(
      Math.max(1, Math.floor(size.width * 0.75)),
      Math.max(1, Math.floor(size.height * 0.75)),
      1,
    );
    bufferUniforms.uIntensity.value = smoothIntensity.current;

    const imageUniforms = imageMaterial.uniforms;
    imageUniforms.iTime.value = t;
    imageUniforms.iMouse.value.copy(mouse.current);
    imageUniforms.iResolution.value.set(size.width, size.height, 1);
    imageUniforms.uIntensity.value = smoothIntensity.current;
    imageUniforms.uMobile.value = isMobile ? 1 : 0;
    imageUniforms.uNavCollapsed.value = isNavCollapsed ? 1 : 0;
    imageUniforms.iChannel0.value = fbo.texture;

    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(rtScene, orthoCam);

    gl.setRenderTarget(null);
    gl.clear();
    gl.render(imageScene, orthoCam);
  }, 1);

  return (
    <>
      {createPortal(
        <mesh frustumCulled={false}>
          <planeGeometry args={[2, 2]} />
          <primitive object={bufferMaterial} attach="material" />
        </mesh>,
        rtScene,
      )}
      {createPortal(
        <mesh frustumCulled={false}>
          <planeGeometry args={[2, 2]} />
          <primitive object={imageMaterial} attach="material" />
        </mesh>,
        imageScene,
      )}
    </>
  );
}

export default function BackgroundCanvas({
  intensity = 0.8,
  isNavCollapsed = false,
}: BackgroundCanvasProps) {
  const mouse = useRef(new THREE.Vector4(0, 0, 0, 0));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = window.innerHeight - e.clientY;
      mouse.current.set(x, y, x, y);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 1], fov: 50 }}
      >
        <MultiPassShader
          intensity={Math.max(0, Math.min(1, intensity))}
          isNavCollapsed={isNavCollapsed}
          mouse={mouse}
        />
      </Canvas>
    </div>
  );
}
