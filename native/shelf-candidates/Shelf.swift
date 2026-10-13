import AppKit
import QuartzCore
import QuickLookUI
import QuickLookThumbnailing

// A is a standalone native transfer shelf. B is an owned UI process: its
// stdin/stdout are private parent pipes, and it has no library/database authority.
struct Item: Codable {
    var id: String
    var title: String
    var path: String?
    var text: String?
    var bookmark: Data?
}

struct ShelfRecord: Codable {
    var id = UUID().uuidString
    var name = "悬浮架子"
    var items: [Item] = []
    var pinned = false
    var x: Double = 0
    var y: Double = 0
    var width: Double = 198
    var height: Double = 207
    var open = true
    var expanded: Bool?
    var docked: Bool?
    var normal: StoredFrame?
}

struct StoredFrame: Codable {
    var x: Double
    var y: Double
    var width: Double
    var height: Double
    var rect: NSRect { NSRect(x: x, y: y, width: width, height: height) }
    init(_ rect: NSRect) { x = rect.minX; y = rect.minY; width = rect.width; height = rect.height }
}

func emit(_ value: [String: Any]) {
    guard let bytes = try? JSONSerialization.data(withJSONObject: value),
          let line = String(data: bytes, encoding: .utf8) else { return }
    print(line)
    fflush(stdout)
}

final class ShelfWindow: NSWindow {
    weak var shelf: ShelfController?
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
    override func animationResizeTime(_ newFrame: NSRect) -> TimeInterval { 0.22 }
    override func acceptsPreviewPanelControl(_ panel: QLPreviewPanel!) -> Bool { shelf?.mode == "a" }
    override func beginPreviewPanelControl(_ panel: QLPreviewPanel!) { panel.dataSource = shelf; panel.delegate = shelf }
    override func endPreviewPanelControl(_ panel: QLPreviewPanel!) { panel.dataSource = nil; panel.delegate = nil }
}

