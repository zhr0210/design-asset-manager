import AppKit
import QuickLookUI
import QuartzCore
import UniformTypeIdentifiers

// This view process owns transient presentation only. Every mutation, file write,
// promise fulfillment and business operation is answered by the owned Host pipe.
let workShelfDropTypes:[NSPasteboard.PasteboardType]=[.fileURL,.png,.tiff,NSPasteboard.PasteboardType("com.dam.work-members")]+NSFilePromiseReceiver.readableDraggedTypes.map{NSPasteboard.PasteboardType($0)}

// The window/root is the asset destination. AppKit controls (notably an
// NSImageView) register legacy file and promise types themselves; leaving those
// registrations in place lets them steal drops even when their editing is off.
// Text editors retain plain-text dragging, and prioritize assets in their
// callbacks when a source also advertises a filename as text.
func workShelfUseRootDropDestination(_ view:NSView) {
    let types:[NSPasteboard.PasteboardType] = view is NSTextView ? [.string] : []
    if Set(view.registeredDraggedTypes) != Set(types) {
        view.unregisterDraggedTypes()
        if !types.isEmpty {view.registerForDraggedTypes(types)}
    }
    for child in view.subviews {workShelfUseRootDropDestination(child)}
}

struct WorkShelfItem {
    let id: String
    let name: String
    let type: String
    let dimensions: String
    let available: Bool
    let imageKey:String
    var image: NSImage?
}

func workShelfImageRect(_ image:NSImage,in bounds:NSRect)->NSRect {
    let size=image.size,scale=min(bounds.width/max(1,size.width),bounds.height/max(1,size.height))
    let w=size.width*scale,h=size.height*scale
    return NSRect(x:bounds.midX-w/2,y:bounds.midY-h/2,width:w,height:h)
}
func workShelfPreviewShadow(_ rect:NSRect,radius:CGFloat) {
    NSGraphicsContext.saveGraphicsState()
    let shadow=NSShadow();shadow.shadowBlurRadius=8;shadow.shadowOffset=NSSize(width:0,height:NSGraphicsContext.current?.isFlipped == true ? 3 : -3);shadow.shadowColor=NSColor.black.withAlphaComponent(0.18);shadow.set()
    NSColor.windowBackgroundColor.setFill();NSBezierPath(roundedRect:rect,xRadius:radius,yRadius:radius).fill()
    NSGraphicsContext.restoreGraphicsState()
}
final class WorkShelfRoundedImage:NSImageView {
    override func draw(_ dirtyRect:NSRect) {
        guard let image else{super.draw(dirtyRect);return}
        let rect=workShelfImageRect(image,in:bounds.insetBy(dx:7,dy:8))
        workShelfPreviewShadow(rect,radius:10)
        NSGraphicsContext.saveGraphicsState()
        NSBezierPath(roundedRect:rect,xRadius:10,yRadius:10).addClip()
        image.draw(in:rect,from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:nil);NSGraphicsContext.restoreGraphicsState()
    }
}
final class WorkShelfHeading:NSTextField {
    override func hitTest(_ point:NSPoint)->NSView? {nil}
}

