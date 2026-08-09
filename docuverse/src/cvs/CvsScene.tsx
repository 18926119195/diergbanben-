import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import { useDocuverse } from './store'
import { PageMesh } from './PageMesh'
import { BeamLayer } from './BeamLayer'
import { EmphasisBeamLayer } from './EmphasisBeamLayer'
import { CameraRig, OrbitControlsProxy } from './CameraRig'
import { innerSphereRadius, pageHomePosition } from './geometry'
import { OcrComparePlane } from './OcrComparePlane'
import { RelationPasteLayer } from './RelationPasteLayer'
import { EmphasisPenController } from './EmphasisPenController'

const noHit = (() => undefined) as unknown as THREE.Mesh['raycast']

export function CvsScene() {
  const pages = useDocuverse((s) => s.pages)
  const connections = useDocuverse((s) => s.connections)
  const currentStrand = useDocuverse((s) => s.currentStrand)
  const companionStrand = useDocuverse((s) => s.companionStrand)
  const currentConnectionId = useDocuverse((s) => s.currentConnectionId)
  const selectConnection = useDocuverse((s) => s.selectConnection)
  const swoopToPage = useDocuverse((s) => s.swoopToPage)
  const total = pages.length
  const innerR = innerSphereRadius(Math.max(total, 1))

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ fov: 50, near: 0.05, far: 50000, position: [0, 0, innerR + 20] }}
      style={{ width: '100%', height: '100%' }}
      performance={{ min: 0.5 }}
    >
      <color attach="background" args={['#0b0e14']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 12, 6]} intensity={0.85} />
      <fog attach="fog" args={['#0b0e14', innerR * 1.1, innerR * 5]} />

      <CameraRig />
      <OrbitControlsProxy />
      <EmphasisPenController />

      {/* Cue only — never steal page hits (pages may sit inside this shell in planar) */}
      <mesh raycast={noHit}>
        <sphereGeometry args={[innerR * 0.98, 48, 32]} />
        <meshBasicMaterial
          color="#142230"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      {pages.map((page) => {
        const role =
          page.strandIndex === currentStrand
            ? 'current'
            : page.strandIndex === companionStrand
              ? 'companion'
              : 'background'
        return (
          <PageMesh
            key={`${page.imageUrl ?? 'txt'}-${page.strandIndex}`}
            page={page}
            homePosition={pageHomePosition(page.strandIndex, total)}
            role={role}
            connections={connections}
            currentConnectionId={currentConnectionId}
            onSelectConnection={selectConnection}
            onSwoopToPage={swoopToPage}
          />
        )
      })}

      <Suspense fallback={null}>
        <OcrComparePlane />
      </Suspense>

      <BeamLayer
        pages={pages}
        connections={connections}
        currentStrand={currentStrand}
        companionStrand={companionStrand}
        currentConnectionId={currentConnectionId}
      />
      <EmphasisBeamLayer />
      <Suspense fallback={null}>
        <RelationPasteLayer />
      </Suspense>
    </Canvas>
  )
}
