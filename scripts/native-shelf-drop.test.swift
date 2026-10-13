import AppKit

// Production AppKit destination callbacks with an isolated pasteboard and a
// controlled drag sender. This does not replace a Finder-to-shelf UI test.
var dropTestEvents:[[String:Any]]=[]
func emit(_ value:[String:Any]) { dropTestEvents.append(value) }

final class DropTestInfo:NSObject,NSDraggingInfo {
    let draggingPasteboard=NSPasteboard.withUniqueName()
    var draggingDestinationWindow:NSWindow?
    var draggingSourceOperationMask:NSDragOperation = .copy
    var draggingLocation=NSPoint.zero
    var draggedImageLocation=NSPoint.zero
    var draggedImage:NSImage? {nil}
    var draggingSource:Any? {nil}
    var draggingSequenceNumber:Int {1}
    var draggingFormation:NSDraggingFormation = .none
    var animatesToDestination=false
    var numberOfValidItemsForDrop=1
    var springLoadingHighlight:NSSpringLoadingHighlight { .none }
    func slideDraggedImage(to screenPoint:NSPoint) {}
    override func namesOfPromisedFilesDropped(atDestination dropDestination:URL)->[String]? {nil}
    func resetSpringLoading() {}
    func enumerateDraggingItems(options:NSDraggingItemEnumerationOptions,for view:NSView?,classes:[AnyClass],searchOptions:[NSPasteboard.ReadingOptionKey:Any],using block:(NSDraggingItem,Int,UnsafeMutablePointer<ObjCBool>)->Void) {}
}

