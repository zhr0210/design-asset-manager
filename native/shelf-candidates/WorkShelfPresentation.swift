import AppKit
import QuartzCore

/** Fixed-size foreground planes avoid scaling images/text with the glass frame.
 The outgoing bitmap is transient presentation only and never receives input. */
final class WorkShelfForeground:NSView {
    override var isFlipped:Bool{true}
    override var mouseDownCanMoveWindow:Bool{false}
    var visibleOpacity:CGFloat{CGFloat(layer?.presentation()?.opacity ?? Float(alphaValue))}
    override func hitTest(_ point:NSPoint)->NSView?{
        guard visibleOpacity>0.01,let hit=super.hitTest(point),hit !== self else{return nil}
        return hit
    }
}
final class WorkShelfSnapshot:NSImageView {
    override var isFlipped:Bool{true}
    override func hitTest(_ point:NSPoint)->NSView?{nil}
}
final class WorkShelfPresentationController {
    unowned let shelf:NativeWorkShelf
    private var generation=0
    private var pending:[DispatchWorkItem]=[]
    private var snapshot:WorkShelfSnapshot?
    private var snapshotSize=NSSize.zero
    private(set) var active=false
    private(set) var layoutSize:NSSize?
    private var horizontal:WorkShelfExpansionAnchor.Horizontal = .center
    init(_ shelf:NativeWorkShelf){self.shelf=shelf}
    private var planes:[NSView]{[shelf.topForeground,shelf.compactForeground,shelf.expandedForeground,shelf.statusForeground]}
    func stop() {
        generation+=1;for task in pending{task.cancel()};pending=[]
        for view in planes+[snapshot].compactMap({$0}) {
            let alpha=CGFloat(view.layer?.presentation()?.opacity ?? Float(view.alphaValue))
            view.layer?.removeAllAnimations();view.alphaValue=alpha
        }
    }
    private func fade(_ view:NSView,to alpha:CGFloat,duration:Double) {
        NSAnimationContext.runAnimationGroup{context in context.duration=duration;view.animator().alphaValue=alpha}
    }
    private func later(_ seconds:Double,_ operation:@escaping ()->Void) {
        let token=generation
        let work=DispatchWorkItem{[weak self] in guard let self,self.generation==token,!self.shelf.retired else{return};operation()}
        pending.append(work);DispatchQueue.main.asyncAfter(deadline:.now()+seconds,execute:work)
    }
    func prepare(horizontal:WorkShelfExpansionAnchor.Horizontal) {
        stop();self.horizontal=horizontal
        // Freeze current visual alpha before caching, including an interrupted
        // transition's outgoing image. Root contains foreground only, no glass.
        if shelf.window.isVisible,let bitmap=shelf.root.bitmapImageRepForCachingDisplay(in:shelf.root.bounds) {
            shelf.root.cacheDisplay(in:shelf.root.bounds,to:bitmap)
            let image=NSImage(size:shelf.root.bounds.size);image.addRepresentation(bitmap)
            snapshot?.removeFromSuperview()
            let view=WorkShelfSnapshot(frame:shelf.root.bounds);view.image=image;view.imageScaling = .scaleNone
            view.setAccessibilityElement(false);snapshot=view;snapshotSize=shelf.root.bounds.size
            shelf.root.addSubview(view,positioned:.above,relativeTo:nil)
        }else{snapshot?.removeFromSuperview();snapshot=nil}
        active=true
    }
    func start(target:NSRect) {
        layoutSize=target.size;shelf.layout();positionSnapshot()
        let animated=shelf.window.isVisible && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        guard animated else{finishImmediately();return}
        for view in planes{view.alphaValue=0}
        if let snapshot{fade(snapshot,to:0,duration:shelf.expanded ? 0.18:0.23)}
        if shelf.expanded {
            later(0.15){[weak self] in guard let self else{return};self.fade(self.shelf.topForeground,to:1,duration:0.2)}
            later(0.18){[weak self] in
                guard let self else{return}
                self.fade(self.shelf.expandedForeground,to:1,duration:0.3);self.fade(self.shelf.statusForeground,to:1,duration:0.3)
                if self.shelf.window.firstResponder===self.shelf.root{self.shelf.window.makeFirstResponder(self.shelf.collection)}
            }
            later(0.48){[weak self] in self?.finishImmediately()}
        }else{
            for view in [shelf.topForeground,shelf.compactForeground,shelf.statusForeground]{fade(view,to:1,duration:0.23)}
            later(0.23){[weak self] in self?.finishImmediately()}
        }
    }
    func positionSnapshot() {
        guard let snapshot else{return}
        snapshot.frame=planeFrame(size:snapshotSize)
        shelf.root.addSubview(snapshot,positioned:.above,relativeTo:nil)
        shelf.root.addSubview(shelf.interaction.overlay,positioned:.above,relativeTo:nil)
    }
    func planeFrame(size:NSSize)->NSRect {
        let bounds=shelf.root.bounds,x:CGFloat
        switch horizontal{case .center:x=(bounds.width-size.width)/2;case .left:x=0;case .right:x=bounds.width-size.width}
        return NSRect(x:x,y:(bounds.height-size.height)/2,width:size.width,height:size.height)
    }
    func finishImmediately() {
        stop();active=false;layoutSize=nil;snapshot?.removeFromSuperview();snapshot=nil
        for view in planes{view.alphaValue=1};shelf.layout()
    }
    func finishAfterInput() {
        guard active else{return}
        stop();let token=generation
        for view in planes{fade(view,to:1,duration:0.12)}
        if let snapshot{fade(snapshot,to:0,duration:0.12)}
        later(0.12){[weak self] in guard let self,self.generation==token else{return};self.finishImmediately()}
    }
    func retire(){stop();active=false;layoutSize=nil;snapshot?.removeFromSuperview();snapshot=nil}
}
