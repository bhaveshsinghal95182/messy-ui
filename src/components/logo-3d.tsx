"use client";

import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Float, ContactShadows, OrbitControls } from "@react-three/drei";
import type { Group } from "three";

function LogoModel() {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF("/logo.glb");

  // Clone the scene to avoid caching issues
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Subtle rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
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
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#888" wireframe />
    </mesh>
  );
}

// Animated light that moves left to right at constant speed
function AnimatedLight() {
  const lightRef = useRef<any>(null);

  useFrame((state) => {
    if (lightRef.current) {
      // Sine wave for smooth oscillation (faster speed)
      lightRef.current.position.x = -Math.sin(state.clock.elapsedTime * 1.5) * 10;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[10, 10, 5]}
      intensity={1}
    />
  );
}

export function Logo3D() {
  return (
    <div className="w-full h-[400px] relative">
      <Canvas
        camera={{ position: [10, 0, 10], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <AnimatedLight />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Minimal controls: drag to rotate, scroll to zoom */}
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

useGLTF.preload("/logo.glb");