@main struct NativeShelfDropTest {
    static func main() {
        do {try run()} catch {print("FAIL: \(error.localizedDescription)");exit(1)}
    }
    static func run() throws {
        let app=NSApplication.shared;app.setActivationPolicy(.prohibited)
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent("dam-drop-test-"+UUID().uuidString)
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:false)
        defer {try? FileManager.default.removeItem(at:directory)}
        let shelf=NativeWorkShelf(root:directory),info=DropTestInfo()
        info.draggingDestinationWindow=shelf.window
        let file=directory.appendingPathComponent("generated.png")
        // Only URL negotiation is exercised; Host owns the actual file intake.
        info.draggingPasteboard.writeObjects([file as NSURL])
        try shelf.command(["op":"bounds","motionId":1,"presentation":"expanded","x":100.0,"y":100.0,"width":640.0,"height":520.0])
        try shelf.command(["op":"publish","name":"Generated drop test","note":"unchanged","colors":[],"items":[]])
        shelf.layout();shelf.collection.layoutSubtreeIfNeeded()
        info.draggingLocation=shelf.collection.convert(NSPoint(x:40,y:40),to:nil)
        let entered=shelf.collection.draggingEntered(info),updated=shelf.collection.draggingUpdated(info)
        print("Empty grid destination: entered=\(entered.rawValue), updated=\(updated.rawValue)")
        guard entered == .copy,updated == .copy else {throw NSError(domain:"DropRegression",code:1,userInfo:[NSLocalizedDescriptionKey:"Collection update rejected file drop after entry"])}
        guard shelf.collection.prepareForDragOperation(info),shelf.collection.performDragOperation(info),dropTestEvents.contains(where:{$0["kind"] as? String == "drop"}),shelf.note.string=="unchanged" else {throw NSError(domain:"DropRegression",code:2)}
        try shelf.command(["op":"publish","name":"Generated drop test","note":"unchanged","colors":[],"items":[["id":"first","fileName":"first.png"],["id":"second","fileName":"second.png"]]])
        shelf.collection.layoutSubtreeIfNeeded()
        let card=WorkShelfCard(frame:NSRect(x:20,y:20,width:180,height:190));card.shelf=shelf
        card.picture.image=NSImage(size:NSSize(width:320,height:240))
        shelf.root.addSubview(card);card.layoutSubtreeIfNeeded()
        guard card.hitTest(NSPoint(x:card.frame.midX,y:card.frame.midY)) === card else {throw NSError(domain:"CardMouseTarget",code:1)}
        for view in [card,card.picture,card.caption,card.dimensions] {
            print("Card target \(type(of:view)): \(view.registeredDraggedTypes.map(\.rawValue))")
        }
        let childAssetTargets=[card,card.picture,card.caption,card.dimensions].filter{!$0.registeredDraggedTypes.isEmpty}
        guard childAssetTargets.isEmpty else {throw NSError(domain:"DropRegression",code:8,userInfo:[NSLocalizedDescriptionKey:"Card descendants intercept the window-wide asset destination"])}
        func checkDescendants(_ view:NSView) throws {
            for child in view.subviews {
                let expected:[NSPasteboard.PasteboardType] = child is NSTextView ? [.string] : []
                guard Set(child.registeredDraggedTypes)==Set(expected) else {throw NSError(domain:"DropRegression",code:9,userInfo:[NSLocalizedDescriptionKey:"Unexpected child destination: \(type(of:child))"])}
                try checkDescendants(child)
            }
        }
        shelf.layout();try checkDescendants(shelf.root)
        guard Set(shelf.root.registeredDraggedTypes)==Set(workShelfDropTypes) else {throw NSError(domain:"DropRegression",code:10)}
        dropTestEvents=[]
        info.draggingPasteboard.setString(file.path,forType:.string)
        guard shelf.note.draggingEntered(info) == .copy,shelf.note.draggingUpdated(info) == .copy,shelf.note.performDragOperation(info) else {throw NSError(domain:"DropRegression",code:12)}
        guard shelf.note.string=="unchanged",dropTestEvents.filter({$0["kind"] as? String == "drop"}).count==1 else {throw NSError(domain:"DropRegression",code:13)}
        guard shelf.window.draggingEntered(info) == .copy,shelf.window.draggingUpdated(info) == .copy,shelf.window.performDragOperation(info) else {throw NSError(domain:"DropRegression",code:14)}
        // Below the first row and between cards, acceptance must remain stable
        // through repeated AppKit updates, without treating the drop as reorder.
        for point in [NSPoint(x:5,y:5),NSPoint(x:300,y:80),NSPoint(x:60,y:300)] {
            info.draggingLocation=shelf.collection.convert(point,to:nil)
            guard shelf.collection.draggingEntered(info) == .copy else {throw NSError(domain:"DropRegression",code:3)}
            for _ in 0..<4 {guard shelf.collection.draggingUpdated(info) == .copy else {throw NSError(domain:"DropRegression",code:4)}}
            guard shelf.collection.prepareForDragOperation(info),shelf.collection.performDragOperation(info) else {throw NSError(domain:"DropRegression",code:5)}
        }
        guard shelf.root.draggingEntered(info) == .copy,shelf.root.draggingUpdated(info) == .copy,shelf.root.performDragOperation(info) else {throw NSError(domain:"DropRegression",code:6)}
        dropTestEvents=[];shelf.frozen=true
        guard !shelf.collection.performDragOperation(info),!shelf.root.performDragOperation(info),!shelf.window.performDragOperation(info),dropTestEvents.isEmpty else {throw NSError(domain:"DropRegression",code:7)}
        shelf.frozen=false
        let tools=WorkShelfTools(shelf:shelf,kind:"original",ids:["first"]);tools.loadView()
        tools.run();let handoff=dropTestEvents.last!["requestId"] as! String
        tools.stop();let cancel=dropTestEvents.last!["requestId"] as! String
        guard !tools.export.isEnabled,!tools.cancel.isEnabled,tools.result.isHidden else {throw NSError(domain:"CancelRegression",code:1)}
        try shelf.command(["op":"reply","requestId":handoff,"ok":true,"receipts":[["id":"old","assetId":"first","fileName":"first.png"]]])
        guard tools.result.isHidden,!tools.export.isEnabled else {throw NSError(domain:"CancelRegression",code:2)}
        try shelf.command(["op":"reply","requestId":cancel,"ok":true,"message":"取消已确认"])
        guard tools.export.isEnabled,tools.cancel.isEnabled,tools.result.isHidden,tools.result.receipts.isEmpty,tools.status.stringValue=="取消已确认" else {throw NSError(domain:"CancelRegression",code:3)}
        print("PASS cancellation waits for Host confirmation; late handoff completion cannot restore revoked result or enable generation prematurely.")
        let processing=WorkShelfTools(shelf:shelf,kind:"processed-image",ids:["first"]);processing.loadView();processing.width.stringValue="0";processing.run()
        let failed=dropTestEvents.last!["requestId"] as! String
        try shelf.command(["op":"reply","requestId":failed,"ok":false,"message":"尺寸无效"])
        guard processing.status.stringValue=="尺寸无效",processing.width.stringValue=="0",shelf.errorField.stringValue.isEmpty else {throw NSError(domain:"ReplyPresentation",code:1)}
        try shelf.command(["op":"feedback","message":"保存冲突，草稿保留"])
        processing.width.stringValue="160";processing.run();let succeeded=dropTestEvents.last!["requestId"] as! String
        try shelf.command(["op":"reply","requestId":succeeded,"ok":true,"message":"副本完成","receipts":[["id":"new","assetId":"first","fileName":"first.png"]]])
        guard processing.status.stringValue=="副本完成",!processing.result.isHidden,shelf.errorField.stringValue=="保存冲突，草稿保留" else {throw NSError(domain:"ReplyPresentation",code:2)}
        print("PASS delivery error remains local, input retained, successful correction updates status without clearing an independent autosave conflict.")
        // Motion is verified by work-shelf-interaction.test.swift against the
        // new proportional state machine. These legacy capsule assertions no
        // longer describe the requested product behavior.
        shelf.retire();info.draggingPasteboard.releaseGlobally()
        print("PASS window-wide destination: native thumbnail legacy/promise registrations removed, all display descendants transparent to asset drops, plain-text editor registration retained, file-as-text routed to Host without editing; update, completion and freeze protections. Controlled sender, not UI acceptance.")
    }
}
