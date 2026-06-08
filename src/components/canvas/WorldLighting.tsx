import { useEffect, useLayoutEffect, useRef } from 'react';

import { Environment, Lightformer } from '@react-three/drei';

import { useThree } from '@react-three/fiber';

import * as THREE from 'three';

import { EXPLORE_LIGHTING } from '@/lib/explore-lighting';

import { GROUND_HALF_EXTENT } from '@/physics/createPhysicsWorld';



function SunLight() {

  const lightRef = useRef<THREE.DirectionalLight>(null);

  const { scene } = useThree();

  const { sun } = EXPLORE_LIGHTING;



  useLayoutEffect(() => {

    const light = lightRef.current;

    if (!light) return;



    light.target.position.set(...sun.target);

    light.target.updateMatrixWorld();

    scene.add(light.target);



    const cam = light.shadow.camera as THREE.OrthographicCamera;

    const half = sun.shadow.cameraSize;

    cam.left = -half;

    cam.right = half;

    cam.top = half;

    cam.bottom = -half;

    cam.near = 0.5;

    cam.far = 220;

    cam.updateProjectionMatrix();



    return () => {

      scene.remove(light.target);

    };

  }, [scene, sun.shadow.cameraSize, sun.target]);



  return (

    <directionalLight

      ref={lightRef}

      position={sun.position}

      intensity={sun.intensity}

      color={sun.color}

      castShadow

      shadow-mapSize-width={sun.shadow.mapSize}

      shadow-mapSize-height={sun.shadow.mapSize}

      shadow-bias={sun.shadow.bias}

      shadow-normalBias={sun.shadow.normalBias}

      shadow-radius={sun.shadow.radius}

    />

  );

}



function DuskEnvironment() {

  const { environment } = EXPLORE_LIGHTING;

  const extent = GROUND_HALF_EXTENT;



  return (

    <Environment

      resolution={environment.resolution}

      background={false}

      environmentIntensity={environment.intensity}

    >

      <Lightformer

        form="rect"

        intensity={2.4}

        color={EXPLORE_LIGHTING.sun.color}

        position={[55, 10, 25]}

        rotation-y={Math.PI / 3}

        scale={[extent * 1.2, 14, 1]}

      />

      <Lightformer

        form="rect"

        intensity={0.55}

        color="#1e1624"

        position={[0, -2, 0]}

        rotation-x={-Math.PI / 2}

        scale={[extent * 2.5, extent * 2.5, 1]}

      />

    </Environment>

  );

}



/** EXPLORE 世界 PBR 光照：IBL + 日月平行光 + 物理雾 + 阴影 */

export default function WorldLighting() {

  const { scene, gl } = useThree();



  useLayoutEffect(() => {

    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    gl.shadowMap.enabled = true;

  }, [gl]);



  useEffect(() => {

    return () => {

      scene.environment = null;

    };

  }, [scene]);



  const { ambient, hemisphere } = EXPLORE_LIGHTING;



  return (

    <>

      <DuskEnvironment />

      <ambientLight color={ambient.color} intensity={ambient.intensity} />

      <hemisphereLight

        color={hemisphere.skyColor}

        groundColor={hemisphere.groundColor}

        intensity={hemisphere.intensity}

      />

      <SunLight />

    </>

  );

}

