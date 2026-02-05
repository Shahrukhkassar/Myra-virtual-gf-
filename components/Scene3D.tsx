
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Environment, Float, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Augment the JSX namespace to include Three.js elements provided by React Three Fiber.
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

interface AvatarProps {
  volume: number;
  isUserTalking: boolean;
  personality: string;
}

const AvatarGirl: React.FC<AvatarProps> = ({ volume, isUserTalking, personality }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  
  // -- Enhanced Materials for Realism --
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffdbac",
    roughness: 0.3,
    metalness: 0.05,
    emissive: "#ffb7c5",
    emissiveIntensity: 0.1,
  }), []);

  const hairMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#1a0f0d",
    roughness: 0.25,
    metalness: 0.1,
  }), []);
  
  const eyeWhiteMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.05 }), []);
  const eyeIrisMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.1, metalness: 0.2 }), []);
  const eyePupilMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000000" }), []); 
  const eyeHighlightMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  
  const lipMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#e11d48",
    roughness: 0.1,
    metalness: 0.2,
  }), []);

  const clothesMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0f172a",
    roughness: 0.9,
  }), []);

  useFrame((state) => {
    if (!groupRef.current || !headGroupRef.current || !mouthRef.current || !leftEyeRef.current || !rightEyeRef.current || !leftBrowRef.current || !rightBrowRef.current) return;

    const time = state.clock.getElapsedTime();
    const mouse = state.pointer;

    // --- REALISTIC CONFIGURATION ---
    let baseBrowY = 0.54;
    let browLeftOffset = 0;
    let browRightOffset = 0;
    let baseHeadTiltZ = 0;
    let baseHeadTiltX = 0;
    let baseEyeOpen = 0.98; 
    let baseLean = 0.1;

    // Adjust for Personality
    if (personality === 'real_girl') {
        baseEyeOpen = 0.9;
        browLeftOffset = volume > 0.1 ? 0.06 : 0.02; 
        baseLean = 0.3;
    } else if (personality === 'flirty') {
        baseEyeOpen = 0.7; 
        baseHeadTiltX = 0.08;
        baseLean = 0.45;
    }

    const breath = Math.sin(time * 1.5) * 0.008;
    groupRef.current.position.y = -0.2 + breath;
    
    const targetRotX = (-mouse.y * 0.1) + baseHeadTiltX;
    const targetRotY = (mouse.x * 0.15);
    
    headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, targetRotX, 0.1);
    headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, targetRotY, 0.1);
    
    headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z, 
        baseHeadTiltZ + Math.cos(time * 0.5) * 0.015, 
        0.05
    );

    const targetMouthOpen = 0.03 + (volume * 1.8); 
    mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, targetMouthOpen, 0.25);
    mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, 0.9 + volume * 0.2, 0.25);

    leftBrowRef.current.position.y = THREE.MathUtils.lerp(leftBrowRef.current.position.y, baseBrowY + browLeftOffset, 0.1);
    rightBrowRef.current.position.y = THREE.MathUtils.lerp(rightBrowRef.current.position.y, baseBrowY + browRightOffset, 0.1);

    let targetEyeScaleY = baseEyeOpen;
    if (Math.random() > 0.995) targetEyeScaleY = 0.01; // Blink
    
    leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, targetEyeScaleY, 0.4);
    rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, targetEyeScaleY, 0.4);
    
    let targetZ = baseLean + (isUserTalking ? 0.3 : 0);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.05);
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]} scale={0.55}> {/* Size decrease: 0.68 -> 0.55 */}
      
      {/* Upper Body / Shoulders */}
      <mesh position={[0, -0.9, -0.1]} material={clothesMaterial}>
         <sphereGeometry args={[0.7, 48, 48]} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 0, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.12, 0.18, 0.5, 32]} />
      </mesh>

      <group ref={headGroupRef} position={[0, 0.45, 0]}>
          {/* Head Shape - More delicate/oval */}
          <mesh position={[0, 0, 0]} material={skinMaterial}>
            <sphereGeometry args={[0.62, 64, 64]} />
          </mesh>

          {/* Facial Features Group */}
          <group position={[0, 0, 0.58]}>
            {/* Eyes */}
            <group ref={leftEyeRef} position={[-0.18, 0.1, 0]} rotation={[0, 0.05, 0]}>
               <mesh scale={[1, 0.85, 0.2]} material={eyeWhiteMaterial}>
                  <sphereGeometry args={[0.13, 32, 32]} />
               </mesh>
               <mesh position={[0, 0, 0.03]} scale={[1, 0.9, 0.1]} material={eyeIrisMaterial}>
                  <sphereGeometry args={[0.075, 32, 32]} />
               </mesh>
               <mesh position={[0, 0, 0.04]} scale={[1, 0.9, 0.1]} material={eyePupilMaterial}>
                  <sphereGeometry args={[0.04, 32, 32]} />
               </mesh>
               <mesh position={[0.02, 0.02, 0.05]} scale={[1, 1, 0.1]} material={eyeHighlightMaterial}>
                  <sphereGeometry args={[0.015, 16, 16]} />
               </mesh>
            </group>

            <group ref={rightEyeRef} position={[0.18, 0.1, 0]} rotation={[0, -0.05, 0]}>
                <mesh scale={[1, 0.85, 0.2]} material={eyeWhiteMaterial}>
                  <sphereGeometry args={[0.13, 32, 32]} />
               </mesh>
               <mesh position={[0, 0, 0.03]} scale={[1, 0.9, 0.1]} material={eyeIrisMaterial}>
                  <sphereGeometry args={[0.075, 32, 32]} />
               </mesh>
               <mesh position={[0, 0, 0.04]} scale={[1, 0.9, 0.1]} material={eyePupilMaterial}>
                  <sphereGeometry args={[0.04, 32, 32]} />
               </mesh>
               <mesh position={[0.02, 0.02, 0.05]} scale={[1, 1, 0.1]} material={eyeHighlightMaterial}>
                  <sphereGeometry args={[0.015, 16, 16]} />
               </mesh>
            </group>

            {/* Brows - More refined/slender */}
            <mesh ref={leftBrowRef} position={[-0.18, 0.54, 0.05]} rotation={[0, 0, 0.04]}>
                <capsuleGeometry args={[0.008, 0.14, 4, 8]} />
                <meshBasicMaterial color="#1a0f0d" />
            </mesh>
            <mesh ref={rightBrowRef} position={[0.18, 0.54, 0.05]} rotation={[0, 0, -0.04]}>
                <capsuleGeometry args={[0.008, 0.14, 4, 8]} />
                <meshBasicMaterial color="#1a0f0d" />
            </mesh>

            {/* Mouth - Refined shape */}
            <mesh ref={mouthRef} position={[0, -0.28, 0.08]} rotation={[0, 0, Math.PI / 2]} material={lipMaterial}>
               <capsuleGeometry args={[0.025, 0.1, 4, 16]} />
            </mesh>

            {/* Nose - Subtle and small */}
            <mesh position={[0, -0.06, 0.1]} rotation={[0.15, 0, 0]} material={skinMaterial}>
                <sphereGeometry args={[0.035, 32, 32]} />
            </mesh>
          </group>
          
          {/* Hair - Fuller and more layered */}
          <group>
            <mesh position={[0, 0.12, -0.15]} scale={[1.02, 1.05, 1.1]} material={hairMaterial}>
                <sphereGeometry args={[0.63, 48, 48]} />
            </mesh>
            {/* Front strands */}
            <mesh position={[-0.45, 0.4, 0.3]} rotation={[0, 0.3, 0.5]} material={hairMaterial}>
                <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
            </mesh>
            <mesh position={[0.45, 0.4, 0.3]} rotation={[0, -0.3, -0.5]} material={hairMaterial}>
                <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
            </mesh>
            {/* Long hair back */}
            <mesh position={[-0.6, -0.4, -0.1]} rotation={[0, 0.1, 0.1]} material={hairMaterial}>
                <capsuleGeometry args={[0.22, 1.2, 8, 16]} />
            </mesh>
             <mesh position={[0.6, -0.4, -0.1]} rotation={[0, -0.1, -0.1]} material={hairMaterial}>
                <capsuleGeometry args={[0.22, 1.2, 8, 16]} />
            </mesh>
          </group>
      </group>
    </group>
  );
};

export function Scene3D({ volume, isUserTalking, personality }: AvatarProps) {
  return (
    <Canvas camera={{ position: [0, 0.1, 2.8], fov: 36 }} shadows>
      <Environment preset="night" /> 
      <ambientLight intensity={0.5} color="#fecaca" />
      <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={2} color="#fff" castShadow />
      <pointLight position={[-3, 2, 2]} intensity={1.5} color="#312e81" />
      <pointLight position={[3, -1, 1]} intensity={1} color="#9f1239" />
      
      <Sparkles count={15} scale={4} size={2} speed={0.1} opacity={0.2} color="#fecdd3" />

      <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.05}>
        <AvatarGirl volume={volume} isUserTalking={isUserTalking} personality={personality} />
      </Float>
      
      <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={10} blur={2} far={4} color="#000" />
      <OrbitControls enableZoom={false} enablePan={false} minAzimuthAngle={-Math.PI / 16} maxAzimuthAngle={Math.PI / 16} maxPolarAngle={Math.PI / 1.9} minPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
