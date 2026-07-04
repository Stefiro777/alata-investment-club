'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

const FOREST = '#1a4a3a'
const FOREST_DEEP = '#123a2d'
const PAPER = '#e9e6dc'

type Blade = {
  angle: number      // fan angle around Z (radians)
  length: number
  depth: number      // z offset for parallax layering
  width: number
  color: string
  metalness: number
  roughness: number
}

/** One fanned wing built from slender vertical blades pivoting at a shared root. */
function buildWing(sign: 1 | -1): Blade[] {
  const n = 9
  const blades: Blade[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    // fan from near-vertical out to ~72°
    const angle = sign * (0.08 + t * 1.25)
    // longest blades in the middle of the fan → soft wing silhouette
    const length = 1.15 + Math.sin(t * Math.PI) * 1.05
    const depth = (t - 0.5) * 0.9
    const accent = i % 3 === 2
    blades.push({
      angle,
      length,
      depth,
      width: 0.05 + t * 0.02,
      color: accent ? PAPER : i % 2 === 0 ? FOREST : FOREST_DEEP,
      metalness: accent ? 0.2 : 0.35,
      roughness: accent ? 0.5 : 0.32,
    })
  }
  return blades
}

function Blade({ blade }: { blade: Blade }) {
  // Pivot at the root: rotate the group, then push the blade up by half its length.
  return (
    <group rotation={[0, 0, blade.angle]}>
      <mesh position={[0, blade.length / 2, blade.depth]} castShadow>
        <boxGeometry args={[blade.width, blade.length, 0.14]} />
        <meshStandardMaterial
          color={blade.color}
          metalness={blade.metalness}
          roughness={blade.roughness}
        />
      </mesh>
    </group>
  )
}

function Wings() {
  const group = useRef<THREE.Group>(null)
  const blades = useMemo(() => [...buildWing(1), ...buildWing(-1)], [])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    // Slow ambient rotation + gentle breathing, biased by the pointer.
    const t = state.clock.elapsedTime
    const targetY = state.pointer.x * 0.5 + Math.sin(t * 0.18) * 0.12
    const targetX = -state.pointer.y * 0.28 + Math.sin(t * 0.13) * 0.05
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, delta * 2.5)
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 2.5)
    g.position.y = -0.9 + Math.sin(t * 0.6) * 0.04
  })

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      {blades.map((b, i) => (
        <Blade key={i} blade={b} />
      ))}
    </group>
  )
}

export default function Signature3DCanvas() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 6], fov: 38 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[-4, 6, 5]} intensity={1.6} castShadow />
      <pointLight position={[5, -2, 3]} intensity={0.5} color={PAPER} />
      <Wings />
      <ContactShadows
        position={[0, -1.7, 0]}
        opacity={0.35}
        scale={9}
        blur={2.6}
        far={4}
        color="#0a1a14"
      />
    </Canvas>
  )
}
