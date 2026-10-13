import AppKit
import QuartzCore

struct ShelfEdgeDecision {
    let edge:String
    let progress:CGFloat
    let target:NSRect
    let docks:Bool
}
func shelfDockDuration(_ delta:Double)->Double {
    let v=abs(delta)
    if v>=1 && v<1.5{return 0.6}
    if v>=1.5 && v<2{return 0.45}
    if v>=2 && v<3{return 0.35}
    return 0.3
}
func shelfEdgeDecision(_ frame:NSRect,screen:NSRect,others:[NSRect],deltaX:Double)->ShelfEdgeDecision? {
    let left=abs(frame.minX-screen.minX)<=abs(frame.maxX-screen.maxX)
    let edge=left ? "left":"right"
    let target=NSRect(x:left ? screen.minX-frame.width*0.84:screen.maxX-frame.width*0.16,y:frame.minY,width:frame.width,height:frame.height)
    if others.contains(where:{$0.intersects(target)}){return nil}
    let p=min(1,max(0,(left ? screen.minX-frame.minX:frame.maxX-screen.maxX)/(frame.width*0.84)))
    return ShelfEdgeDecision(edge:edge,progress:p,target:target,docks:p>0 && ((left ? deltaX<0:deltaX>0) || p>0.4))
}
final class WorkShelfDockOverlay:NSVisualEffectView {
    weak var shelf:NativeWorkShelf?
    private let tint=NSView()
    private let arrow=NSImageView()
    var edge="left" {didSet{needsLayout=true}}
    override init(frame:NSRect) {
        super.init(frame:frame)
        material = .popover;blendingMode = .withinWindow;state = .active
        tint.wantsLayer=true;tint.autoresizingMask=[.width,.height]
        arrow.contentTintColor = .labelColor;arrow.imageScaling = .scaleProportionallyDown
        addSubview(tint);addSubview(arrow);updateTint()
    }
    required init?(coder:NSCoder){nil}
    override func viewDidChangeEffectiveAppearance(){super.viewDidChangeEffectiveAppearance();updateTint()}
    private func updateTint(){effectiveAppearance.performAsCurrentDrawingAppearance{tint.layer?.backgroundColor=NSColor.windowBackgroundColor.withAlphaComponent(0.25).cgColor}}
    override func layout() {
        super.layout();tint.frame=bounds
        let x=edge=="left" ? bounds.width-bounds.width*0.08:bounds.width*0.08
        arrow.frame=NSRect(x:x-8,y:bounds.midY-12,width:16,height:24)
        arrow.image=NSImage(systemSymbolName:edge=="left" ? "chevron.right":"chevron.left",accessibilityDescription:nil)
    }
    override func hitTest(_ point:NSPoint)->NSView? {
        guard !isHidden,alphaValue>0.01,let shelf,!shelf.moving,!shelf.animating,shelf.docked else{return nil}
        return bounds.contains(convert(point,from:superview)) ? self:nil
    }
    override func mouseDown(with event:NSEvent){shelf?.interaction.eventAt=event.timestamp;shelf?.beginUserTracking();shelf?.dragStartPoint=shelf?.eventScreenPoint(event) ?? .zero}
    override func mouseDragged(with event:NSEvent){shelf?.moveFromEvent(event)}
    override func mouseUp(with event:NSEvent){shelf?.interaction.eventAt=event.timestamp;shelf?.completeUserTracking()}
    override var acceptsFirstResponder:Bool{true}
    override func keyDown(with event:NSEvent){if event.keyCode==36 || event.keyCode==49{shelf?.interaction.clickedRestore()}else{super.keyDown(with:event)}}
    override func isAccessibilityElement()->Bool{shelf?.docked==true && shelf?.moving==false && shelf?.animating==false && !isHidden}
    override func accessibilityRole()->NSAccessibility.Role?{.button}
    override func accessibilityLabel()->String?{"展开小窗口"}
    override func accessibilityPerformPress()->Bool{shelf?.interaction.clickedRestore();return true}
}
/** One owned gesture and one replaceable AppKit transition; no global input polling. */
final class WorkShelfInteractionController {
    unowned let shelf:NativeWorkShelf
    let overlay=WorkShelfDockOverlay()
    var gestureId=0
    var generation=0
    var deltaX:Double=0
    var eventAt:Double=0
    var animationDuration:Double=0
    var timingName="none"
    var frameSource="appkit"
    var wasDocked=false
    var activeCommand:Int?
    var overlayGeneration=0
    init(_ shelf:NativeWorkShelf){self.shelf=shelf;overlay.shelf=shelf;overlay.isHidden=true;overlay.wantsLayer=true;overlay.autoresizingMask=[.width,.height];shelf.root.addSubview(overlay)}
    func actualFrame(displayed:Bool=false)->NSRect {
        if !displayed && !shelf.animating{frameSource="appkit";return shelf.window.frame}
        let id=CGWindowID(shelf.window.windowNumber)
        if let rows=CGWindowListCopyWindowInfo(.optionIncludingWindow,id) as? [[String:Any]],let row=rows.first(where:{($0[kCGWindowNumber as String] as? UInt32)==id}),let b=row[kCGWindowBounds as String] as? [String:Any],let x=b["X"] as? Double,let y=b["Y"] as? Double,let w=b["Width"] as? Double,let h=b["Height"] as? Double,w>0,h>0 {
            frameSource="window-server";return NSRect(x:x,y:(NSScreen.screens.first?.frame.maxY ?? 0)-y-h,width:w,height:h)
        }
        frameSource="appkit-fallback";return shelf.window.frame
    }
    func frameRecord(_ frame:NSRect)->[String:Any]{["x":frame.minX,"y":(NSScreen.screens.first?.frame.maxY ?? 0)-frame.maxY,"width":frame.width,"height":frame.height,"presentation":shelf.expanded ? "expanded":"compact","docked":shelf.docked]}
    func acknowledgement(_ id:Int,_ status:String,_ reason:String="") {
        var v=frameRecord(actualFrame(displayed:shelf.window.isVisible));v["event"]="motionAck";v["motionId"]=id;v["gestureId"]=gestureId;v["status"]=status;v["reason"]=reason;v["nativeAt"]=ProcessInfo.processInfo.systemUptime;v["transitionId"]=generation;v["frameSource"]=frameSource;emit(v)
    }
    func feedback(_ visible:Bool,edge:String?=nil,animated:Bool=true){
        overlayGeneration+=1;let token=overlayGeneration
        shelf.dockFeedbackVisible=visible
        if !visible{shelf.dockButtonsHidden=false}
        shelf.layout()
        shelf.root.addSubview(overlay,positioned:.above,relativeTo:nil);overlay.frame=shelf.root.bounds;if let edge{overlay.edge=edge}
        overlay.needsLayout=true;overlay.layoutSubtreeIfNeeded()
        if visible{if overlay.isHidden{overlay.alphaValue=0};overlay.isHidden=false}
        NSAnimationContext.runAnimationGroup({c in
            c.duration=animated && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0.3:0
            overlay.animator().alphaValue=visible ? 1:0
            for button in shelf.contentButtons{button.animator().alphaValue=visible ? 0:1}
        },completionHandler:{[weak self] in
            guard let self,self.overlayGeneration==token else{return}
            self.overlay.isHidden = !visible;self.shelf.dockButtonsHidden=visible;self.shelf.layout()
        })
    }
    func interrupt(){
        guard shelf.animating else{return}
        let frame=actualFrame();generation+=1
        NSAnimationContext.runAnimationGroup({c in c.duration=0;shelf.window.animator().setFrame(frame,display:true)})
        shelf.animating=false;shelf.animationTarget=nil
        if let id=activeCommand{activeCommand=nil;acknowledgement(id,"canceled","new-input")}
        shelf.motion("interrupted")
    }
    func begin(){
        guard !shelf.moving,!shelf.frozen,!shelf.retired,!shelf.assetDragging else{return}
        interrupt();gestureId+=1;deltaX=0;wasDocked=shelf.docked;shelf.moving=true;shelf.dragMoved=false
        shelf.dragStartFrame=actualFrame();shelf.dragStartPoint=NSEvent.mouseLocation
        shelf.motion("begin")
    }
    func dragged(_ event:NSEvent){
        guard shelf.moving,let initial=shelf.dragStartFrame,!shelf.frozen else{return}
        eventAt=event.timestamp
        let point=shelf.eventScreenPoint(event),dx=point.x-shelf.dragStartPoint.x,dy=point.y-shelf.dragStartPoint.y
        if !shelf.dragMoved && hypot(dx,dy)<=3{return}
        shelf.dragMoved=true;deltaX=event.deltaX
        var target=initial.offsetBy(dx:dx,dy:dy)
        if shelf.expanded {
            let area=shelf.bestScreen(target).visibleFrame
            target.size=NSSize(width:min(target.width,area.width),height:min(target.height,area.height))
            target.origin=NSPoint(x:max(area.minX,min(target.minX,area.maxX-target.width)),y:max(area.minY,min(target.minY,area.maxY-target.height)))
        }
        shelf.window.setFrame(target,display:true)
        if !shelf.expanded,let d=decision(){
            if d.progress>0.4 && overlay.isHidden{feedback(true,edge:d.edge)}
            else if d.progress<=0.4 && !overlay.isHidden{feedback(false)}
        }
        shelf.motion("dragged")
    }
    func decision()->ShelfEdgeDecision? {
        let f=actualFrame(),screen=shelf.bestScreen(f)
        return shelfEdgeDecision(f,screen:screen.frame,others:NSScreen.screens.filter{$0 != screen}.map{$0.frame},deltaX:deltaX)
    }
    func clickedRestore(){guard !shelf.frozen,!shelf.retired,shelf.docked,!shelf.moving,!shelf.animating else{return};emit(["event":"undockIntent","gestureId":gestureId]);feedback(false)}
    func finish(){
        guard shelf.moving else{return}
        shelf.moving=false;shelf.dragStartFrame=nil;shelf.motion(shelf.dragMoved ? "finished-moved":"finished-click")
        if !shelf.dragMoved{if wasDocked{clickedRestore()}else{shelf.geometry()};return}
        shelf.docked=false;shelf.geometry()
        guard !shelf.expanded,!shelf.assetDragging,let d=decision() else{feedback(false);shelf.geometry();return}
        shelf.motion("eligible",edge:d.edge)
        if d.docks{emit(["event":"dockIntent","edge":d.edge,"gestureId":gestureId,"deltaX":deltaX]);return}
        feedback(false)
        let frame=actualFrame(),screen=shelf.bestScreen(frame).visibleFrame
        if frame.minX<screen.minX || frame.maxX>screen.maxX {
            let target=NSRect(x:d.edge=="left" ? screen.minX+12:screen.maxX-frame.width-12,y:frame.minY,width:frame.width,height:frame.height)
            var restore=frameRecord(target);restore.removeValue(forKey:"presentation");restore.removeValue(forKey:"docked")
            emit(["event":"undockIntent","gestureId":gestureId,"restore":restore])
        }else{shelf.geometry()}
    }
    func animate(_ target:NSRect,duration:Double,docking:Bool,id:Int?=nil){
        interrupt();generation+=1;let token=generation;activeCommand=id;shelf.animating=true;shelf.animationTarget=target
        let duration=shelf.window.isVisible && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? duration:0
        animationDuration=duration;timingName=docking ? "easeOut":"easeInEaseOut"
        if !docking{feedback(false)}
        shelf.motion("animation-start")
        let complete:()->Void = {[weak self] in
            guard let self,self.generation==token,!self.shelf.retired else{return}
            self.shelf.animating=false;self.shelf.animationTarget=nil;self.shelf.docked=docking;self.activeCommand=nil
            if docking{self.feedback(true,edge:target.midX<self.shelf.bestScreen(target).frame.midX ? "left":"right")}
            self.shelf.layout();self.shelf.motion("animation-complete")
            if let id{self.acknowledgement(id,"completed")};self.shelf.geometry()
        }
        if duration==0{shelf.window.setFrame(target,display:true);complete()}
        else{NSAnimationContext.runAnimationGroup({c in c.duration=duration;c.timingFunction=CAMediaTimingFunction(name:docking ? .easeOut:.easeInEaseOut);c.allowsImplicitAnimation=true;shelf.window.animator().setFrame(target,display:true)},completionHandler:complete)}
    }
    func retire(){interrupt();generation+=1;shelf.moving=false;feedback(false,animated:false)}
}
