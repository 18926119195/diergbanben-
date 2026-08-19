import { CvsScene } from './cvs/CvsScene'
import { HUD } from './ui/HUD'
import { KeyboardNav } from './ui/KeyboardNav'
import { WorkbenchPalette } from './ui/WorkbenchPalette'
import { OverviewLinkBoard } from './ui/OverviewLinkBoard'
import { LinkFocusControls } from './ui/LinkFocusControls'
import { ConstructionLensControls } from './ui/ConstructionLensControls'
import { ViewPathTimeline } from './ui/ViewPathTimeline'
import { EmphasisStarMap } from './ui/EmphasisStarMap'
import { ReasoningPilotPanel } from './ui/ReasoningPilotPanel'
import { InterviewAbPanel } from './ui/InterviewAbPanel'
import { ReasoningFloorDock } from './ui/ReasoningFloorDock'
import { isPublicDemo } from './demoMode'
import './App.css'

export default function App() {
  return (
    <div className="app-root">
      <KeyboardNav />
      <main className="stage">
        <CvsScene />
      </main>
      <HUD />
      <InterviewAbPanel solo={isPublicDemo} />
      {!isPublicDemo && <ReasoningPilotPanel />}
      <ReasoningFloorDock />
      <EmphasisStarMap />
      <WorkbenchPalette />
      <OverviewLinkBoard />
      <LinkFocusControls />
      <ConstructionLensControls />
      <ViewPathTimeline />
      <footer className="patent-bar">
        球面宇宙 · 推理驾驭层 · 机位时间轴可剪
      </footer>
    </div>
  )
}