final class ShelfView: NSView, NSDraggingSource {
    weak var owner: ShelfController?
    var highlighted = false { didSet { needsDisplay = true } }
    var downPoint = NSPoint.zero
    var dragIndex: Int?
    var tracking: NSTrackingArea?
    let closeButton = NSButton(title: "×", target: nil, action: nil)
    let pinButton = NSButton(title: "○", target: nil, action: nil)
    let expandButton = NSButton(title: "展开", target: nil, action: nil)
    let dockButton = NSButton(title: "停靠", target: nil, action: nil)
    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.cornerRadius = 24
        layer?.masksToBounds = true
        registerForDraggedTypes([.fileURL, .string, .URL, .tiff, .png,
                                 NSPasteboard.PasteboardType("com.apple.NSFilePromiseItemMetaData")])
        setAccessibilityElement(true)
        setAccessibilityRole(.group)
        setAccessibilityLabel("原生悬浮架子")
        for (button, selector, name) in [(closeButton, #selector(closeShelf), "关闭架子"),
                                         (pinButton, #selector(pinShelf), "固定架子"),
                                         (expandButton, #selector(expandShelf), "展开架子"),
                                         (dockButton, #selector(dockShelf), "停靠架子")] {
            button.isBordered = false; button.target = self; button.action = selector
            button.setAccessibilityLabel(name); addSubview(button)
        }
    }
    required init?(coder: NSCoder) { fatalError("programmatic view") }
    @objc func closeShelf() { owner?.close() }
    @objc func pinShelf() { owner?.togglePin() }
    @objc func expandShelf() { if owner?.docked == true { owner?.undock() } else { owner?.toggleExpanded() } }
    @objc func dockShelf() { owner?.toggleDock() }
    override func layout() {
        super.layout()
        let small = bounds.width < 100
        let edgeStrip = owner?.docked == true && owner?.mode == "a"
        closeButton.isHidden = small || edgeStrip; pinButton.isHidden = small || edgeStrip; dockButton.isHidden = small || edgeStrip
        expandButton.isHidden = edgeStrip
        closeButton.frame = NSRect(x: 7, y: bounds.height - 31, width: 23, height: 23)
        pinButton.frame = NSRect(x: bounds.width - 30, y: bounds.height - 30, width: 23, height: 23)
        pinButton.title = owner?.record.pinned == true ? "●" : "○"
        expandButton.title = owner?.mode == "b" && !small ? "工作面板" : small ? "展开" : owner?.expanded == true ? "收起" : "展开"
        expandButton.frame = NSRect(x: 12, y: 5, width: small ? bounds.width - 24 : bounds.width * 0.54 - 12, height: 23)
        dockButton.frame = NSRect(x: bounds.width * 0.55, y: 5, width: bounds.width * 0.45 - 12, height: 23)
    }
    override func updateTrackingAreas() {
        if let tracking { removeTrackingArea(tracking) }
        tracking = NSTrackingArea(rect: .zero, options: [.inVisibleRect, .activeAlways, .mouseEnteredAndExited], owner: self)
        addTrackingArea(tracking!)
        super.updateTrackingAreas()
    }
    override func mouseEntered(with event: NSEvent) { owner?.cancelRetraction() }
    override func mouseExited(with event: NSEvent) { owner?.scheduleRetraction() }

    func label(_ text: String, _ rect: NSRect, size: CGFloat = 12, color: NSColor = .labelColor) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineBreakMode = .byTruncatingMiddle
        (text as NSString).draw(in: rect, withAttributes: [.font: NSFont.systemFont(ofSize: size),
                                                         .foregroundColor: color, .paragraphStyle: paragraph])
    }
    func itemRect(_ index: Int) -> NSRect {
        guard let owner else { return .zero }
        if owner.expanded {
            return NSRect(x: 14, y: bounds.height - 84 - CGFloat(index) * 48, width: bounds.width - 28, height: 44)
        }
        return NSRect(x: (bounds.width - 90) / 2, y: bounds.height / 2 - 40 + CGFloat(min(index, 2)) * 5,
                      width: 90, height: 90)
    }
    override func draw(_ dirtyRect: NSRect) {
        guard let owner else { return }
        if highlighted {
            NSColor.controlAccentColor.withAlphaComponent(0.16).setFill()
            NSBezierPath(roundedRect: bounds.insetBy(dx: 3, dy: 3), xRadius: 22, yRadius: 22).fill()
            NSColor.controlAccentColor.setStroke()
            let ring = NSBezierPath(roundedRect: bounds.insetBy(dx: 3, dy: 3), xRadius: 22, yRadius: 22)
            ring.lineWidth = 3
            ring.stroke()
        }
        if bounds.width < 100 {
            label("•••", NSRect(x: 4, y: bounds.height - 20, width: bounds.width - 8, height: 16))
            label(String(owner.record.items.count), NSRect(x: 4, y: bounds.height / 2, width: bounds.width - 8, height: 22), size: 18)
            return
        }
        label(owner.record.name, NSRect(x: 30, y: bounds.height - 30, width: bounds.width - 60, height: 18), size: 12)
        if owner.record.items.isEmpty {
            label(highlighted ? "松开以收录" : "拖放到这里", NSRect(x: 12, y: bounds.height / 2 - 10, width: bounds.width - 24, height: 22), size: 14, color: .secondaryLabelColor)
        } else if owner.expanded {
            for (index, item) in owner.record.items.prefix(10).enumerated() {
                let rect = itemRect(index)
                owner.image(item).draw(in: NSRect(x: rect.minX, y: rect.minY + 4, width: 36, height: 36))
                label(item.title, NSRect(x: rect.minX + 42, y: rect.minY + 12, width: rect.width - 50, height: 20))
            }
        } else {
            for index in stride(from: min(owner.record.items.count, 3) - 1, through: 0, by: -1) {
                let rect = itemRect(index)
                NSColor.windowBackgroundColor.setFill()
                NSBezierPath(roundedRect: rect, xRadius: 12, yRadius: 12).fill()
                owner.image(owner.record.items[index]).draw(in: rect.insetBy(dx: 7, dy: 7))
            }
        }
        if owner.mode == "b", !owner.colors.isEmpty {
            for (i, hex) in owner.colors.prefix(8).enumerated() {
                let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
                NSColor(srgbRed: CGFloat((value >> 16) & 255) / 255,
                        green: CGFloat((value >> 8) & 255) / 255,
                        blue: CGFloat(value & 255) / 255, alpha: 1).setFill()
                NSBezierPath(roundedRect: NSRect(x: 16 + CGFloat(i) * 26, y: 47, width: 22, height: 18), xRadius: 5, yRadius: 5).fill()
            }
        }
        label(owner.message ?? "\(owner.record.items.count) 项", NSRect(x: 12, y: 25, width: bounds.width - 24, height: 18), color: .secondaryLabelColor)
    }

    override func mouseDown(with event: NSEvent) {
        guard let owner else { return }
        owner.cancelRetraction()
        downPoint = convert(event.locationInWindow, from: nil)
        dragIndex = nil
        if owner.docked { owner.undock(); return }
        if bounds.width < 100 { owner.undock(); return }
        if downPoint.y > bounds.height - 36 {
            if downPoint.x < 32 { owner.close(); return }
            if downPoint.x > bounds.width - 32 { owner.pin(!owner.record.pinned); return }
            owner.beginWindowMove()
            window?.performDrag(with: event)
            owner.endWindowMove()
            return
        }
        if downPoint.y < 27 {
            if downPoint.x > bounds.width * 0.65 { owner.dock() }
            else if owner.mode == "b" { emit(["event": "detail"]) }
            else { owner.toggleExpanded() }
            return
        }
        if owner.mode == "b", downPoint.y >= 47 && downPoint.y <= 65 {
            let index = Int((downPoint.x - 16) / 26)
            if index >= 0 && index < owner.colors.count {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(owner.colors[index], forType: .string)
                owner.feedback("已复制 \(owner.colors[index])")
                return
            }
        }
        if owner.expanded {
            dragIndex = owner.record.items.indices.first { itemRect($0).contains(downPoint) }
        } else if !owner.record.items.isEmpty && itemRect(0).contains(downPoint) { dragIndex = 0 }
        if event.clickCount == 2 { owner.preview(index: dragIndex ?? 0) }
    }
    override func mouseDragged(with event: NSEvent) {
        guard let owner, let index = dragIndex, index < owner.record.items.count else { return }
        let p = convert(event.locationInWindow, from: nil)
        guard hypot(p.x - downPoint.x, p.y - downPoint.y) >= 3 else { return }
        if owner.mode == "b" { emit(["event": "handoff", "assetId": owner.record.items[index].id]); dragIndex = nil; return }
        do {
            let url = try owner.materialize(owner.record.items[index])
            let item = NSDraggingItem(pasteboardWriter: url as NSURL)
            item.setDraggingFrame(NSRect(x: p.x - 36, y: p.y - 36, width: 72, height: 72), contents: owner.image(owner.record.items[index]))
            beginDraggingSession(with: [item], event: event, source: self)
        } catch { owner.feedback("无法准备拖出：\(error.localizedDescription)") }
        dragIndex = nil
    }
    func draggingSession(_ session: NSDraggingSession, sourceOperationMaskFor context: NSDraggingContext) -> NSDragOperation { .copy }
    func draggingSession(_ session: NSDraggingSession, endedAt screenPoint: NSPoint, operation: NSDragOperation) {
        owner?.feedback(operation.isEmpty ? "已取消拖出" : "拖出已结束，请核对接收应用")
    }
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { owner?.expanded == true ? owner?.toggleExpanded() : owner?.hide() }
        else if event.keyCode == 49 { owner?.preview(index: 0) }
        else { super.keyDown(with: event) }
    }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        guard owner?.mode == "a" else { return [] }
        highlighted = true
        owner?.cancelRetraction()
        return .copy
    }
    override func draggingExited(_ sender: NSDraggingInfo?) { highlighted = false }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool { owner?.mode == "a" }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        defer { highlighted = false }
        return owner?.receive(sender.draggingPasteboard) ?? false
    }
    override func rightMouseDown(with event: NSEvent) {
        guard let owner else { return }
        let menu = NSMenu()
        for (title, selector) in [("展开 / 收起", #selector(ShelfController.toggleExpanded)),
                                  ("快速预览", #selector(ShelfController.quickPreview)),
                                  ("重命名…", #selector(ShelfController.rename)),
                                  ("复制到新架子", #selector(ShelfController.copyItems)),
                                  ("停靠 / 恢复", #selector(ShelfController.toggleDock)),
                                  ("固定 / 取消固定", #selector(ShelfController.togglePin)),
                                  ("隐藏", #selector(ShelfController.hide)),
                                  ("关闭", #selector(ShelfController.close))] {
            let item = NSMenuItem(title: title, action: selector, keyEquivalent: "")
            item.target = owner
            menu.addItem(item)
        }
        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }
}

final class ShelfController: NSObject, NSWindowDelegate, QLPreviewPanelDataSource, QLPreviewPanelDelegate {
    let mode: String
    let stateRoot: URL
    var record: ShelfRecord
    let window: ShelfWindow
    let surface: ShelfView
    var expanded = false
    var docked = false
    var normalFrame: NSRect?
    var colors: [String] = []
    var message: String?
    var images: [String: NSImage] = [:]
    var retraction: UUID?
    var transition = UUID()
    var closing = false
    var animating = false
    var moving = false
    var previewURL: URL?
    var changed: (() -> Void)?
    var removed: (() -> Void)?
    var copyToNew: (([Item]) -> Bool)?

    init(mode: String, record: ShelfRecord, root: URL) {
        self.mode = mode
        self.record = record
        self.stateRoot = root
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        var frame = NSRect(x: record.x, y: record.y, width: record.width, height: record.height)
        if frame.origin == .zero { frame.origin = NSPoint(x: screen.maxX - frame.width - 24, y: screen.maxY - frame.height - 24) }
        if record.docked != true {
            frame.origin.x = max(screen.minX, min(frame.minX, screen.maxX - frame.width))
            frame.origin.y = max(screen.minY, min(frame.minY, screen.maxY - frame.height))
        }
        window = ShelfWindow(contentRect: frame, styleMask: .borderless, backing: .buffered, defer: false)
        surface = ShelfView(frame: NSRect(origin: .zero, size: frame.size))
        super.init()
        expanded = record.expanded ?? (mode == "a" && record.width > 250)
        docked = record.docked ?? false
        normalFrame = record.normal?.rect
        surface.owner = self
        window.shelf = self
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = true
        window.isReleasedWhenClosed = false
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .managed, .participatesInCycle]
        window.animationBehavior = .alertPanel
        window.delegate = self
        surface.autoresizingMask = [.width, .height]
        if #available(macOS 26.0, *) {
            let glass = NSGlassEffectView(frame: surface.bounds)
            glass.cornerRadius = 24
            glass.contentView = surface
            window.contentView = glass
        } else {
            let background = NSVisualEffectView(frame: surface.bounds)
            background.material = .popover
            background.state = .active
            background.blendingMode = .behindWindow
            background.wantsLayer = true
            background.layer?.cornerRadius = 24
            background.layer?.masksToBounds = true
            background.autoresizingMask = [.width, .height]
            background.addSubview(surface)
            window.contentView = background
        }
        window.title = record.name
        pin(record.pinned, notify: false)
        requestThumbnails()
    }
    func reportVisibility() { if mode == "b" { emit(["event": "visibility", "visible": window.isVisible]) } }
    func show() { window.orderFrontRegardless(); window.makeFirstResponder(surface); reportVisibility() }
    func image(_ item: Item) -> NSImage {
        if let cached = images[item.id] { return cached }
        if let path = item.path { return NSWorkspace.shared.icon(forFile: path) }
        return NSImage(systemSymbolName: item.text?.hasPrefix("http") == true ? "link" : "doc.text", accessibilityDescription: item.title)!
    }
    func requestThumbnails() {
        for item in record.items.prefix(32) {
            guard images[item.id] == nil, let path = item.path else { continue }
            let request = QLThumbnailGenerator.Request(fileAt: URL(fileURLWithPath: path), size: NSSize(width: 180, height: 180), scale: 2, representationTypes: .thumbnail)
            QLThumbnailGenerator.shared.generateBestRepresentation(for: request) { [weak self] representation, _ in
                DispatchQueue.main.async {
                    guard let self, !self.closing, self.record.items.contains(where: { $0.id == item.id && $0.path == path }), let representation else { return }
                    self.images[item.id] = representation.nsImage; self.surface.needsDisplay = true
                }
            }
        }
    }
    func publishGeometry() {
        guard !closing else { return }
        let f = window.frame
        record.x = f.minX; record.y = f.minY; record.width = f.width; record.height = f.height
        record.expanded = expanded; record.docked = docked; record.normal = normalFrame.map(StoredFrame.init)
        if mode == "b" {
            let desktopTop = NSScreen.screens.first?.frame.maxY ?? 0
            emit(["event": "geometry", "x": f.minX, "y": desktopTop - f.maxY, "width": f.width, "height": f.height,
                  "pinned": record.pinned, "docked": docked])
        } else { changed?() }
    }
    func beginWindowMove() { moving = true; cancelRetraction() }
    func endWindowMove() { moving = false; publishGeometry() }
    func windowDidMove(_ notification: Notification) { if !docked && !animating && !moving { publishGeometry() } }
    func animate(_ frame: NSRect, completion: (() -> Void)? = nil) {
        transition = UUID()
        let token = transition
        cancelRetraction()
        animating = true
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0 : 0.22
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            window.animator().setFrame(frame, display: true)
        }, completionHandler: { [weak self] in
            guard let self, self.transition == token, !self.closing else { return }
            self.animating = false
            self.publishGeometry(); completion?()
        })
    }
    @objc func toggleExpanded() {
        if mode == "b" { emit(["event": "detail"]); return }
        if docked { undock() }
        expanded.toggle()
        let old = window.frame
        let size = expanded ? NSSize(width: 400, height: min(620, max(260, 92 + record.items.count * 48))) : NSSize(width: 198, height: 207)
        animate(NSRect(x: old.maxX - size.width, y: old.maxY - size.height, width: size.width, height: size.height))
        surface.needsDisplay = true
    }
    @objc func toggleDock() { docked ? undock() : dock() }
    func dock() {
        guard !docked else { return }
        let screen = window.screen?.visibleFrame ?? NSScreen.main!.visibleFrame
        normalFrame = window.frame
        let edgeRight = window.frame.midX > screen.midX
        docked = true
        surface.needsLayout = true
        if mode == "b" {
            let f = NSRect(x: edgeRight ? screen.maxX - 72 : screen.minX,
                           y: max(screen.minY, min(window.frame.minY, screen.maxY - 160)), width: 72, height: 160)
            emit(["event": "dockIntent", "edge": edgeRight ? "right" : "left"])
            animate(f)
        } else {
            var target = window.frame
            target.origin.x = edgeRight ? screen.maxX - target.width * 0.16 : screen.minX - target.width * 0.84
            animate(target)
        }
    }
    func undock() {
        guard docked, var target = normalFrame else { return }
        docked = false
        surface.needsLayout = true
        let screen = window.screen?.visibleFrame ?? NSScreen.main!.visibleFrame
        target.origin.x = max(screen.minX + 12, min(target.minX, screen.maxX - target.width - 12))
        if mode == "b" { emit(["event": "undockIntent"]) }
        animate(target)
    }
    func cancelRetraction() { retraction = nil }
    func scheduleRetraction() {
        guard mode == "a", expanded, !record.pinned else { return }
        let token = UUID(); retraction = token
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            guard let self, self.retraction == token, self.expanded, !self.closing else { return }
            self.toggleExpanded()
        }
    }
    @objc func togglePin() { pin(!record.pinned) }
    func pin(_ pinned: Bool, notify: Bool = true) {
        record.pinned = pinned
        window.level = mode == "a" || pinned ? .floating : .normal
        surface.needsDisplay = true
        surface.needsLayout = true
        if notify {
            if mode == "b" { emit(["event": "pin", "pinned": pinned]) }
            else { changed?() }
        }
    }
    @objc func hide() { window.orderOut(nil); reportVisibility(); if mode == "b" { emit(["event": "hidden"]) } }
    @objc func copyItems() {
        guard mode == "a", !record.items.isEmpty else { return }
        if copyToNew?(record.items) != true { feedback("未确认新架子保存，来源保持。") }
    }
    @objc func rename() {
        if mode == "b" { emit(["event": "detail"]); return }
        let alert = NSAlert()
        alert.messageText = "架子名称"
        let field = NSTextField(string: record.name)
        field.frame = NSRect(x: 0, y: 0, width: 260, height: 24)
        alert.accessoryView = field; alert.addButton(withTitle: "保存"); alert.addButton(withTitle: "取消")
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let name = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty && name.count <= 80 else { feedback("名称须为1–80个字符"); return }
        record.name = name; window.title = name; surface.needsDisplay = true; changed?()
    }
    @objc func close() {
        if mode == "b" { emit(["event": "closeRequested"]); return }
        destroy(); record.open = false; changed?(); removed?()
    }
    func destroy() {
        closing = true; cancelRetraction(); transition = UUID()
        if let panel = QLPreviewPanel.shared(), panel.dataSource === self { panel.orderOut(nil); panel.dataSource = nil; panel.delegate = nil }
        window.delegate = nil; window.close()
    }
    func feedback(_ text: String) {
        message = text; surface.needsDisplay = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard self?.message == text else { return }; self?.message = nil; self?.surface.needsDisplay = true
        }
    }
    func materialize(_ item: Item) throws -> URL {
        if let path = item.path {
            guard FileManager.default.fileExists(atPath: path) else { throw CocoaError(.fileReadNoSuchFile) }
            return URL(fileURLWithPath: path)
        }
        let dir = stateRoot.appendingPathComponent("exports", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(item.id + ".txt")
        try Data((item.text ?? "").utf8).write(to: url, options: .atomic)
        return url
    }
    func receive(_ board: NSPasteboard) -> Bool {
        var incoming: [Item] = []
        if let urls = board.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL] {
            incoming = urls.map { Item(id: $0.standardizedFileURL.path, title: $0.lastPathComponent, path: $0.path,
                                      bookmark: try? $0.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)) }
        } else if let receivers = board.readObjects(forClasses: [NSFilePromiseReceiver.self]) as? [NSFilePromiseReceiver], !receivers.isEmpty {
            let dest = stateRoot.appendingPathComponent("promises/" + UUID().uuidString, isDirectory: true)
            do { try FileManager.default.createDirectory(at: dest, withIntermediateDirectories: true) }
            catch { feedback(error.localizedDescription); return false }
            feedback("正在接收文件…")
            for receiver in receivers {
                receiver.receivePromisedFiles(atDestination: dest, options: [:], operationQueue: .main) { [weak self] url, error in
                    guard let self, !self.closing else { return }
                    if let error { self.feedback(error.localizedDescription); return }
                    self.append([Item(id: url.path, title: url.lastPathComponent, path: url.path)])
                }
            }
            return true
        } else if let text = board.string(forType: .string), !text.isEmpty {
            incoming = [Item(id: UUID().uuidString, title: String(text.prefix(40)), text: text)]
        } else if let data = board.data(forType: .png) ?? board.data(forType: .tiff), let image = NSImage(data: data) {
            let url = stateRoot.appendingPathComponent("image-" + UUID().uuidString + ".tiff")
            do { try image.tiffRepresentation?.write(to: url, options: .atomic) }
            catch { feedback(error.localizedDescription); return false }
            incoming = [Item(id: url.path, title: "图像", path: url.path)]
        }
        guard !incoming.isEmpty else { return false }
        return append(incoming)
    }
    @discardableResult func append(_ incoming: [Item]) -> Bool {
        let existing = Set(record.items.compactMap(\.path))
        if incoming.contains(where: { $0.path.map(existing.contains) ?? false }) { feedback("架子中已有此项目"); return false }
        record.items += incoming; requestThumbnails(); surface.needsDisplay = true; changed?()
        return true
    }
    @objc func quickPreview() { preview(index: 0) }
    func preview(index: Int) {
        guard index < record.items.count else { return }
        if mode == "b" { emit(["event": "detail", "assetId": record.items[index].id]); return }
        do {
            previewURL = try materialize(record.items[index])
            guard let panel = QLPreviewPanel.shared() else { return }
            panel.dataSource = self; panel.delegate = self; panel.reloadData(); panel.makeKeyAndOrderFront(nil)
        } catch { feedback("预览失败：\(error.localizedDescription)") }
    }
    func numberOfPreviewItems(in panel: QLPreviewPanel!) -> Int { previewURL == nil ? 0 : 1 }
    func previewPanel(_ panel: QLPreviewPanel!, previewItemAt index: Int) -> QLPreviewItem! { previewURL as NSURL? }
}
