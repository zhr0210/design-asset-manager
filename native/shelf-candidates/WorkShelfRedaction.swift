import AppKit

final class WorkShelfAnnotationCanvas:NSView {
    var image:NSImage?
    var marks:[[String:Any]]=[]
    var recognized:[[String:Any]]=[]
    var history:[[[String:Any]]]=[]
    var selectedIndex:Int?
    var adjusting=false,resizing=false
    var initialMark:[String:Any]?
    var smart=false
    var color="#000000"
    var start:NSPoint?,current:NSPoint?
    override var isFlipped:Bool{true}
    override var acceptsFirstResponder:Bool{true}
    var imageFrame:NSRect{guard let image else{return .zero};return workShelfImageRect(image,in:bounds.insetBy(dx:12,dy:12))}
    override func draw(_ dirtyRect:NSRect){
        guard let image else{return};let rect=imageFrame;image.draw(in:rect,from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:nil)
        if smart{for mark in recognized{var outline=mark;outline["kind"]="outline";outline["color"]="#478BFF";drawMark(outline,rect:rect)}}
        for mark in marks{drawMark(mark,rect:rect)}
        if let selectedIndex,marks.indices.contains(selectedIndex){let frame=markFrame(marks[selectedIndex]);NSColor.controlAccentColor.setStroke();let border=NSBezierPath(rect:frame);border.lineWidth=1;border.stroke();NSColor.controlAccentColor.setFill();NSRect(x:frame.maxX-4,y:frame.maxY-4,width:8,height:8).fill()}
        if !adjusting,let start,let current,let mark=makeMark(start,current){drawMark(mark,rect:rect)}
    }
    func drawMark(_ mark:[String:Any],rect:NSRect){
        guard let x=mark["x"] as? Double,let y=mark["y"] as? Double,let w=mark["width"] as? Double,let h=mark["height"] as? Double else{return}
        let frame=NSRect(x:rect.minX+x*rect.width,y:rect.minY+y*rect.height,width:w*rect.width,height:h*rect.height),color=WorkShelfColorSelection(hex:mark["color"] as? String ?? "#000000").color
        color.set();let path=NSBezierPath(rect:frame);if mark["kind"] as? String=="outline"{path.lineWidth=1;path.stroke()}else{path.fill()}
    }
    func makeMark(_ a:NSPoint,_ b:NSPoint)->[String:Any]?{
        let rect=imageFrame;guard rect.width>0,rect.height>0 else{return nil}
        let x=min(1,max(0,(min(a.x,b.x)-rect.minX)/rect.width)),y=min(1,max(0,(min(a.y,b.y)-rect.minY)/rect.height)),width=min(1-x,abs(b.x-a.x)/rect.width),height=min(1-y,abs(b.y-a.y)/rect.height)
        guard width>0.002,height>0.002 else{return nil}
        let value:[String:Any]=["kind":"redact","x":Double(x),"y":Double(y),"width":Double(width),"height":Double(height),"color":color];return value
    }
    func markFrame(_ mark:[String:Any])->NSRect{let r=imageFrame;return NSRect(x:r.minX+(mark["x"] as? Double ?? 0)*r.width,y:r.minY+(mark["y"] as? Double ?? 0)*r.height,width:(mark["width"] as? Double ?? 0)*r.width,height:(mark["height"] as? Double ?? 0)*r.height)}
    func saveUndo(){history.append(marks);if history.count>100{history.removeFirst()}}
    func undo(){guard let previous=history.popLast() else{return};marks=previous;selectedIndex=nil;needsDisplay=true}
    override func keyDown(with event:NSEvent){if event.keyCode==51,let selectedIndex,marks.indices.contains(selectedIndex){saveUndo();marks.remove(at:selectedIndex);self.selectedIndex=nil;needsDisplay=true}else{super.keyDown(with:event)}}
    override func mouseDown(with event:NSEvent){
        let point=convert(event.locationInWindow,from:nil);guard imageFrame.contains(point) else{return};window?.makeFirstResponder(self)
        start=point;current=point;adjusting=false;initialMark=nil
        if smart {
            if let mark=recognized.first(where:{markFrame($0).contains(point)}){saveUndo();if let index=marks.firstIndex(where:{($0["ocrIndex"] as? Int)==(mark["ocrIndex"] as? Int)}){marks.remove(at:index)}else if marks.count<100{marks.append(mark)};needsDisplay=true}
            return
        }
        if let index=marks.indices.reversed().first(where:{markFrame(marks[$0]).insetBy(dx:-5,dy:-5).contains(point)}){
            saveUndo();selectedIndex=index;initialMark=marks[index];adjusting=true;let frame=markFrame(marks[index]);resizing=hypot(point.x-frame.maxX,point.y-frame.maxY)<12
        }else{selectedIndex=nil;if marks.count>=100{start=nil;return};saveUndo()}
        needsDisplay=true
    }
    override func mouseDragged(with event:NSEvent){
        guard let start else{return};let point=convert(event.locationInWindow,from:nil);current=point
        if adjusting,let selectedIndex,let initialMark{
            let r=imageFrame,dx=(point.x-start.x)/r.width,dy=(point.y-start.y)/r.height
            var mark=initialMark;let x=initialMark["x"] as! Double,y=initialMark["y"] as! Double,w=initialMark["width"] as! Double,h=initialMark["height"] as! Double
            if resizing{mark["width"]=max(0.002,min(1-x,w+dx));mark["height"]=max(0.002,min(1-y,h+dy))}else{mark["x"]=max(0,min(1-w,x+dx));mark["y"]=max(0,min(1-h,y+dy))};marks[selectedIndex]=mark
        };needsDisplay=true
    }
    override func mouseUp(with event:NSEvent){
        if let start {
            let point=convert(event.locationInWindow,from:nil)
            if smart,hypot(point.x-start.x,point.y-start.y)>4{saveUndo();let selection=NSRect(x:min(start.x,point.x),y:min(start.y,point.y),width:abs(point.x-start.x),height:abs(point.y-start.y));for mark in recognized where markFrame(mark).intersects(selection){if marks.count<100 && !marks.contains(where:{($0["ocrIndex"] as? Int)==(mark["ocrIndex"] as? Int)}){marks.append(mark)}}}
            else if !smart,!adjusting,let mark=makeMark(start,point){marks.append(mark);selectedIndex=marks.count-1}
        }
        start=nil;current=nil;adjusting=false;initialMark=nil;needsDisplay=true
    }
}
final class WorkShelfRedaction:NSViewController {
    weak var shelf:NativeWorkShelf?
    let sourceRevision:Int,sourceImageKey:String
    let id:String,canvas=WorkShelfAnnotationCanvas(),status=NSTextField(labelWithString:"拖动绘制；仅导出独立副本，素材笔记和原件保持。")
    let mode=NSPopUpButton(),export=NSButton(title:"导出 PNG 副本…",target:nil,action:nil)
    var generation=UUID()
    init(shelf:NativeWorkShelf,id:String){self.shelf=shelf;self.id=id;sourceRevision=shelf.revision;sourceImageKey=shelf.items.first(where:{$0.id==id})?.imageKey ?? "";super.init(nibName:nil,bundle:nil)}
    required init?(coder:NSCoder){nil}
    override func loadView(){
        view=NSView(frame:NSRect(x:0,y:0,width:600,height:500));canvas.frame=NSRect(x:12,y:80,width:576,height:350);canvas.image=shelf?.items.first(where:{$0.id==id})?.image;view.addSubview(canvas)
        mode.frame=NSRect(x:12,y:445,width:125,height:28);mode.addItems(withTitles:["手动遮挡","智能遮挡 · OCR"]);mode.target=self;mode.action=#selector(changeToolMode);view.addSubview(mode)
        let undo=NSButton(title:"撤销",target:self,action:#selector(undo));undo.frame=NSRect(x:384,y:445,width:85,height:28);view.addSubview(undo)
        let color=NSColorWell(frame:NSRect(x:478,y:445,width:100,height:28));color.color = .black;color.target=self;color.action=#selector(setAnnotationColor(_:));color.setAccessibilityLabel("遮挡颜色");view.addSubview(color)
        status.frame=NSRect(x:12,y:50,width:576,height:25);view.addSubview(status)
        export.frame=NSRect(x:12,y:10,width:180,height:30);export.target=self;export.action=#selector(save);view.addSubview(export)
        let cancel=NSButton(title:"取消编辑",target:self,action:#selector(close));cancel.frame=NSRect(x:390,y:10,width:190,height:30);view.addSubview(cancel)
    }
    override func viewDidDisappear(){super.viewDidDisappear();generation=UUID();if !export.isEnabled{shelf?.action("cancel",presentsReply:true,completion:{_ in})}}
    @objc func changeToolMode(){
        canvas.smart=mode.indexOfSelectedItem==1
        guard canvas.smart else{canvas.needsDisplay=true;return}
        let token=generation
        shelf?.action("ocr",["assetId":id,"operation":"read"],presentsReply:true){[weak self] reply in
            guard let self,self.generation==token,self.view.window != nil,self.canvas.smart else{return}
            guard reply["ok"] as? Bool==true,let value=reply["value"] as? [String:Any],let evidence=value["evidence"] as? [String:Any],let observation=evidence["observation"] as? [String:Any],let blocks=observation["blocks"] as? [[String:Any]] else{self.canvas.smart=false;self.mode.selectItem(at:0);self.status.stringValue="智能遮挡需要已完成的本机 OCR；请先从菜单识别文字。";return}
            self.canvas.recognized=blocks.prefix(100).enumerated().compactMap{index,block in guard let points=block["polygon"] as? [[Double]],points.count==4 else{return nil};let xs=points.map{$0[0]},ys=points.map{$0[1]},x=xs.min()!,y=ys.min()!,w=xs.max()!-x,h=ys.max()!-y;guard w>0,h>0 else{return nil};return["kind":"redact","x":x,"y":y,"width":w,"height":h,"color":"#000000","ocrIndex":index]}
            self.canvas.needsDisplay=true;self.status.stringValue=blocks.isEmpty ? "有效空结果：未识别到文字，可使用手动遮挡。":"点击蓝框文字区域选择或取消遮挡，再导出独立副本。"
        }
    }
    @objc func setAnnotationColor(_ sender:NSColorWell){guard let c=sender.color.usingColorSpace(.sRGB) else{return};canvas.color=String(format:"#%02X%02X%02X",Int(c.redComponent*255),Int(c.greenComponent*255),Int(c.blueComponent*255));for index in canvas.recognized.indices{canvas.recognized[index]["color"]=canvas.color}}
    @objc func undo(){canvas.undo()}
    @objc func close(){generation=UUID();if shelf?.tools?.contentViewController === self{shelf?.tools?.close()}}
    @objc func save(){
        guard view.window != nil,shelf?.retired==false,shelf?.frozen==false else{return}
        guard shelf?.revision==sourceRevision,shelf?.items.first(where:{$0.id==id})?.imageKey==sourceImageKey else{status.stringValue="素材或工作集在编辑期间变化，未导出；请重新打开核对。";return}
        guard export.isEnabled,!canvas.marks.isEmpty else{status.stringValue="请先绘制至少一项标注。";return};let generation=UUID();self.generation=generation
        let panel=NSSavePanel();panel.nameFieldStringValue="标注副本.png";panel.allowedContentTypes=[.png];guard panel.runModal() == .OK,let destination=panel.url else{return}
        export.isEnabled=false
        shelf?.action("handoff",["assetIds":[id],"handoffKind":"processed-image","imageTransform":["format":"png","quality":100,"stripMetadata":true,"annotations":canvas.marks.map{mark in var value=mark;value.removeValue(forKey:"ocrIndex");return value}]],presentsReply:true){[weak self] reply in
            guard let self,self.generation==generation,self.view.window != nil,self.shelf?.retired==false else{return};self.export.isEnabled=true
            guard reply["ok"] as? Bool==true,let records=reply["receipts"] as? [[String:String]],let receipt=records.first?["id"] else{self.status.stringValue=reply["message"] as? String ?? "未完成，草稿保持。";return}
            self.shelf?.action("file-action",["id":receipt,"operation":"copy","destination":destination.path],presentsReply:true){[weak self] reply in guard let self,self.generation==generation else{return};self.status.stringValue=reply["message"] as? String ?? "副本导出结果未确认。"}
        }
    }
}
