import AppKit

let args = CommandLine.arguments
func argument(_ name: String) -> String? { args.first { $0.hasPrefix(name + "=") }.map { String($0.dropFirst(name.count + 1)) } }
let mode = argument("--mode") ?? (Bundle.main.bundleIdentifier == "com.dam.candidate.shelf-b" ? "b" : "a")
let defaultRoot = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!.appendingPathComponent("DAM Shelf A Candidate").path
guard ["a", "b"].contains(mode), let rootPath = argument("--state-root") ?? (mode == "a" ? defaultRoot : nil), rootPath.hasPrefix("/") else {
    fputs("Explicit absolute --state-root and --mode=a|b required\n", stderr)
    exit(2)
}
let root = URL(fileURLWithPath: rootPath, isDirectory: true)
try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)

final class CandidateApp: NSObject, NSApplicationDelegate {
    var shelves: [ShelfController] = []
    var records: [ShelfRecord] = []
    var status: NSStatusItem?
    var pipeSource: DispatchSourceRead?
    var input = Data()
    var saveError: String?
    let stateURL = root.appendingPathComponent("shelves.json")
    var workShelf: NativeWorkShelf?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        if mode == "b" {
            workShelf = NativeWorkShelf(root:root)
            workShelf?.installMenu()
            startPipe()
            emit(["event": "ready", "version": 3])
            return
        }
        menu()
        if FileManager.default.fileExists(atPath: stateURL.path) {
            do {
                records = try JSONDecoder().decode([ShelfRecord].self, from: Data(contentsOf: stateURL))
                for record in records.filter(\.open) { open(record) }
            } catch {
                saveError = "保存记录无法读取，原文件保留。\(error.localizedDescription)"
                let alert = NSAlert(); alert.messageText = "无法恢复架子"; alert.informativeText = saveError!; alert.runModal()
            }
        }
        if shelves.isEmpty { newShelf() }
    }
    func menu() {
        let main = NSMenu()
        let app = NSMenu(title: "DAM Shelf A")
        let rootItem = NSMenuItem(); rootItem.submenu = app; main.addItem(rootItem)
        for (title, selector, key) in [("新的悬浮架子", #selector(newShelf), "n"),
                                      ("从剪贴板新建", #selector(fromClipboard), ""),
                                      ("添加文件…", #selector(addFiles), "o"),
                                      ("重开最近关闭的架子", #selector(reopenRecent), ""),
                                      ("显示所有架子", #selector(showAll), ""),
                                      ("退出候选 A", #selector(quit), "q")] {
            let item = NSMenuItem(title: title, action: selector, keyEquivalent: key); item.target = self; app.addItem(item)
        }
        let editRoot = NSMenuItem(title: "编辑", action: nil, keyEquivalent: "")
        let edit = NSMenu(title: "编辑")
        for (title, selector, key) in [("剪切", Selector(("cut:")), "x"), ("复制", Selector(("copy:")), "c"),
                                      ("粘贴", Selector(("paste:")), "v"), ("全选", Selector(("selectAll:")), "a")] {
            edit.addItem(NSMenuItem(title: title, action: selector, keyEquivalent: key))
        }
        editRoot.submenu = edit; main.addItem(editRoot)
        NSApp.mainMenu = main
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status?.button?.image = NSImage(systemSymbolName: "square.stack.3d.up", accessibilityDescription: "DAM Shelf A")
        status?.menu = app
    }
    func open(_ record: ShelfRecord) {
        let shelf = ShelfController(mode: "a", record: record, root: root)
        shelf.changed = { [weak self, weak shelf] in
            guard let self, let shelf else { return }
            if let i = self.records.firstIndex(where: { $0.id == shelf.record.id }) { self.records[i] = shelf.record }
            else { self.records.append(shelf.record) }
            self.save()
        }
        shelf.removed = { [weak self, weak shelf] in
            guard let self, let shelf else { return }; self.shelves.removeAll { $0 === shelf }
        }
        shelf.copyToNew = { [weak self] items in
            guard let self else { return false }
            var copied = ShelfRecord(); copied.items = items
            self.records.append(copied); self.open(copied)
            return self.save()
        }
        shelves.append(shelf); shelf.show()
    }
    @objc func newShelf() {
        var record = ShelfRecord()
        if let frame = NSScreen.main?.visibleFrame {
            record.x = frame.maxX - 222 - Double(shelves.count % 5) * 28
            record.y = frame.maxY - 231 - Double(shelves.count % 5) * 28
        }
        records.append(record); open(record); save()
    }
    @objc func fromClipboard() { newShelf(); _ = shelves.last?.receive(NSPasteboard.general) }
    @objc func addFiles() {
        let panel = NSOpenPanel(); panel.allowsMultipleSelection = true; panel.canChooseDirectories = true
        let fixtureDirectory = root.appendingPathComponent("fixtures", isDirectory: true)
        if FileManager.default.fileExists(atPath: fixtureDirectory.path) { panel.directoryURL = fixtureDirectory }
        guard panel.runModal() == .OK else { return }
        if shelves.isEmpty { newShelf() }
        _ = shelves.last?.append(panel.urls.map { Item(id: $0.standardizedFileURL.path, title: $0.lastPathComponent, path: $0.path,
                                                      bookmark: try? $0.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)) })
    }
    @objc func showAll() { for shelf in shelves { shelf.show() } }
    @objc func reopenRecent() {
        guard var record = records.last(where: { !$0.open }) else { return }
        record.open = true
        if let index = records.firstIndex(where: { $0.id == record.id }) { records[index] = record }
        open(record); save()
    }
    @discardableResult func save() -> Bool {
        guard saveError == nil else { return false } // Never erase undecodable records.
        do { try JSONEncoder().encode(records).write(to: stateURL, options: .atomic); return true }
        catch { for shelf in shelves { shelf.feedback("保存失败：\(error.localizedDescription)") }; return false }
    }
    @objc func quit() {
        guard save() else {
            let alert = NSAlert(); alert.messageText = "未能保存架子，尚未退出"; alert.informativeText = "请检查存储状态后重试，当前架子保留。"; alert.runModal(); return
        }
        NSApp.terminate(nil)
    }

    func startPipe() {
        let source = DispatchSource.makeReadSource(fileDescriptor: STDIN_FILENO, queue: .main)
        source.setEventHandler { [weak self] in
            guard let self else { return }
            var bytes = [UInt8](repeating: 0, count: 65536)
            let count = read(STDIN_FILENO, &bytes, bytes.count)
            if count <= 0 { self.workShelf?.retire(); for shelf in self.shelves { shelf.destroy() }; NSApp.terminate(nil); return }
            self.input.append(contentsOf: bytes.prefix(count))
            if self.input.count > 16 * 1024 * 1024 { NSApp.terminate(nil); return }
            while let newline = self.input.firstIndex(of: 10) {
                let data = self.input.prefix(upTo: newline); self.input.removeSubrange(...newline)
                do {
                    guard let command = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw CocoaError(.coderInvalidValue) }
                    try self.command(command)
                } catch { emit(["event": "error", "message": error.localizedDescription]) }
            }
        }
        pipeSource = source; source.resume()
    }
    func command(_ command: [String: Any]) throws {
        if mode == "b", let workShelf { try workShelf.command(command); return }
        guard let shelf = shelves.first, let op = command["op"] as? String else { throw CocoaError(.coderInvalidValue) }
        switch op {
        case "publish":
            guard let name = command["name"] as? String, name.count <= 80,
                  let items = command["items"] as? [[String: Any]], items.count <= 200,
                  let colors = command["colors"] as? [String], colors.count <= 64 else { throw CocoaError(.coderInvalidValue) }
            shelf.record.name = name; shelf.window.title = name; shelf.colors = colors
            shelf.record.items = try items.map { item in
                guard let id = item["id"] as? String, let title = item["title"] as? String else { throw CocoaError(.coderInvalidValue) }
                if let encoded = item["preview"] as? String, let data = Data(base64Encoded: encoded), data.count <= 8 * 1024 * 1024, let image = NSImage(data: data) { shelf.images[id] = image }
                return Item(id: id, title: title)
            }
            let ids = Set(shelf.record.items.map(\.id)); shelf.images = shelf.images.filter { ids.contains($0.key) }
            shelf.surface.needsDisplay = true
        case "show": shelf.show()
        case "hide": shelf.window.orderOut(nil); shelf.reportVisibility()
        case "destroy": shelf.destroy(); NSApp.terminate(nil)
        case "pin":
            guard let pinned = command["pinned"] as? Bool else { throw CocoaError(.coderInvalidValue) }
            shelf.record.pinned = pinned; shelf.window.level = pinned ? .floating : .normal; shelf.surface.needsDisplay = true
        case "bounds":
            guard let x = command["x"] as? Double, let y = command["y"] as? Double,
                  let width = command["width"] as? Double, let height = command["height"] as? Double,
                  [x, y, width, height].allSatisfy({ $0.isFinite && abs($0) <= 100000 }),
                  width >= 72 && height >= 160 && width <= 5000 && height <= 5000 else { throw CocoaError(.coderInvalidValue) }
            // Host protocol uses Electron top-left screen coordinates.
            let desktopTop = NSScreen.screens.first?.frame.maxY ?? 0
            let rect = NSRect(x: x, y: desktopTop - y - height, width: width, height: height)
            shelf.docked = command["docked"] as? Bool ?? false
            if let normal = command["normal"] as? [String: Double], let nx = normal["x"], let ny = normal["y"], let nw = normal["width"], let nh = normal["height"] {
                shelf.normalFrame = NSRect(x: nx, y: desktopTop - ny - nh, width: nw, height: nh)
            }
            shelf.animate(rect)
        case "feedback": shelf.feedback(String((command["message"] as? String ?? "").prefix(300)))
        default: throw CocoaError(.coderInvalidValue)
        }
    }
}

let app = NSApplication.shared
let delegate = CandidateApp()
app.delegate = delegate
app.run()