final class WorkShelfWindow: NSPanel,NSDraggingDestination {
    weak var shelf:NativeWorkShelf?
    override func constrainFrameRect(_ frameRect:NSRect,to screen:NSScreen?)->NSRect {shelf?.expanded==true ? super.constrainFrameRect(frameRect,to:screen):frameRect}
    override var canBecomeKey: Bool { true }
    override func acceptsPreviewPanelControl(_ panel:QLPreviewPanel!)->Bool{shelf != nil}
    override func beginPreviewPanelControl(_ panel:QLPreviewPanel!){panel.dataSource=shelf;panel.delegate=shelf}
    override func endPreviewPanelControl(_ panel:QLPreviewPanel!){panel.dataSource=nil;panel.delegate=nil}
    override var canBecomeMain: Bool { false }
    func draggingEntered(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    func draggingUpdated(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    func prepareForDragOperation(_ sender:NSDraggingInfo)->Bool { true }
    func performDragOperation(_ sender:NSDraggingInfo)->Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
    override func performKeyEquivalent(with event:NSEvent)->Bool {
        if event.modifierFlags.contains(.command),!(firstResponder is NSTextView) {
            if shelf?.expanded==true && (shelf?.expandedForeground.visibleOpacity ?? 0)<=0.01{return true}
            if event.charactersIgnoringModifiers?.lowercased()=="v" {shelf?.action("paste");return true}
            if event.charactersIgnoringModifiers?.lowercased()=="a" {shelf?.selectAll();return true}
        }
        return super.performKeyEquivalent(with:event)
    }
}

final class WorkShelfRoot: NSView {
    weak var shelf: NativeWorkShelf?
    override var isFlipped: Bool { true }
    override var acceptsFirstResponder: Bool { true }
    override var mouseDownCanMoveWindow:Bool {false}
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func hitTest(_ point:NSPoint)->NSView? {
        guard let hit=super.hitTest(point) else{return nil}
        if let shelf,(shelf.dockFeedbackVisible || shelf.docked),hit !== shelf.interaction.overlay{return self}
        return hit
    }
    override func layout() { super.layout(); shelf?.layout();if let shelf{shelf.interaction.overlay.frame=bounds} }
    override func mouseDown(with event: NSEvent) {
        guard let shelf else { return }
        guard !shelf.frozen else{return}
        shelf.interaction.eventAt=event.timestamp
        if event.clickCount==2,shelf.interaction.doubleClickDock(convert(event.locationInWindow,from:nil)){return}
        shelf.beginUserTracking()
        shelf.dragStartPoint=shelf.eventScreenPoint(event)
    }
    override func mouseDragged(with event:NSEvent) {shelf?.moveFromEvent(event)}
    override func mouseUp(with event:NSEvent) {shelf?.interaction.eventAt=event.timestamp;shelf?.completeUserTracking()}
    override func keyDown(with event: NSEvent) { if shelf?.key(event) != true { super.keyDown(with: event) } }
    @objc func paste(_ sender: Any?) { shelf?.action("paste") }
    override func selectAll(_ sender: Any?) { shelf?.selectAll() }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation { .copy }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation { .copy }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool { true }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
}

final class WorkShelfCollection: NSCollectionView {
    weak var shelf: NativeWorkShelf?
    override var acceptsFirstResponder: Bool { true }
    override func keyDown(with event: NSEvent) { if shelf?.key(event) != true { super.keyDown(with: event) } }
    override func mouseDown(with event: NSEvent) { shelf?.clearSelection(); window?.makeFirstResponder(self) }
    @objc func paste(_ sender: Any?) { shelf?.action("paste") }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation { .copy }
    // Entry and completion are routed directly to Host rather than AppKit's
    // collection insertion machinery. Its inherited update rejects blank grid
    // locations, so the entire destination lifecycle must use the same policy.
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation { .copy }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool { true }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
}

final class WorkShelfDropScroll:NSScrollView {
    weak var shelf:NativeWorkShelf?
    override func draggingEntered(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func draggingUpdated(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func prepareForDragOperation(_ sender:NSDraggingInfo)->Bool { true }
    override func performDragOperation(_ sender:NSDraggingInfo)->Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
}

final class WorkShelfDropClip:NSClipView {
    weak var shelf:NativeWorkShelf?
    override func draggingEntered(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func draggingUpdated(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func prepareForDragOperation(_ sender:NSDraggingInfo)->Bool { true }
    override func performDragOperation(_ sender:NSDraggingInfo)->Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
}

final class WorkShelfTextView:NSTextView {
    weak var shelf:NativeWorkShelf?
    private func assetDrop(_ sender:NSDraggingInfo)->Bool { sender.draggingPasteboard.availableType(from:workShelfDropTypes) != nil }
    override func draggingEntered(_ sender:NSDraggingInfo)->NSDragOperation { assetDrop(sender) ? .copy : super.draggingEntered(sender) }
    override func draggingUpdated(_ sender:NSDraggingInfo)->NSDragOperation { assetDrop(sender) ? .copy : super.draggingUpdated(sender) }
    override func prepareForDragOperation(_ sender:NSDraggingInfo)->Bool { assetDrop(sender) || super.prepareForDragOperation(sender) }
    override func performDragOperation(_ sender:NSDraggingInfo)->Bool { assetDrop(sender) ? shelf?.receive(sender.draggingPasteboard) ?? false : super.performDragOperation(sender) }
}

final class WorkShelfCard: NSView {
    weak var shelf: NativeWorkShelf?
    var assetId = ""
    var down = NSPoint.zero
    var pendingSingleClick=false
    var dragging=false
    let picture = WorkShelfRoundedImage()
    let caption = NSTextField(labelWithString: "")
    let dimensions = NSTextField(labelWithString: "")
    private let selectionBackground=CALayer()
    override var isFlipped: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    // Thumbnail/labels are presentation; the card owns click, selection and
    // drag gestures. NSImageView otherwise consumes mouseDown and leaves a
    // previously edited text view as the keyboard responder.
    override func hitTest(_ point:NSPoint)->NSView? { super.hitTest(point)==nil ? nil : self }
    override init(frame: NSRect) {
        super.init(frame:frame); wantsLayer = true
        selectionBackground.name="selection-background";selectionBackground.cornerRadius=12;selectionBackground.opacity=0
        layer?.insertSublayer(selectionBackground,at:0);updateSelectionAppearance()
        picture.imageScaling = .scaleProportionallyUpOrDown
        caption.alignment = .center; caption.lineBreakMode = .byTruncatingMiddle
        dimensions.alignment = .center; dimensions.font = .systemFont(ofSize:11); dimensions.textColor = .secondaryLabelColor
        for view in [picture,caption,dimensions] { addSubview(view) }
        setAccessibilityElement(true); setAccessibilityRole(.button)
        workShelfUseRootDropDestination(self)
    }
    required init?(coder:NSCoder) { fatalError("programmatic") }
    override func layout() {
        super.layout()
        CATransaction.begin();CATransaction.setDisableActions(true);selectionBackground.frame=bounds;CATransaction.commit()
        picture.frame = NSRect(x:12,y:10,width:bounds.width-24,height:max(20,bounds.height-65))
        caption.frame = NSRect(x:8,y:bounds.height-45,width:bounds.width-16,height:20)
        dimensions.frame = NSRect(x:8,y:bounds.height-24,width:bounds.width-16,height:18)
        workShelfUseRootDropDestination(self)
    }
    private var visuallySelected=false
    override func viewDidChangeEffectiveAppearance() {
        super.viewDidChangeEffectiveAppearance()
        updateSelectionAppearance()
        needsDisplay=true
    }
    private func updateSelectionAppearance() {
        effectiveAppearance.performAsCurrentDrawingAppearance {
            CATransaction.begin();CATransaction.setDisableActions(true)
            selectionBackground.backgroundColor=NSColor.unemphasizedSelectedContentBackgroundColor.cgColor
            CATransaction.commit()
        }
    }
    func update(_ item:WorkShelfItem, selected:Bool) {
        let reused=assetId != item.id,changed=visuallySelected != selected
        assetId = item.id; picture.image = item.image ?? NSImage(systemSymbolName: item.available ? "photo" : "exclamationmark.triangle",accessibilityDescription:nil)
        caption.stringValue = item.name; dimensions.stringValue = item.available ? item.dimensions : "引用故障，请检查资料库"
        visuallySelected=selected;updateSelectionAppearance()
        if reused || changed {
            // Before the first render there is no presentation layer yet. A
            // replaced, uncommitted fade still starts at its original visual
            // value, rather than a model target which was never displayed.
            let uncommitted=(selectionBackground.animation(forKey:"selection-opacity") as? CABasicAnimation)?.fromValue as? Float
            let from=selectionBackground.presentation()?.opacity ?? uncommitted ?? selectionBackground.opacity,target:Float=selected ? 1:0
            selectionBackground.removeAnimation(forKey:"selection-opacity")
            CATransaction.begin();CATransaction.setDisableActions(true);selectionBackground.opacity=target;CATransaction.commit()
            if !reused && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
                let animation=CABasicAnimation(keyPath:"opacity");animation.fromValue=from;animation.toValue=target
                animation.duration=0.16;animation.timingFunction=CAMediaTimingFunction(name:.easeInEaseOut)
                selectionBackground.add(animation,forKey:"selection-opacity")
            }
        }
        setAccessibilityLabel("\(item.name)，\(dimensions.stringValue)"); setAccessibilityValue(selected ? "已选择" : "未选择")
    }
    override func accessibilityPerformPress() -> Bool { shelf?.select(assetId, toggle:NSEvent.modifierFlags.contains(.shift));window?.makeFirstResponder(shelf?.collection); return true }
    override func mouseDown(with event:NSEvent) {
        guard shelf?.frozen != true else{return}
        down=convert(event.locationInWindow,from:nil);dragging=false
        let toggle=event.modifierFlags.contains(.shift)
        pendingSingleClick = !toggle && shelf?.selected.contains(assetId)==true && (shelf?.selected.count ?? 0)>1
        if !pendingSingleClick {shelf?.select(assetId,toggle:toggle)}
        window?.makeFirstResponder(shelf?.collection)
    }
    override func mouseUp(with event:NSEvent) {if pendingSingleClick && !dragging{shelf?.select(assetId,toggle:false)};pendingSingleClick=false}
    override func mouseDragged(with event:NSEvent) {
        let point = convert(event.locationInWindow,from:nil)
        if !dragging && hypot(point.x-down.x,point.y-down.y)>3 {dragging=true;pendingSingleClick=false;shelf?.drag(assetId,event:event,view:self)}
    }
    override func draggingEntered(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func draggingUpdated(_ sender:NSDraggingInfo)->NSDragOperation { .copy }
    override func prepareForDragOperation(_ sender:NSDraggingInfo)->Bool { true }
    override func performDragOperation(_ sender:NSDraggingInfo)->Bool { shelf?.receive(sender.draggingPasteboard) ?? false }
}

final class WorkShelfCollectionItem: NSCollectionViewItem {
    override func loadView() { view = WorkShelfCard(frame:NSRect(x:0,y:0,width:180,height:190)) }
}

final class WorkShelfStack: NSView {
    weak var shelf:NativeWorkShelf?
    var down = NSPoint.zero
    override var isFlipped:Bool { true }
    override func draw(_ dirtyRect:NSRect) {
        guard let shelf else { return }
        let rect = bounds.insetBy(dx:30,dy:16)
        for item in shelf.items.prefix(3).reversed() {
            if let image=item.image ?? NSImage(systemSymbolName:"photo",accessibilityDescription:nil) {
                let frame=workShelfImageRect(image,in:rect);NSGraphicsContext.saveGraphicsState()
                workShelfPreviewShadow(frame,radius:12)
                NSBezierPath(roundedRect:frame,xRadius:12,yRadius:12).addClip()
                image.draw(in:frame,from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:nil)
                NSGraphicsContext.restoreGraphicsState()
            }
        }
    }
    override func mouseDown(with event:NSEvent) { down = convert(event.locationInWindow,from:nil); if let first=shelf?.items.first { shelf?.select(first.id,toggle:false) }; window?.makeFirstResponder(shelf?.root) }
    override func mouseDragged(with event:NSEvent) { let p=convert(event.locationInWindow,from:nil);if hypot(p.x-down.x,p.y-down.y)>3,let first=shelf?.items.first { shelf?.drag(first.id,event:event,view:self) } }
}

final class NativeWorkShelf:NSObject,QLPreviewPanelDataSource,QLPreviewPanelDelegate,NSWindowDelegate,NSCollectionViewDataSource,NSCollectionViewDelegate,NSTextViewDelegate,NSTextFieldDelegate,NSDraggingSource,NSFilePromiseProviderDelegate,NSPopoverDelegate,NSSharingServicePickerDelegate,NSSharingServiceDelegate {
    let window:WorkShelfWindow
    let root=WorkShelfRoot()
    let topForeground=WorkShelfForeground(),compactForeground=WorkShelfForeground(),expandedForeground=WorkShelfForeground(),statusForeground=WorkShelfForeground()
    lazy var presentation=WorkShelfPresentationController(self)
    let collection=WorkShelfCollection()
    let scroll=WorkShelfDropScroll()
    let stack=WorkShelfStack()
    let back=NSButton(title:"",target:nil,action:nil)
    let dropdown=NSButton(title:"",target:nil,action:nil)
    let capsule=WorkShelfCapsule(frame:.zero)
    let heading=WorkShelfHeading(labelWithString:"")
    let errorField=NSTextField(labelWithString:"")
    let retry=NSButton(title:"重试保存",target:nil,action:nil)
    var items:[WorkShelfItem]=[]
    var selected=Set<String>()
    var primary:String?
    var revision=1
    var systemGeneration=UUID()
    var previewURLs:[URL]=[]
    var systemReceiptsByPath:[String:String]=[:]
    var sharingEscapeTimestamp:TimeInterval?
    var sharingDismissalUntil:TimeInterval=0
    var feedbackNeedsRetry=false
    var sharingPicker:NSSharingServicePicker?
    var name="工作集"
    let indicator=NSView()
    var indicatorColor:String?
    var alwaysShowIndicator=false
    var currentSpaceOnly=false
    var serial=0
    var acknowledged=0
    var presentationHidden=false
    var expanded=false
    var docked=false
    var normal:NSRect?
    var expansionAnchor:WorkShelfExpansionAnchor?
    var assetDragging=false
    lazy var interaction=WorkShelfInteractionController(self)
    var moving=false
    var dragStartFrame:NSRect?
    var dragStartPoint=NSPoint.zero
    var dragMoved=false
    var configuringFrame=false
    var animating=false
    var retired=false
    var frozen=false
    var dockFeedbackVisible=false
    var dockButtonsHidden=false
    var contentButtons:[NSButton]{[back,dropdown,capsule,retry]}
    var animationTarget:NSRect?
    var motionId=0
    var applying=false
    var requests:[String:([String:Any])->Void]=[:]
    var locallyPresentedReplies=Set<String>()
    var promises:[String:(Error?)->Void]=[:]
    var colorPicker:NSPopover?
    var tools:NSPopover?
    var libraryIdentity=""
    var generation=""

    let inputRoot:URL
    var pendingInput=0
    init(root inputDirectory:URL) {
        inputRoot=inputDirectory
        window=WorkShelfWindow(contentRect:NSRect(x:100,y:100,width:220,height:240),styleMask:[.titled,.fullSizeContentView,.nonactivatingPanel],backing:.buffered,defer:false)
        super.init()
        window.shelf=self;window.hidesOnDeactivate=false;window.becomesKeyOnlyIfNeeded=false
        window.isMovableByWindowBackground=false
        window.titleVisibility = .hidden;window.titlebarAppearsTransparent=true
        for kind in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton]{window.standardWindowButton(kind)?.isHidden=true}
        // Full-size content uses the system's rounded window frame, including
        // key appearance. No private corner setter or painted masking border.
        window.setFrame(NSRect(x:100,y:100,width:220,height:240),display:false)
        window.registerForDraggedTypes(workShelfDropTypes)
        window.isOpaque=false;window.backgroundColor = .clear;window.hasShadow=true;window.isReleasedWhenClosed=false
        window.level = .floating;window.collectionBehavior=[.canJoinAllSpaces,.managed,.participatesInCycle];window.delegate=self
        root.frame=NSRect(x:0,y:0,width:220,height:240);root.autoresizingMask=[.width,.height];root.shelf=self
        if #available(macOS 26.0, *) {
            let glass=NSGlassEffectView(frame:root.bounds)
            glass.cornerRadius=16;glass.autoresizingMask=[.width,.height];glass.contentView=root;window.contentView=glass
        } else {
            let background=NSVisualEffectView(frame:root.bounds)
            background.material = .underWindowBackground;background.blendingMode = .behindWindow;background.state = .active
            background.wantsLayer=true;background.layer?.cornerRadius=10;background.layer?.masksToBounds=true
            background.autoresizingMask=[.width,.height];background.addSubview(root);window.contentView=background
        }
        root.setAccessibilityLabel("原生工作集架子");root.registerForDraggedTypes(workShelfDropTypes)
        collection.shelf=self;collection.backgroundColors=[.clear];collection.isSelectable=false
        let flow=NSCollectionViewFlowLayout();flow.minimumInteritemSpacing=12;flow.minimumLineSpacing=12;collection.collectionViewLayout=flow
        // Installing the layout creates AppKit's modern collection core. Register
        // item classes afterwards; pre-layout registration belongs to legacy mode.
        collection.register(WorkShelfCollectionItem.self,forItemWithIdentifier:NSUserInterfaceItemIdentifier("reference"));collection.dataSource=self;collection.delegate=self
        scroll.shelf=self;let clip=WorkShelfDropClip();clip.shelf=self;scroll.contentView=clip;scroll.documentView=collection;scroll.hasVerticalScroller=true;scroll.drawsBackground=false
        heading.alignment = .center;heading.font = .systemFont(ofSize:13,weight:.semibold)
        errorField.textColor = .systemRed;errorField.font = .systemFont(ofSize:11);errorField.lineBreakMode = .byTruncatingTail
        back.target=self;back.action=#selector(backOrClose);back.bezelStyle = .circular;back.imagePosition = .imageOnly
        dropdown.target=self;dropdown.action=#selector(menu);dropdown.bezelStyle = .circular;dropdown.imagePosition = .imageOnly
        dropdown.image=NSImage(systemSymbolName:"ellipsis",accessibilityDescription:"工作集操作菜单");dropdown.setAccessibilityLabel("工作集操作菜单")
        capsule.target=self;capsule.action=#selector(toggleExpanded);capsule.bezelStyle = .rounded;capsule.setAccessibilityLabel("展开工作集")
        retry.target=self;retry.action=#selector(retrySave);retry.isHidden=true
        stack.shelf=self
        for plane in [topForeground,compactForeground,expandedForeground,statusForeground]{plane.wantsLayer=true;root.addSubview(plane)}
        indicator.wantsLayer=true;indicator.layer?.cornerRadius=2;indicator.setAccessibilityElement(false)
        for view in [back,dropdown,heading,indicator]{topForeground.addSubview(view)}
        for view in [stack,capsule]{compactForeground.addSubview(view)}
        for view in [scroll]{expandedForeground.addSubview(view)}
        for view in [errorField,retry]{statusForeground.addSubview(view)}
        layout()
    }
    func installMenu() {
        let menu=NSMenu(),app=NSMenu(),appItem=NSMenuItem();appItem.submenu=app;menu.addItem(appItem)
        let close=NSMenuItem(title:"关闭工作集窗口",action:#selector(closeRequested),keyEquivalent:"w");close.target=self;app.addItem(close)
        let edit=NSMenu(title:"编辑"),editItem=NSMenuItem(title:"编辑",action:nil,keyEquivalent:"");editItem.submenu=edit;menu.addItem(editItem)
        for (title,selector,key) in [("剪切","cut:","x"),("复制","copy:","c"),("粘贴","paste:","v"),("全选","selectAll:","a")] { edit.addItem(NSMenuItem(title:title,action:Selector(selector),keyEquivalent:key)) }
        NSApp.mainMenu=menu
    }
    func layout() {
        for view in root.subviews {workShelfUseRootDropDestination(view)}
        let b=expanded ? NSRect(origin:.zero,size:presentation.layoutSize ?? animationTarget?.size ?? interaction.interruptedPresentationSize ?? root.bounds.size):root.bounds,small=false
        topForeground.frame=root.bounds;statusForeground.frame=root.bounds
        compactForeground.frame=presentation.planeFrame(size:NSSize(width:220,height:240));compactForeground.isHidden=expanded
        expandedForeground.frame=presentation.planeFrame(size:b.size);expandedForeground.isHidden = !expanded
        for v in [scroll,stack,back,dropdown,capsule,heading] { v.isHidden=small }
        errorField.isHidden=small || errorField.stringValue.isEmpty;retry.isHidden=small || errorField.stringValue.isEmpty || !feedbackNeedsRetry
        let minimum=expanded ? NSSize(width:220,height:160) : NSSize(width:220,height:240)
        if window.minSize != minimum { window.minSize=minimum }
        let resizable=false
        if window.styleMask.contains(.resizable) != resizable {
            let visible=window.isVisible
            if resizable {window.styleMask.insert(.resizable)}else{window.styleMask.remove(.resizable)}
            if visible {window.orderFrontRegardless()}
        }
        for kind in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton]{window.standardWindowButton(kind)?.isHidden=true}

        back.image=NSImage(systemSymbolName:expanded ? "chevron.left":"xmark",accessibilityDescription:expanded ? "收起工作集":"关闭工作集架子")
        back.setAccessibilityLabel(expanded ? "收起工作集" : "关闭工作集架子")
        indicator.frame=NSRect(x:topForeground.bounds.midX-15,y:2,width:30,height:4)
        indicator.isHidden = indicatorColor==nil || (!alwaysShowIndicator && !window.isKeyWindow)
        if let hex=indicatorColor {let color=WorkShelfColorSelection(hex:hex);indicator.layer?.backgroundColor=color.color.cgColor}
        let header=topForeground.bounds
        back.frame=NSRect(x:12,y:10,width:32,height:32);dropdown.frame=NSRect(x:header.width-44,y:10,width:32,height:32)
        heading.frame=NSRect(x:48,y:15,width:header.width-96,height:22);heading.stringValue=expanded ? "\(name) · \(selected.isEmpty ? "\(items.count)份参考" : "已选\(selected.count)份")" : name
        heading.isHidden = !expanded
        capsule.frame=NSRect(x:28,y:195,width:164,height:28)
        capsule.configure(name:name,active:!expanded && !docked && !frozen && !retired && !presentationHidden)
        stack.frame=NSRect(x:12,y:50,width:196,height:135);stack.isHidden=expanded
        scroll.isHidden = !expanded;capsule.isHidden=expanded || items.isEmpty
        if expanded {
            scroll.frame=NSRect(x:14,y:54,width:b.width-28,height:max(80,b.height-68))
            let width=floor(max(160,(scroll.contentSize.width-12)/2))
            if let flow=collection.collectionViewLayout as? NSCollectionViewFlowLayout,flow.itemSize != NSSize(width:width,height:113) { flow.itemSize=NSSize(width:width,height:113) }
        }
        let status=statusForeground.bounds
        errorField.frame=NSRect(x:18,y:status.height-21,width:status.width-125,height:18);errorField.isHidden=errorField.stringValue.isEmpty
        retry.frame=NSRect(x:status.width-108,y:status.height-24,width:94,height:22)
        for button in contentButtons {
            button.isEnabled = !frozen && !dockFeedbackVisible && !docked
            if dockButtonsHidden{button.isHidden=true}
        }
        presentation.positionSnapshot()
    }
    func collectionView(_ collectionView:NSCollectionView,numberOfItemsInSection section:Int)->Int { items.count }
    func collectionView(_ collectionView:NSCollectionView,validateDrop draggingInfo:NSDraggingInfo,proposedIndexPath proposedDropIndexPath:AutoreleasingUnsafeMutablePointer<NSIndexPath>,dropOperation proposedDropOperation:UnsafeMutablePointer<NSCollectionView.DropOperation>)->NSDragOperation { .copy }
    func collectionView(_ collectionView:NSCollectionView,acceptDrop draggingInfo:NSDraggingInfo,indexPath:IndexPath,dropOperation:NSCollectionView.DropOperation)->Bool { receive(draggingInfo.draggingPasteboard) }
    func collectionView(_ collectionView:NSCollectionView,itemForRepresentedObjectAt indexPath:IndexPath)->NSCollectionViewItem {
        let item=collectionView.makeItem(withIdentifier:NSUserInterfaceItemIdentifier("reference"),for:indexPath)
        if let card=item.view as? WorkShelfCard { card.shelf=self;card.update(items[indexPath.item],selected:selected.contains(items[indexPath.item].id)) }
        return item
    }
    func refreshSelection() {
        for index in items.indices { if let card=collection.item(at:index)?.view as? WorkShelfCard { card.update(items[index],selected:selected.contains(items[index].id)) } }
        layout()
    }
    func select(_ id:String,toggle:Bool) {
        guard items.contains(where:{$0.id==id}) else { return }
        if toggle { if selected.contains(id) { selected.remove(id) } else { selected.insert(id) } }
        else { selected=[id] }
        primary=selected.contains(id) ? id : items.last(where:{selected.contains($0.id)})?.id
        refreshSelection()
    }
    func clearSelection() { selected=[];primary=nil;refreshSelection() }
    func selectAll() { selected=Set(items.map(\.id));primary=items.first(where:{selected.contains($0.id)})?.id;refreshSelection() }
    func targets()->[String] { items.filter{!expanded || selected.isEmpty || selected.contains($0.id)}.map(\.id) }
    var targetSummary:String{"\(expanded && !selected.isEmpty ? "所选":"全部") \(targets().count) 项"}
    func key(_ event:NSEvent)->Bool {
        if frozen{return true}
        if expanded && expandedForeground.visibleOpacity<=0.01 && event.keyCode != 53{return true}
        if dockFeedbackVisible || docked {
            if event.keyCode==36 || event.keyCode==49{interaction.clickedRestore()}
            return true
        }
        if event.keyCode==49 { if !event.isARepeat,let primary { action("focus",["assetId":primary]) };return true }
        if event.keyCode==51 || event.keyCode==117 { if !selected.isEmpty { edit("remove",items.filter{selected.contains($0.id)}.map(\.id)) };return true }
        if event.keyCode==53 {
            if sharingPicker != nil{sharingEscapeTimestamp=event.timestamp;return true}
            if sharingEscapeTimestamp==event.timestamp{return true}
            if ProcessInfo.processInfo.systemUptime<=sharingDismissalUntil{return true}
            if colorPicker?.isShown==true{dismissColorPicker();return true}
            if let pop=tools,pop.isShown{pop.close();return true}
            if expanded { toggleExpanded() };return true
        }
        if [123,124,125,126].contains(event.keyCode),!items.isEmpty {
            let at=items.firstIndex(where:{$0.id==primary}) ?? 0,delta=[123,126].contains(event.keyCode) ? -1 : 1
            let to=max(0,min(items.count-1,at+delta));select(items[to].id,toggle:event.modifierFlags.contains(.shift));collection.scrollToItems(at:[IndexPath(item:to,section:0)],scrollPosition:.nearestHorizontalEdge);return true
        }
        return false
    }
    @objc func backOrClose() { if expanded { toggleExpanded() } else { closeRequested() } }
    @objc func closeRequested() { emit(["event":"closeRequested"]) }
    @objc func toggleExpanded() {
        configuringFrame=true;defer{configuringFrame=false}
        guard !frozen,!retired,!moving,!docked else{return}
        dismissColorPicker();tools?.close();interaction.interrupt();interaction.feedback(false)
        let old=window.frame,screen=bestScreen(old).visibleFrame
        let rect:NSRect
        let horizontal:WorkShelfExpansionAnchor.Horizontal
        if !expanded {
            expansionAnchor=WorkShelfExpansionAnchor(compact:expansionAnchor?.compact ?? old,screen:screen,count:items.count)
            horizontal=expansionAnchor!.horizontal
            rect=expansionAnchor!.expanded
        } else {
            horizontal=expansionAnchor?.horizontal ?? .center
            let compact=expansionAnchor?.compact ?? NSRect(x:old.midX-110,y:old.midY-120,width:220,height:240)
            rect=WorkShelfExpansionAnchor.clamp(compact,to:screen)
        }
        presentation.prepare(horizontal:horizontal)
        expanded.toggle()
        presentation.start(target:rect);animate(rect,duration:expanded ? 0.18:0.23)
        window.makeFirstResponder(root)
        if !presentation.active && expanded{window.makeFirstResponder(collection)}
    }
    func resizeExpandedIfNeeded() {
        guard expanded,!moving,!frozen,!retired,!docked else{return}
        let old=window.frame,area=bestScreen(old).visibleFrame
        let compact=expansionAnchor?.compact ?? NSRect(x:old.midX-110,y:old.midY-120,width:220,height:240)
        let next=WorkShelfExpansionAnchor(compact:compact,screen:area,count:items.count)
        guard (animationTarget ?? old).size != next.expanded.size else{return}
        interaction.interrupt();expansionAnchor=next
        presentation.prepare(horizontal:next.horizontal);presentation.start(target:next.expanded)
        animate(next.expanded,duration:0.18)
    }
    func bestScreen(_ f:NSRect)->NSScreen { NSScreen.screens.max { let a=$0.visibleFrame.intersection(f),b=$1.visibleFrame.intersection(f);return max(0,a.width)*max(0,a.height)<max(0,b.width)*max(0,b.height) } ?? NSScreen.main! }
    func motion(_ phase:String,edge:String?=nil) {
        var value=interaction.frameRecord(interaction.actualFrame());value["event"]="motion";value["phase"]=phase;value["motionId"]=motionId;value["gestureId"]=interaction.gestureId;value["nativeAt"]=ProcessInfo.processInfo.systemUptime;value["deltaX"]=interaction.deltaX;value["eventAt"]=interaction.eventAt
        value["duration"]=interaction.animationDuration;value["timing"]=interaction.timingName
        if let target=animationTarget{let record=interaction.frameRecord(target);value["targetX"]=record["x"];value["targetY"]=record["y"];value["targetWidth"]=record["width"];value["targetHeight"]=record["height"]}
        value["transitionId"]=interaction.generation;value["frameSource"]=interaction.frameSource
        if let decision=interaction.decision(){value["progress"]=decision.progress;value["edge"]=decision.edge;value["reason"]=decision.docks ? "outward-or-progress":"inside-or-reversed"}
        let screen=bestScreen(interaction.actualFrame()).frame;value["screenMinX"]=screen.minX;value["screenMaxX"]=screen.maxX
        if let edge{value["edge"]=edge};emit(value)
    }
    func beginUserTracking(){interaction.begin()}
    func eventScreenPoint(_ event:NSEvent)->NSPoint {
        if let p=event.cgEvent?.location{return NSPoint(x:p.x,y:(NSScreen.screens.first?.frame.maxY ?? 0)-p.y)}
        return window.convertPoint(toScreen:event.locationInWindow)
    }
    func moveFromEvent(_ event:NSEvent){interaction.dragged(event)}
    func completeUserTracking(){interaction.finish()}
    func windowDidBecomeKey(_ notification:Notification){layout()}
    func windowDidResignKey(_ notification:Notification){layout()}
    func windowDidMove(_ notification:Notification){if !moving && !animating && !configuringFrame{geometry()}}
    func windowDidResize(_ notification:Notification){if !moving && !animating && !configuringFrame{geometry()}}
    func geometry(){
        guard !retired else{return}
        var out=interaction.frameRecord(interaction.actualFrame());out["event"]="geometry";out["motionId"]=motionId;out["gestureId"]=interaction.gestureId
        if let n=normal,docked{out["normal"]=interaction.frameRecord(n)}
        emit(out)
    }
    func interruptTransition(){interaction.interrupt()}
    func suspendPresentation() {
        let target=presentation.active ? (animationTarget ?? (expanded ? expansionAnchor?.expanded:expansionAnchor?.compact)):nil
        interaction.interrupt()
        if let target{configuringFrame=true;window.setFrame(target,display:window.isVisible);configuringFrame=false}
        presentation.finishImmediately();geometry()
    }
    func animate(_ rect:NSRect,duration:Double=0.2,docking:Bool=false){interaction.animate(rect,duration:duration,docking:docking)}
    func visibility() { emit(["event":"visibility","visible":window.isVisible]) }
    func action(_ kind:String,_ payload:[String:Any]=[:],presentsReply:Bool=false,completion:(([String:Any])->Void)?=nil) {
        if frozen && kind != "transient" {completion?(["ok":false,"message":"窗口正在保存和关闭，未开始新操作。"]);return}
        let id=UUID().uuidString;var out=payload;out["event"]="action";out["kind"]=kind;out["requestId"]=id
        if let completion { requests[id]=completion;if presentsReply{locallyPresentedReplies.insert(id)} };emit(out)
    }
    func edit(_ field:String,_ value:Any) { if field=="name",let text=value as? String {name=text;layout()};serial+=1;action("edit",["field":field,"value":value,"serial":serial]) }
    func dismissColorPicker() {
        guard let pop=colorPicker else{return}
        (pop.contentViewController as? WorkShelfColorPicker)?.retireDraft()
        pop.close()
    }
    func popoverWillClose(_ notification:Notification) {
        guard let pop=notification.object as? NSPopover else{return}
        (pop.contentViewController as? WorkShelfColorPicker)?.retireDraft()
    }
    func popoverDidClose(_ notification:Notification) {
        guard let pop=notification.object as? NSPopover,pop===colorPicker else{return}
        (pop.contentViewController as? WorkShelfColorPicker)?.retireDraft();colorPicker=nil
    }
    @objc func retrySave() {
        action("review-save"){[weak self] reply in
            guard let self,let value=reply["review"] as? [String:Any],let revision=value["revision"] as? Int else{return}
            let alert=NSAlert();alert.messageText="核对工作集保存"
            alert.informativeText="库内版本 \(revision)：\(value["name"] as? String ?? "")，\(value["count"] as? Int ?? 0)份参考。继续会使用本机草稿保存名称和引用，素材原件保持。"
            alert.addButton(withTitle:"保留草稿，暂不提交");alert.addButton(withTitle:"使用本机草稿并保存")
            if alert.runModal() == .alertSecondButtonReturn {self.action("resolve-save",["revision":revision])}
        }
    }
    func operationMenu()->NSMenu {
        let menu=NSMenu();menu.autoenablesItems=false
        let ids=targets(),count=ids.count,summary=targetSummary
        addSystemMenu(to:menu,ids:ids,summary:summary);menu.addItem(.separator())
        for (title,kind) in [("交付原件副本","original"),("交付预览副本","preview"),("交付兼容PNG","compatible-png"),("调整图像尺寸…","processed-image"),("转换图像格式…","convert"),("压缩图像…","compress"),("清理元数据…","metadata"),("生成 PDF…","pdf"),("拼接图像…","stitch"),("ZIP归档","zip")] {
            let item=NSMenuItem(title:"\(title) · \(summary)",action:#selector(delivery(_:)),keyEquivalent:"")
            item.target=self;item.representedObject=["kind":kind,"ids":ids,"summary":summary];item.isEnabled=count>0 && count<=64 && !frozen && !retired
            if ["compress","metadata"].contains(kind){let types=Set(items.filter{ids.contains($0.id)}.map{$0.type=="jpg" ? "jpeg":$0.type});if types.count != 1 || !types.isSubset(of:["png","jpeg","webp"]){item.isEnabled=false;item.title += "（需同格式图片）"}}
            menu.addItem(item)
        }
        menu.addItem(.separator());let rename=NSMenuItem(title:"修改工作集名称…",action:#selector(rename),keyEquivalent:"");rename.target=self;menu.addItem(rename)
        if count>64{let limit=NSMenuItem(title:"单次交付最多64项，请在展开态选择",action:nil,keyEquivalent:"");limit.isEnabled=false;menu.insertItem(limit,at:5)}
        menu.addItem(.separator())
        let settings=NSMenu(title:"自定义窗口");settings.autoenablesItems=false
        for (title,key,state) in [("固定窗口","pinned",window.level == .floating),("始终显示指示器","alwaysShowIndicator",alwaysShowIndicator),("仅留在当前 Space","currentSpaceOnly",currentSpaceOnly)] {
            let item=NSMenuItem(title:title,action:#selector(toggleSetting(_:)),keyEquivalent:"");item.target=self;item.representedObject=key;item.state=state ? .on:.off;settings.addItem(item)
        }
        let color=NSMenuItem(title:"指示器颜色…",action:#selector(chooseIndicatorColor),keyEquivalent:"");color.target=self;settings.addItem(color)
        let clear=NSMenuItem(title:"无指示器",action:#selector(clearIndicatorColor),keyEquivalent:"");clear.target=self;settings.addItem(clear)
        let parent=NSMenuItem(title:"自定义窗口",action:nil,keyEquivalent:"");parent.submenu=settings;menu.addItem(parent)
        addReferenceMenu(to:menu)
        return menu
    }
    func updateWindowSettings(_ extra:[String:Any]=[:]) {
        var value:[String:Any]=["pinned":window.level == .floating,"indicatorColor":indicatorColor as Any? ?? NSNull(),"alwaysShowIndicator":alwaysShowIndicator,"currentSpaceOnly":currentSpaceOnly]
        for (key,item) in extra{value[key]=item};action("window-settings",value)
    }
    @objc func toggleSetting(_ sender:NSMenuItem){guard let key=sender.representedObject as? String else{return};updateWindowSettings([key:sender.state != .on])}
    @objc func clearIndicatorColor(){updateWindowSettings(["indicatorColor":NSNull()])}
    @objc func chooseIndicatorColor(){
        guard !frozen,!retired else{return};dismissColorPicker()
        let controller=WorkShelfColorPicker(initial:indicatorColor ?? "#6040FF",existing:[])
        _ = controller.view;controller.confirm.title="设置";controller.confirm.setAccessibilityLabel("设置窗口指示器颜色")
        let pop=NSPopover();pop.behavior = .transient;pop.contentViewController=controller;pop.contentSize=NSSize(width:280,height:356);pop.delegate=self;colorPicker=pop
        controller.added={[weak self,weak pop] hex in guard let self,let pop,self.colorPicker===pop,!self.frozen,!self.retired else{return};self.updateWindowSettings(["indicatorColor":hex])}
        controller.dismissed={[weak pop] in pop?.close()};pop.show(relativeTo:dropdown.bounds,of:dropdown,preferredEdge:.maxY)
    }
    func applyMetadata(_ command:[String:Any]) {
        indicatorColor=command["indicatorColor"] as? String;alwaysShowIndicator=command["alwaysShowIndicator"] as? Bool ?? false;currentSpaceOnly=command["currentSpaceOnly"] as? Bool ?? false
        window.collectionBehavior=currentSpaceOnly ? [.managed,.participatesInCycle]:[.canJoinAllSpaces,.managed,.participatesInCycle]
        layout()
    }
    @objc func menu() {
        guard !frozen,!retired,!dockFeedbackVisible,!docked else{return}
        let menu=operationMenu()
        menu.popUp(positioning:nil,at:NSPoint(x:0,y:dropdown.bounds.height),in:dropdown)
    }
    @objc func rename() { let alert=NSAlert();alert.messageText="工作集名称";let field=NSTextField(string:name);field.frame=NSRect(x:0,y:0,width:260,height:24);alert.accessoryView=field;alert.addButton(withTitle:"确定");alert.addButton(withTitle:"取消");if alert.runModal() == .alertFirstButtonReturn { edit("name",field.stringValue) } }
    @objc func delivery(_ sender:NSMenuItem) {
        guard !frozen,!retired,let value=sender.representedObject as? [String:Any],let kind=value["kind"] as? String,let ids=value["ids"] as? [String],let summary=value["summary"] as? String else{return}
        let controller=WorkShelfTools(shelf:self,kind:kind,ids:ids,summary:summary);let pop=NSPopover();pop.behavior = .semitransient;pop.contentViewController=controller;pop.contentSize=NSSize(width:300,height:["processed-image","convert","compress","metadata","stitch"].contains(kind) ? 400 : 220);tools=pop;pop.show(relativeTo:dropdown.bounds,of:dropdown,preferredEdge:.maxY)
    }
    func feedback(_ text:String,needsRetry:Bool=true) {
        if !needsRetry,feedbackNeedsRetry,!errorField.stringValue.isEmpty{return}
        feedbackNeedsRetry=needsRetry && !text.isEmpty
        errorField.textColor=feedbackNeedsRetry ? .systemRed:.secondaryLabelColor
        errorField.stringValue=String(text.prefix(300));retry.isHidden=text.isEmpty || !feedbackNeedsRetry;layout()
    }
    func inform(_ text:String){feedback(text,needsRetry:false)}
    func receive(_ board:NSPasteboard)->Bool {
        guard !frozen else{return false}
        if let data=board.data(forType:NSPasteboard.PasteboardType("com.dam.work-members")),let value=try? JSONSerialization.jsonObject(with:data) as? [String:Any] { action("members",["transfer":value]);return true }
        if let urls=board.readObjects(forClasses:[NSURL.self],options:[.urlReadingFileURLsOnly:true]) as? [URL],!urls.isEmpty { action("drop",["paths":urls.prefix(200).map(\.path)]);return true }
        if let receivers=board.readObjects(forClasses:[NSFilePromiseReceiver.self],options:nil) as? [NSFilePromiseReceiver],!receivers.isEmpty {
            guard receivers.count<=64 else{feedback("文件承诺来源超过64项，未接入。");return false}
            let directory=inputRoot.appendingPathComponent("incoming-"+UUID().uuidString,isDirectory:true)
            do{try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:false)}catch{feedback("无法建立接收暂存目录");return false}
            var outstanding=receivers.count,paths:[String]=[]
            pendingInput+=1;action("transient",["pending":true]);feedback("正在等待文件来源完成承诺…")
            for receiver in receivers {
                var expected=1
                receiver.receivePromisedFiles(atDestination:directory,options:[:],operationQueue:.main){[weak self] url,error in
                    guard let self,!self.retired else{return}
                    if error==nil,url.standardizedFileURL.path.hasPrefix(directory.path+"/"),paths.count<200{paths.append(url.path)}
                    expected-=1;outstanding-=1
                    if outstanding==0{self.pendingInput=max(0,self.pendingInput-1);self.action("transient",["pending":self.self.pendingInput>0]);if !paths.isEmpty{self.action("drop",["paths":paths])}else{self.feedback("文件来源未完成承诺，现有内容保留。")}}
                }
                let count=receiver.fileNames.count
                if count>0 && count<=200 {expected=count;outstanding+=count-1}
                else{feedback("文件来源未报告可核对的承诺数量；接收状态保留，尚未确认完成。");outstanding+=201}
            }
            return true
        }
        if let data=board.data(forType:.png) ?? board.data(forType:.tiff),data.count<=96*1024*1024,let bitmap=NSBitmapImageRep(data:data),bitmap.pixelsWide>0,bitmap.pixelsHigh>0,bitmap.pixelsWide*bitmap.pixelsHigh<=16_000_000,let png=bitmap.representation(using:.png,properties:[:]),png.count<=96*1024*1024 {
            let file=inputRoot.appendingPathComponent("Dragged-"+UUID().uuidString+".png")
            do{try png.write(to:file,options:.withoutOverwriting);action("drop",["paths":[file.path]]);return true}catch{feedback("拖入图片暂存失败，原内容保持。");return false}
        }
        return false
    }
    func drag(_ id:String,event:NSEvent,view:NSView) {
        let ids=selected.contains(id) ? items.filter{selected.contains($0.id)}.map(\.id) : [id]
        guard !ids.isEmpty else{return};if ids.count>64{feedback("单批拖出最多64份，请缩小选择范围。");return}
        if ids.contains(where:{id in !items.contains(where:{$0.id==id && $0.available})}){feedback("所选包含不可用素材，未开始拖出。");return}
        let p=view.convert(event.locationInWindow,from:nil)
        let drags=ids.compactMap { id -> NSDraggingItem? in
            guard let item=items.first(where:{$0.id==id && $0.available}) else{return nil}
            let provider=NSFilePromiseProvider(fileType:UTType(filenameExtension:item.type)?.identifier ?? UTType.data.identifier,delegate:self);provider.userInfo=["assetId":id]
            let drag=NSDraggingItem(pasteboardWriter:provider);drag.setDraggingFrame(NSRect(x:p.x-32,y:p.y-32,width:64,height:64),contents:item.image);return drag
        }
        if !drags.isEmpty { assetDragging=true;let session=view.beginDraggingSession(with:drags,event:event,source:self);if let data=try? JSONSerialization.data(withJSONObject:["libraryIdentity":libraryIdentity,"generation":generation,"assetIds":ids]){let type=NSPasteboard.PasteboardType("com.dam.work-members");session.draggingPasteboard.addTypes([type],owner:nil);session.draggingPasteboard.setData(data,forType:type)} }
    }
    func draggingSession(_ session:NSDraggingSession,willBeginAt screenPoint:NSPoint){assetDragging=true}
    func draggingSession(_ session:NSDraggingSession,endedAt screenPoint:NSPoint,operation:NSDragOperation){assetDragging=false}
    func draggingSession(_ session:NSDraggingSession,sourceOperationMaskFor context:NSDraggingContext)->NSDragOperation { .copy }
    func filePromiseProvider(_ provider:NSFilePromiseProvider,fileNameForType fileType:String)->String { let info=provider.userInfo as? [String:String];if let name=info?["fileName"] {return URL(fileURLWithPath:name).lastPathComponent};let id=info?["assetId"];return items.first(where:{$0.id==id})?.name ?? "Reference.png" }
    func filePromiseProvider(_ provider:NSFilePromiseProvider,writePromiseTo url:URL,completionHandler:@escaping (Error?)->Void) {
        guard let info=provider.userInfo as? [String:String],let id=info["assetId"] else { completionHandler(CocoaError(.fileWriteUnknown));return }
        var value:[String:Any]=["assetId":id,"destination":url.path];if let receipt=info["receiptId"]{value["receiptId"]=receipt}
        action("promise",value) { reply in completionHandler(reply["ok"] as? Bool == true ? nil : CocoaError(.fileWriteUnknown)) }
    }
    func operationQueue(for filePromiseProvider:NSFilePromiseProvider)->OperationQueue { .main }
    func command(_ command:[String:Any]) throws {
        guard let op=command["op"] as? String else {throw CocoaError(.coderInvalidValue)}
        switch op {
        case "publish":
            guard let newName=command["name"] as? String,newName.count<=80,let values=command["items"] as? [[String:Any]],values.count<=200 else{throw CocoaError(.coderInvalidValue)}
            revision=command["revision"] as? Int ?? revision
            let ack=command["ack"] as? Int ?? 0;acknowledged=max(acknowledged,ack);if acknowledged>=serial {serial=acknowledged;name=newName};window.title=name
            libraryIdentity=command["libraryIdentity"] as? String ?? libraryIdentity;generation=command["generation"] as? String ?? generation
            let previous=items
            items=values.compactMap { v in guard let id=v["id"] as? String,let title=v["fileName"] as? String else{return nil};let old=items.first{$0.id==id},key=v["imageKey"] as? String ?? "";let image=old?.imageKey==key && old?.image != nil ? old?.image : (v["preview"] as? String).flatMap{Data(base64Encoded:$0)}.flatMap{NSImage(data:$0)}
                let dimensions: String;if let w=v["width"] as? Int,let h=v["height"] as? Int,w>0,h>0{dimensions="\(w)×\(h)"}else{dimensions="尺寸未知"}
                return WorkShelfItem(id:id,name:URL(fileURLWithPath:title).lastPathComponent,type:v["fileType"] as? String ?? "png",dimensions:dimensions,available:v["available"] as? Bool ?? true,imageKey:key,image:image) }
            selected=selected.intersection(Set(items.map(\.id)));if let p=primary,!selected.contains(p){primary=selected.first}
            let changed=previous.count != items.count || zip(previous,items).contains{$0.id != $1.id || $0.name != $1.name || $0.dimensions != $1.dimensions || $0.available != $1.available || $0.imageKey != $1.imageKey || $0.image !== $1.image}
            if changed{collection.reloadData();stack.needsDisplay=true};root.needsDisplay=true;resizeExpandedIfNeeded();layout()
        case "show":presentationHidden=false;window.orderFrontRegardless();layout();window.makeFirstResponder(expanded ? collection : root);if command["focus"] as? Bool == true {window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)};visibility()
        case "freeze":
            guard let value=command["value"] as? Bool,let id=command["requestId"] as? String else{throw CocoaError(.coderInvalidValue)}
            if value && (pendingInput>0 || (window.firstResponder as? NSTextView)?.hasMarkedText()==true){emit(["event":"frozen","requestId":id,"ok":false]);return}
            if value{systemGeneration=UUID()};frozen=value;back.isEnabled = !value;dropdown.isEnabled = !value;capsule.isEnabled = !value
            if value{dismissColorPicker();tools?.close();suspendPresentation();moving=false;dragStartFrame=nil;window.makeFirstResponder(root)}
            if !value{resizeExpandedIfNeeded()};layout()
            emit(["event":"frozen","requestId":id,"ok":true])
        case "hide":presentationHidden=true;systemGeneration=UUID();capsule.configure(name:name,active:false);dismissColorPicker();tools?.close();suspendPresentation();window.orderOut(nil);visibility()
        case "metadata":applyMetadata(command)
        case "pin":window.level = command["pinned"] as? Bool == false ? .normal : .floating;layout()
        case "destroy":retire();NSApp.terminate(nil)
        case "bounds":
            applyMetadata(command)
            guard let version=command["motionId"] as? Int else{throw CocoaError(.coderInvalidValue)}
            if version<motionId{interaction.acknowledgement(version,"canceled","stale-command");return}
            if moving || (command["gestureId"] as? Int ?? interaction.gestureId)<interaction.gestureId{interaction.acknowledgement(version,"canceled","new-gesture");return}
            motionId=version
            configuringFrame=true;defer{configuringFrame=false}
            guard let mode=command["presentation"] as? String,["compact","expanded"].contains(mode),
                  let x=command["x"] as? Double,let y=command["y"] as? Double,let w=command["width"] as? Double,let h=command["height"] as? Double,[x,y,w,h].allSatisfy({$0.isFinite && abs($0)<=100000}),w>=(mode=="compact" ? 220:220),h>=(mode=="compact" ? 240:160),w<=5000,h<=5000 else{interaction.acknowledgement(version,"failed","invalid-frame");return}
            let top=NSScreen.screens.first?.frame.maxY ?? 0,target=NSRect(x:x,y:top-y-h,width:w,height:h)
            let nextDock=command["docked"] as? Bool ?? false,wasDocked=docked
            if nextDock && (expanded || command["presentation"] as? String=="expanded"){interaction.acknowledgement(version,"failed","expanded-not-dockable");return}
            if let mode=command["presentation"] as? String{expanded=mode=="expanded"}
            expansionAnchor=nil
            if expanded,let a=command["expansion"] as? [String:Any],let edge=a["edge"] as? String,let horizontal=WorkShelfExpansionAnchor.Horizontal(rawValue:edge),let c=a["compactBounds"] as? [String:Double],let cx=c["x"],let cy=c["y"],c["width"]==220,c["height"]==240,[cx,cy].allSatisfy({$0.isFinite && abs($0)<=100000}){
                expansionAnchor=WorkShelfExpansionAnchor(compact:NSRect(x:cx,y:top-cy-240,width:220,height:240),expanded:target,horizontal:horizontal)
            }
            if let n=command["normal"] as? [String:Double],let nx=n["x"],let ny=n["y"],let nw=n["width"],let nh=n["height"]{normal=NSRect(x:nx,y:top-ny-nh,width:nw,height:nh)}
            let duration=nextDock ? shelfDockDuration(command["deltaX"] as? Double ?? 0):wasDocked ? 0.2:0.2
            presentation.finishImmediately()
            interaction.animate(target,duration:duration,docking:nextDock,id:version)
        case "reply":
            guard let id=command["requestId"] as? String else{return}
            let locallyPresented=locallyPresentedReplies.remove(id) != nil;requests.removeValue(forKey:id)?(command)
            // Delivery popovers present their own result/errors. They must not
            // create or clear the shelf's independent autosave recovery notice.
            if locallyPresented{return}
            if command["ok"] as? Bool != true { feedback(command["message"] as? String ?? "操作未完成，内容保留。") } else if let ack=command["ack"] as? Int { acknowledged=max(acknowledged,ack);if acknowledged>=serial {feedback("")} }
        case "feedback":feedback(command["message"] as? String ?? "")
        default:throw CocoaError(.coderInvalidValue)
        }
    }
    func retire() {retired=true;systemGeneration=UUID();if let panel=QLPreviewPanel.shared(),panel.dataSource === self{panel.orderOut(nil);panel.dataSource=nil;panel.delegate=nil}; capsule.configure(name:name,active:false);dismissColorPicker();tools?.close();interaction.retire();retired=true;moving=false;for callback in requests.values { callback(["ok":false]) };requests.removeAll();locallyPresentedReplies.removeAll();window.delegate=nil;window.close() }
}

final class WorkShelfTools:NSViewController {
    weak var shelf:NativeWorkShelf?
    let kind:String
    let ids:[String]
    let summary:String
    let status=NSTextField(labelWithString:"")
    let width=NSTextField(string:"1024"),height=NSTextField(string:"1024")
    let format=NSPopUpButton()
    let resizeEnabled=NSButton(checkboxWithTitle:"等比缩小至边界（不放大）",target:nil,action:nil)
    let direction=NSPopUpButton(),scale=NSPopUpButton(),gap=NSTextField(string:"0")
    let quality=NSTextField(string:"90"),strip=NSButton(checkboxWithTitle:"移除元数据",target:nil,action:nil)
    let export=NSButton(title:"生成副本",target:nil,action:nil)
    let destination=NSButton(title:"目的：保留交付副本…",target:nil,action:nil),reveal=NSPopUpButton()
    var outputDirectory:URL?
    let result=WorkShelfReceiptDrag()
    let cancel=NSButton(title:"取消",target:nil,action:nil)
    var operation=UUID()
    init(shelf:NativeWorkShelf,kind:String,ids:[String],summary:String?=nil) { self.shelf=shelf;self.kind=kind;self.ids=ids;self.summary=summary ?? "\(ids.count) 项参考";super.init(nibName:nil,bundle:nil) }
    required init?(coder:NSCoder) { fatalError("programmatic") }
    override func loadView() {
        view=NSView(frame:NSRect(x:0,y:0,width:300,height:["processed-image","convert","compress","metadata","stitch"].contains(kind) ? 400 : 220))
        status.frame=NSRect(x:18,y:view.bounds.height-60,width:264,height:44);status.maximumNumberOfLines=3;status.stringValue=summary;view.addSubview(status)
        export.frame=NSRect(x:18,y:16,width:130,height:30);export.target=self;export.action=#selector(run);view.addSubview(export)
        cancel.frame=NSRect(x:165,y:16,width:115,height:30);cancel.target=self;cancel.action=#selector(stop);view.addSubview(cancel)
        destination.frame=NSRect(x:18,y:80,width:264,height:26);destination.target=self;destination.action=#selector(chooseDestination);view.addSubview(destination)
        reveal.frame=NSRect(x:18,y:110,width:264,height:26);reveal.addItems(withTitles:["完成后：只保留副本","完成后：在 Finder 中显示","完成后：默认应用打开"]);view.addSubview(reveal)
        result.frame=NSRect(x:18,y:52,width:264,height:26);result.shelf=shelf;result.isHidden=true;view.addSubview(result)
        if ["processed-image","convert","compress","metadata"].contains(kind) { resizeEnabled.frame=NSRect(x:18,y:282,width:264,height:26);resizeEnabled.state=kind=="processed-image" ? .on:.off;view.addSubview(resizeEnabled);width.frame=NSRect(x:18,y:248,width:110,height:26);height.frame=NSRect(x:152,y:248,width:110,height:26);width.setAccessibilityLabel("输出最大宽度");height.setAccessibilityLabel("输出最大高度");format.frame=NSRect(x:18,y:204,width:244,height:28);format.addItems(withTitles:["png","jpeg","webp"]);quality.frame=NSRect(x:18,y:164,width:110,height:26);quality.setAccessibilityLabel("JPEG或WebP质量，1到100，PNG不应用质量");strip.frame=NSRect(x:150,y:164,width:132,height:26);strip.state = .on;for v in [width,height,format,quality,strip]{view.addSubview(v)}
            if let defaults=UserDefaults.standard.dictionary(forKey:"dam-work-image-"+kind){width.integerValue=defaults["width"] as? Int ?? 1024;height.integerValue=defaults["height"] as? Int ?? 1024;quality.integerValue=defaults["quality"] as? Int ?? 90;format.selectItem(withTitle:defaults["format"] as? String ?? "png");strip.state=(defaults["strip"] as? Bool ?? true) ? .on:.off}
            if kind=="compress" || kind=="metadata"{resizeEnabled.state = .off;resizeEnabled.isEnabled=false;if let type=shelf?.items.first(where:{$0.id==ids.first})?.type{format.selectItem(withTitle:type=="jpg" ? "jpeg":type)};format.isEnabled=false;strip.state=kind=="metadata" ? .on:.off;strip.isEnabled=false;quality.integerValue=kind=="metadata" ? 100:80}
        }
        if kind=="stitch" {direction.frame=NSRect(x:18,y:265,width:264,height:28);direction.addItems(withTitles:["垂直拼接","水平拼接"]);gap.frame=NSRect(x:18,y:220,width:264,height:26);gap.setAccessibilityLabel("图片间距，0到256像素");scale.frame=NSRect(x:18,y:176,width:264,height:28);scale.addItems(withTitles:["保留原尺寸 · 居中","等比等宽/等高"]);view.addSubview(direction);view.addSubview(gap);view.addSubview(scale);status.stringValue=summary+"；默认原尺寸纵向居中拼接"}
        if kind=="pdf"{status.stringValue=summary+"；按工作集顺序逐图一页，白底，图像像素对应页面点数"}
        if kind=="metadata"{status.stringValue=summary+"；移除 EXIF/IPTC/XMP/ICC，自动转正，输出 sRGB；JPEG 将重新编码"}
        if kind=="compress"{status.stringValue=summary+"；PNG 无损；JPEG/WebP 按质量重新编码，可能没有大小收益"}
    }
    override func viewDidDisappear(){super.viewDidDisappear();operation=UUID();if !export.isEnabled{shelf?.action("cancel",presentsReply:true,completion:{_ in})}}
    @objc func chooseDestination(){let panel=NSOpenPanel();panel.canChooseDirectories=true;panel.canChooseFiles=false;panel.canCreateDirectories=true;guard panel.runModal() == .OK,let url=panel.url else{return};outputDirectory=url;destination.title="目的："+url.lastPathComponent}
    func finishOutput(_ receipts:[[String:String]],token:UUID){
        guard let shelf else{return}
        let directory=outputDirectory,revealChoice=reveal.indexOfSelectedItem
        if directory==nil && revealChoice==0{export.isEnabled=true;return}
        var paths:[URL]=[]
        func next(_ index:Int){
            guard self.operation==token,!shelf.retired,!shelf.frozen,self.view.window != nil else{return}
            if index==receipts.count {
                if revealChoice==1{NSWorkspace.shared.activateFileViewerSelecting(paths)}
                if revealChoice==2{for url in paths{if !NSWorkspace.shared.open(url){self.status.stringValue="系统未能打开副本，已保留。"}}}
                self.export.isEnabled=true;return
            }
            guard let id=receipts[index]["id"],let name=receipts[index]["fileName"] else{return}
            if let directory {
                let target=directory.appendingPathComponent(name)
                shelf.action("file-action",["id":id,"operation":"copy","destination":target.path],presentsReply:true){[weak self] reply in guard let self,self.operation==token else{return};guard reply["ok"] as? Bool==true else{self.export.isEnabled=true;self.status.stringValue="副本已生成，目的导出未完成：\(reply["message"] as? String ?? "结果未确认")";return};paths.append(target);next(index+1)}
            }else{
                shelf.action("receipt-files",["ids":[id]],presentsReply:true){[weak self] reply in guard let self,self.operation==token else{return};guard reply["ok"] as? Bool==true,let files=reply["files"] as? [[String:Any]],let file=files.first?["file"] as? String else{self.export.isEnabled=true;self.status.stringValue="副本位置未确认，请核对保留记录。";return};paths.append(URL(fileURLWithPath:file));next(index+1)}
            }
        }
        export.isEnabled=false;next(0)
    }
    @objc func run() {
        guard export.isEnabled,cancel.isEnabled,view.window != nil,shelf?.retired==false,shelf?.frozen==false else{return}
        operation=UUID();let token=operation
        var input:[String:Any]=["assetIds":ids,"handoffKind":["convert","compress","metadata"].contains(kind) ? "processed-image":kind]
        if kind=="stitch"{input["composition"]=["direction":direction.indexOfSelectedItem==0 ? "vertical":"horizontal","gap":gap.integerValue,"scale":scale.indexOfSelectedItem==0 ? "original":"uniform"]}
        if ["processed-image","convert","compress","metadata"].contains(kind) {
            var transform:[String:Any]=["format":format.titleOfSelectedItem ?? "png","quality":quality.integerValue,"stripMetadata":strip.state == .on]
            if resizeEnabled.state == .on{transform["resize"]=["fit":"inside","width":width.integerValue,"height":height.integerValue]}
            input["imageTransform"]=transform
        }
        export.isEnabled=false;result.receipts=[];result.isHidden=true;status.stringValue="正在生成 · \(summary)…"
        shelf?.action("handoff",input,presentsReply:true) { [weak self] reply in guard let self,self.operation==token else{return};self.export.isEnabled=true;if reply["ok"] as? Bool == true,["processed-image","convert","compress","metadata"].contains(self.kind){UserDefaults.standard.set(["width":self.width.integerValue,"height":self.height.integerValue,"quality":self.quality.integerValue,"format":self.format.titleOfSelectedItem ?? "png","strip":self.strip.state == .on],forKey:"dam-work-image-"+self.kind)};self.status.stringValue=reply["message"] as? String ?? (reply["ok"] as? Bool == true ? "副本已完成" : "未完成");if let receipts=reply["receipts"] as? [[String:String]],!receipts.isEmpty {self.result.receipts=receipts;self.result.isHidden=false;if reply["ok"] as? Bool==true{self.finishOutput(receipts,token:token)}} }
    }
    @objc func stop() {
        guard cancel.isEnabled,view.window != nil else{return}
        if let shelf,shelf.pendingInput>0 {status.stringValue="文件来源尚未返回，不能冒称已取消；请等待来源完成。";return}
        operation=UUID();let token=operation
        export.isEnabled=false;cancel.isEnabled=false;result.receipts=[];result.isHidden=true;status.stringValue="正在取消，请等待执行结果。"
        shelf?.action("cancel",presentsReply:true) {[weak self] reply in
            guard let self,self.operation==token else{return}
            self.export.isEnabled=true;self.cancel.isEnabled=true
            self.status.stringValue=reply["message"] as? String ?? (reply["ok"] as? Bool == true ? "已取消，现有素材保留。" : "取消未确认，请核对执行状态。")
        }
    }
}

final class WorkShelfReceiptDrag:NSView {
    weak var shelf:NativeWorkShelf?
    var receipts:[[String:String]]=[]
    override init(frame:NSRect) {super.init(frame:frame);setAccessibilityElement(true);setAccessibilityRole(.button);setAccessibilityLabel("拖出已生成副本")}
    required init?(coder:NSCoder){fatalError("programmatic")}
    override func draw(_ rect:NSRect){("拖出已生成副本 ↗" as NSString).draw(in:bounds,withAttributes:[.font:NSFont.systemFont(ofSize:13),.foregroundColor:NSColor.controlAccentColor])}
    override func mouseDown(with event:NSEvent){}
    override func mouseDragged(with event:NSEvent){
        guard let shelf else{return};let p=convert(event.locationInWindow,from:nil)
        let items=receipts.compactMap{receipt->NSDraggingItem? in guard let id=receipt["id"],let assetId=receipt["assetId"],let name=receipt["fileName"] else{return nil}
            let provider=NSFilePromiseProvider(fileType:UTType(filenameExtension:URL(fileURLWithPath:name).pathExtension)?.identifier ?? UTType.data.identifier,delegate:shelf);provider.userInfo=["receiptId":id,"assetId":assetId,"fileName":name]
            let item=NSDraggingItem(pasteboardWriter:provider);item.setDraggingFrame(NSRect(x:p.x-32,y:p.y-32,width:64,height:64),contents:NSImage(systemSymbolName:"doc",accessibilityDescription:nil));return item}
        if !items.isEmpty{beginDraggingSession(with:items,event:event,source:shelf)}
    }
}
