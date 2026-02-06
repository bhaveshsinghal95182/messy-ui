'use client';
import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  Float,
  ContactShadows,
  OrbitControls,
  Html,
} from '@react-three/drei';
import type { Group, DirectionalLight } from 'three';

function LogoModel() {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF('/logo.glb');
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.2}
      floatIntensity={0.5}
      floatingRange={[-0.1, 0.1]}
    >
      <group ref={groupRef}>
        <primitive object={scene} scale={0.1} />
      </group>
    </Float>
  );
}

function LoadingFallback() {
  return (
    <Html center className="scale-1000">
      <svg
        width="20"
        height="21"
        viewBox="0 0 460 480"
        className="text-primary"
        fill="currentColor"
      >
        <path d="M 42 10 L 98 10 A 32 32 0 0 1 130 42 L 130 438 A 32 32 0 0 1 98 470 L 42 470 A 32 32 0 0 1 10 438 L 10 42 A 32 32 0 0 1 42 10 Z" />
        <path d="M 362 10 L 418 10 A 32 32 0 0 1 450 42 L 450 438 A 32 32 0 0 1 418 470 L 362 470 A 32 32 0 0 1 330 438 L 330 42 A 32 32 0 0 1 362 10 Z" />
        <path d="M 200 70 L 260 70 L 260 70 L 260 110 A 30 30 0 0 1 230 140 L 232 140 A 30 30 0 0 1 200 110 L 200 70 L 200 70 Z" />
        <path d="M 112 10 L 168 10 A 32 32 0 0 1 200 42 L 200 90 L 200 90 L 112 90 A 32 32 0 0 1 80 58 L 80 42 A 32 32 0 0 1 112 10 Z" />
        <path d="M 292 10 L 348 10 A 32 32 0 0 1 380 42 L 380 58 A 32 32 0 0 1 348 90 L 260 90 L 260 90 L 260 42 A 32 32 0 0 1 292 10 Z" />
        <path
          d="M 0 0 C 0 -23.872 -5.76 -32 -32 -32 H 0 Z"
          transform="translate(200, 122)"
        />
        <path
          d="M 0 0 C 0 -23.872 5.76 -32 32 -32 H 0 Z"
          transform="translate(260, 122)"
        />
        <path
          d="M 0 0 C 0 23.872 5.76 32 32 32 H 0 Z"
          transform="translate(200, 38)"
        />
        <path
          d="M 0 0 C 0 23.872 -5.76 32 -32 32 H 0 Z"
          transform="translate(260, 38)"
        />
      </svg>
    </Html>
  );
}

function AnimatedLight() {
  const lightRef = useRef<DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.position.x =
        -Math.sin(state.clock.elapsedTime * 1.5) * 10;
    }
  });

  return (
    <directionalLight ref={lightRef} position={[10, 10, 5]} intensity={1} />
  );
}

export function Logo3D() {
  return (
    <div className="w-full h-[400px] relative">
      <Canvas
        camera={{ position: [10, 0, 10], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <AnimatedLight />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
          minDistance={5}
          maxDistance={30}
          dampingFactor={0.05}
          enableDamping={true}
        />

        <Suspense fallback={<LoadingFallback />}>
          <LogoModel />
        </Suspense>

        <ContactShadows
          position={[0, -0.3, 0]}
          opacity={0.6}
          scale={5}
          blur={1.5}
          far={2}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/logo.glb');
