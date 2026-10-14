import AppKit

final class WorkShelfOCR:NSViewController {
    weak var shelf:NativeWorkShelf?
    let ids:[String]
    let status=NSTextField(labelWithString:"本机 OCR · 最多8项；按工作集顺序，现有人工修正保持。")
    let text=NSTextView(),scroll=NSScrollView()
    let run=NSButton(title:"开始识别",target:nil,action:nil),cancel=NSButton(title:"取消运行",target:nil,action:nil),copy=NSButton(title:"复制文字",target:nil,action:nil),export=NSButton(title:"导出文字副本",target:nil,action:nil)
    var token=UUID(),results:[String]=[]
    init(shelf:NativeWorkShelf,ids:[String]){self.shelf=shelf;self.ids=ids;super.init(nibName:nil,bundle:nil)}
    required init?(coder:NSCoder){nil}
    override func loadView(){
        view=NSView(frame:NSRect(x:0,y:0,width:400,height:360));status.frame=NSRect(x:16,y:310,width:368,height:34);status.maximumNumberOfLines=2;view.addSubview(status)
        text.isEditable=false;text.isRichText=false;text.font = .systemFont(ofSize:13);scroll.frame=NSRect(x:16,y:65,width:368,height:240);scroll.documentView=text;scroll.hasVerticalScroller=true;view.addSubview(scroll)
        for (index,button) in [run,cancel,copy,export].enumerated(){button.frame=NSRect(x:16+CGFloat(index)*94,y:20,width:90,height:30);button.target=self;view.addSubview(button)}
        run.action=#selector(start);cancel.action=#selector(stop);copy.action=#selector(copyText);export.action=#selector(exportText);copy.isEnabled=false;export.isEnabled=false
    }
    func isCurrent(_ generation:UUID)->Bool{token==generation && shelf?.retired==false && shelf?.frozen==false && view.window != nil}
    override func viewDidDisappear(){super.viewDidDisappear();token=UUID();if let id=ids.first{shelf?.action("ocr",["assetId":id,"operation":"cancel"],presentsReply:true,completion:{_ in})}}
    func call(_ id:String,_ operation:String,receipt:String?=nil,_ completion:@escaping ([String:Any])->Void){var value:[String:Any]=["assetId":id,"operation":operation];if let receipt{value["receipt"]=receipt};shelf?.action("ocr",value,presentsReply:true,completion:completion)}
    @objc func start(){guard run.isEnabled else{return};token=UUID();let generation=token;run.isEnabled=false;copy.isEnabled=false;export.isEnabled=false;results=[];text.string="";process(0,generation:generation)}
    func process(_ index:Int,generation:UUID){
        guard token==generation,let shelf,!shelf.retired,!shelf.frozen,view.window != nil else{return}
        guard index<ids.count else{run.isEnabled=true;copy.isEnabled=true;export.isEnabled=true;status.stringValue="已完成 \(ids.count) 项；有效空结果与执行失败分别显示。";return}
        let id=ids[index];status.stringValue="正在识别 \(index+1)/\(ids.count) 项 · 本机 RapidOCR"
        call(id,"prepare"){[weak self] reply in
            guard let self,self.isCurrent(generation) else{return}
            guard reply["ok"] as? Bool==true,let value=reply["value"] as? [String:Any],let receipt=value["receipt"] as? String else{self.failed(reply);return}
            self.call(id,"run",receipt:receipt){[weak self] reply in guard let self,self.isCurrent(generation) else{return};guard reply["ok"] as? Bool==true else{self.failed(reply);return};self.poll(id,index:index,generation:generation)}
        }
    }
    func failed(_ reply:[String:Any]){run.isEnabled=true;status.stringValue=reply["message"] as? String ?? "OCR 未完成；已保存结果保持，可在 DAM 大预览查看。"}
    func poll(_ id:String,index:Int,generation:UUID){
        guard token==generation,let shelf,!shelf.retired,!shelf.frozen,view.window != nil else{return}
        call(id,"status"){[weak self] reply in
            guard let self,self.isCurrent(generation) else{return}
            guard reply["ok"] as? Bool==true,let value=reply["value"] as? [String:Any] else{self.failed(reply);return}
            let job=value["job"] as? [String:Any]
            if job?["state"] as? String=="running"{DispatchQueue.main.asyncAfter(deadline:.now()+0.5){[weak self] in self?.poll(id,index:index,generation:generation)};return}
            guard job?["state"] as? String=="completed" else{self.failed(["message":"OCR 执行未完成；已完成结果仍保留。"]);return}
            self.call(id,"read"){[weak self] reply in
                guard let self,self.isCurrent(generation) else{return}
                guard reply["ok"] as? Bool==true,let value=reply["value"] as? [String:Any],let evidence=value["evidence"] as? [String:Any],let observation=evidence["observation"] as? [String:Any] else{self.failed(reply);return}
                let recognized=(observation["blocks"] as? [[String:Any]] ?? []).compactMap{$0["text"] as? String}.joined(separator:"\n")
                let content=value["editedText"] as? String ?? recognized,title=self.shelf?.items.first(where:{$0.id==id})?.name ?? id
                self.results.append(title+"\n"+(content.isEmpty ? "（有效空结果：未识别到文字）":content));self.text.string=self.results.joined(separator:"\n\n");self.process(index+1,generation:generation)
            }
        }
    }
    @objc func stop(){token=UUID();let generation=token;run.isEnabled=false;status.stringValue="正在等待取消确认…";guard let id=ids.first else{return};call(id,"cancel"){[weak self] reply in guard let self,self.isCurrent(generation) else{return};self.run.isEnabled=reply["ok"] as? Bool==true;self.status.stringValue=reply["ok"] as? Bool==true ? "取消已返回，已保存结果与人工修正保持。":reply["message"] as? String ?? "取消未确认"}}
    @objc func copyText(){NSPasteboard.general.clearContents();NSPasteboard.general.setString(text.string,forType:.string)}
    @objc func exportText(){
        shelf?.action("handoff",["assetIds":ids,"handoffKind":"ocr-text"],presentsReply:true){[weak self] reply in
            guard let self,reply["ok"] as? Bool==true,let receipts=reply["receipts"] as? [[String:String]] else{self?.failed(reply);return}
            let panel=NSOpenPanel();panel.canChooseDirectories=true;panel.canChooseFiles=false;panel.canCreateDirectories=true;guard panel.runModal() == .OK,let directory=panel.url else{return}
            for receipt in receipts{guard let id=receipt["id"],let name=receipt["fileName"] else{continue};self.shelf?.action("file-action",["id":id,"operation":"copy","destination":directory.appendingPathComponent(name).path])}
        }
    }
}
