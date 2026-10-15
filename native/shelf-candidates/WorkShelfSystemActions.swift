import AppKit
import QuickLookUI

extension NativeWorkShelf {
    func addSystemMenu(to menu:NSMenu,ids:[String],summary:String) {
        for (title,operation) in [("打开","open"),("打开方式…","open-with"),("在 Finder 中显示","finder"),("文件信息…","info"),("快速查看","quick-look"),("DAM 大预览","dam-preview"),("共享…","share"),("复制文件","copy-files"),("复制副本路径","copy-paths"),("设为桌面图片","desktop"),("复制副本到…","copy"),("移动副本到…","move"),("副本改名…","rename"),("将副本移到废纸篓","trash"),("图像标注与遮挡…","annotate")] {
            let item=NSMenuItem(title:"\(title) · \(summary)",action:#selector(systemAction(_:)),keyEquivalent:"")
            item.target=self;item.representedObject=["operation":operation,"ids":ids,"revision":revision]
            item.isEnabled = !frozen && !retired && !ids.isEmpty && ids.count<=64 && (operation != "desktop" || ids.count==1 && items.first(where:{$0.id==ids.first})?.type != "mp4")
            menu.addItem(item)
        }
        let saved=NSMenuItem(title:"历史交付副本… · "+summary,action:#selector(showSavedFiles),keyEquivalent:"");saved.target=self;saved.isEnabled = !ids.isEmpty && ids.count<=64 && !frozen && !retired;menu.addItem(saved)
        let paste=NSMenuItem(title:"从剪贴板添加",action:#selector(pasteFromMenu),keyEquivalent:"v");paste.target=self;paste.isEnabled = !frozen && !retired && items.count<200;menu.addItem(paste)
    }
    func addReferenceMenu(to menu:NSMenu){
        menu.addItem(.separator())
        for (title,operation) in [("清空工作集引用…","clear"),("新建工作集…","new"),("将目标复制到新工作集…","copy"),("将目标移到新工作集…","move")] {
            let item=NSMenuItem(title:title,action:#selector(referenceSetAction(_:)),keyEquivalent:"");item.target=self;item.representedObject=["operation":operation,"ids":targets(),"revision":revision];item.isEnabled = !frozen && !retired && (operation=="new" || !items.isEmpty);menu.addItem(item)
        }
        let ocr=NSMenuItem(title:"识别文字（本机 OCR）… · "+targetSummary,action:#selector(openOCR),keyEquivalent:"");ocr.target=self;ocr.isEnabled = !targets().isEmpty && targets().count<=8 && !frozen && !retired;menu.addItem(ocr)
    }
    @objc func referenceSetAction(_ sender:NSMenuItem){
        guard let value=sender.representedObject as? [String:Any],let operation=value["operation"] as? String,let ids=value["ids"] as? [String],let version=value["revision"] as? Int else{return}
        let alert=NSAlert();alert.messageText=operation=="clear" ? "清空此工作集的全部引用？":"新工作集名称"
        let field=NSTextField(string:operation=="new" ? "新工作集":name+" 副本");field.frame=NSRect(x:0,y:0,width:260,height:24)
        if operation=="clear"{alert.informativeText="只移除引用，素材库原件、素材笔记和集合记录保留。"}else{alert.accessoryView=field;alert.informativeText=operation=="move" ? "将当前目标引用转入新集合；素材原件保持。":"创建独立工作集，素材原件保持。"}
        alert.addButton(withTitle:"确定");alert.addButton(withTitle:"取消");guard alert.runModal() == .alertFirstButtonReturn else{return}
        action("reference-set",["operation":operation,"name":field.stringValue,"assetIds":ids,"expectedRevision":version])
    }
    @objc func openOCR(){
        let ids=targets();guard !ids.isEmpty,ids.count<=8,!frozen,!retired else{return}
        let controller=WorkShelfOCR(shelf:self,ids:ids),pop=NSPopover();pop.behavior = .semitransient;pop.contentViewController=controller;pop.contentSize=NSSize(width:400,height:360);tools=pop;pop.show(relativeTo:dropdown.bounds,of:dropdown,preferredEdge:.maxY)
    }
    @objc func showSavedFiles(){
        let ids=targets(),version=revision,generation=UUID();systemGeneration=generation
        action("saved-files",["assetIds":ids],presentsReply:true){[weak self] reply in
            guard let self,!self.retired,!self.frozen,self.systemGeneration==generation,self.revision==version else{return}
            guard reply["ok"] as? Bool==true,let files=reply["files"] as? [[String:String]],!files.isEmpty else{self.inform(reply["message"] as? String ?? "没有可恢复的历史交付副本。");return}
            let menu=NSMenu();let summary=NSMenuItem(title:reply["message"] as? String ?? "历史交付副本",action:nil,keyEquivalent:"");summary.isEnabled=false;menu.addItem(summary)
            for file in files{guard let id=file["id"],let name=file["fileName"],let path=file["file"] else{continue};self.systemReceiptsByPath[path]=id;let item=NSMenuItem(title:name,action:#selector(self.revealSavedFile(_:)),keyEquivalent:"");item.target=self;item.representedObject=id;menu.addItem(item)}
            menu.popUp(positioning:nil,at:NSPoint(x:0,y:self.dropdown.bounds.height),in:self.dropdown)
        }
    }
    @objc func revealSavedFile(_ sender:NSMenuItem){guard let id=sender.representedObject as? String else{return};action("receipt-files",["ids":[id]],presentsReply:true){[weak self] reply in guard let self,!self.retired,!self.frozen,reply["ok"] as? Bool==true,let files=reply["files"] as? [[String:String]],let path=files.first?["file"] else{return};NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath:path)])}}
    @objc func pasteFromMenu(){action("paste")}
    func withSystemFiles(_ ids:[String],revision requestedRevision:Int,completion:@escaping ([URL])->Void) {
        let generation=UUID();systemGeneration=generation
        action("system-files",["assetIds":ids,"expectedRevision":requestedRevision],presentsReply:true){[weak self] reply in
            guard let self,!self.retired,!self.frozen,self.window.isVisible,self.systemGeneration==generation else{return}
            guard reply["ok"] as? Bool==true,let files=reply["files"] as? [[String:Any]],files.count==ids.count else{self.inform(reply["message"] as? String ?? "副本准备未完成，未请求系统操作。");return}
            guard self.revision==requestedRevision else{self.inform("工作集已变化，请重新打开菜单。");return}
            let urls=files.compactMap{($0["file"] as? String).map{URL(fileURLWithPath:$0)}}
            guard urls.count==ids.count else{self.inform("副本目标无效，未发出系统请求。");return}
            for (index,url) in urls.enumerated(){if let id=files[index]["id"] as? String{self.systemReceiptsByPath[url.path]=id}}
            completion(urls)
        }
    }
    @objc func systemAction(_ sender:NSMenuItem){
        guard let value=sender.representedObject as? [String:Any],let operation=value["operation"] as? String,let ids=value["ids"] as? [String],let targetRevision=value["revision"] as? Int else{return}
        if operation=="annotate"{
            guard ids.count==1,let id=ids.first,items.first(where:{$0.id==id})?.type != "mp4" else{inform("标注请在展开态选中一张图片。");return}
            let controller=WorkShelfRedaction(shelf:self,id:id),pop=NSPopover();pop.behavior = .semitransient;pop.contentViewController=controller;pop.contentSize=NSSize(width:600,height:500);tools=pop;pop.show(relativeTo:dropdown.bounds,of:dropdown,preferredEdge:.maxY);return
        }
        if operation=="dam-preview"{if let id=ids.first{action("focus",["assetId":id])};return}
        withSystemFiles(ids,revision:targetRevision){[weak self] urls in
            guard let self else{return}
            switch operation {
            case "copy","move","rename","trash":self.manageFiles(urls,operation:operation)
            case "finder":NSWorkspace.shared.activateFileViewerSelecting(urls)
            case "quick-look":
                self.previewURLs=urls;self.window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
                if let panel=QLPreviewPanel.shared(){panel.dataSource=self;panel.delegate=self;panel.reloadData();panel.currentPreviewItemIndex=0;panel.makeKeyAndOrderFront(nil)}
            case "share":
                let picker=NSSharingServicePicker(items:urls);self.sharingEscapeTimestamp=nil;self.sharingDismissalUntil=0;self.sharingPicker=picker;picker.delegate=self
                picker.show(relativeTo:self.dropdown.bounds,of:self.dropdown,preferredEdge:.maxY)
            case "open-with":
                let apps=urls.map{Set(NSWorkspace.shared.urlsForApplications(toOpen:$0))}.reduce(nil as Set<URL>?){previous,current in previous.map{$0.intersection(current)} ?? current} ?? []
                let menu=NSMenu();menu.autoenablesItems=false
                for app in apps.sorted(by:{$0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending}){
                    let item=NSMenuItem(title:app.deletingPathExtension().lastPathComponent,action:#selector(self.openWithApplication(_:)),keyEquivalent:"");item.target=self;item.image=NSWorkspace.shared.icon(forFile:app.path);item.image?.size=NSSize(width:16,height:16);item.representedObject=["app":app,"ids":ids,"revision":targetRevision];menu.addItem(item)
                }
                if apps.isEmpty{self.inform("没有支持此组文件的本机应用。")}else{menu.popUp(positioning:nil,at:NSPoint(x:0,y:self.dropdown.bounds.height),in:self.dropdown)}
            case "copy-files":NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects(urls as [NSURL]);self.inform("已复制 \(urls.count) 项交付副本。")
            case "copy-paths":NSPasteboard.general.clearContents();NSPasteboard.general.setString(urls.map(\.path).joined(separator:"\n"),forType:.string);self.inform("已复制交付副本路径。")
            case "desktop":
                guard urls.count==1 else{return}
                do{try NSWorkspace.shared.setDesktopImageURL(urls[0],for:self.bestScreen(self.window.frame),options:[:]);self.inform("已设置桌面图片；可在系统设置中恢复。")}catch{self.inform("系统未接受桌面图片：\(error.localizedDescription)")}
            case "info":
                let alert=NSAlert();alert.messageText="交付副本文件信息"
                alert.informativeText=urls.map{url in let value=try? url.resourceValues(forKeys:[.fileSizeKey,.contentTypeKey,.creationDateKey,.contentModificationDateKey]);return "\(url.lastPathComponent)\n\(url.path)\n\(value?.fileSize ?? 0) 字节 · \(value?.contentType?.localizedDescription ?? "未知类型")\n修改：\(value?.contentModificationDate?.description ?? "未知")"}.joined(separator:"\n\n")
                alert.runModal()
            case "open":
                for url in urls{if !NSWorkspace.shared.open(url){self.inform("系统无法打开 \(url.lastPathComponent)，副本保留。")}}
            default:self.inform("系统操作未提供。")
            }
        }
    }
    func manageFiles(_ urls:[URL],operation:String){
        var destination:URL?
        if operation=="copy" || operation=="move"{
            let panel=NSOpenPanel();panel.canChooseDirectories=true;panel.canChooseFiles=false;panel.canCreateDirectories=true;panel.allowsMultipleSelection=false;panel.prompt=operation=="copy" ? "复制副本":"移动副本"
            guard panel.runModal() == .OK,let selected=panel.url else{return};destination=selected
        }
        if operation=="trash"{let alert=NSAlert();alert.messageText="将 \(urls.count) 项交付副本移到系统废纸篓？";alert.informativeText="只处理交付副本，素材库原件和工作集引用保持。";alert.addButton(withTitle:"取消");alert.addButton(withTitle:"移到废纸篓");guard alert.runModal() == .alertSecondButtonReturn else{return}}
        func next(_ index:Int){
            guard index<urls.count,!self.retired,!self.frozen else{return}
            let url=urls[index];guard let id=self.systemReceiptsByPath[url.path] else{self.inform("副本记录已失效，请重新打开菜单。");return}
            var target=destination?.appendingPathComponent(url.lastPathComponent)
            if operation=="rename"{
                let alert=NSAlert();alert.messageText="副本改名";let field=NSTextField(string:url.lastPathComponent);field.frame=NSRect(x:0,y:0,width:300,height:24);alert.accessoryView=field;alert.addButton(withTitle:"确定");alert.addButton(withTitle:"取消");guard alert.runModal() == .alertFirstButtonReturn else{return}
                let name=field.stringValue;guard !name.isEmpty,!name.contains("/"),!name.contains("\\"),name != ".",name != ".." else{self.inform("文件名无效。");return};target=url.deletingLastPathComponent().appendingPathComponent(name)
            }
            var request:[String:Any]=["id":id,"operation":operation];if let target{request["destination"]=target.path}
            let generation=self.systemGeneration
            self.action("file-action",request,presentsReply:true){[weak self] reply in
                guard let self,!self.retired,self.systemGeneration==generation else{return}
                guard reply["ok"] as? Bool==true else{self.inform("已完成 \(index)/\(urls.count) 项。\(reply["message"] as? String ?? "操作未确认")");return}
                self.inform(reply["message"] as? String ?? "副本操作已完成。");next(index+1)
            }
        }
        next(0)
    }
    @objc func openWithApplication(_ sender:NSMenuItem){
        guard let value=sender.representedObject as? [String:Any],let app=value["app"] as? URL,let ids=value["ids"] as? [String],let targetRevision=value["revision"] as? Int else{return}
        withSystemFiles(ids,revision:targetRevision){[weak self] urls in
            NSWorkspace.shared.open(urls,withApplicationAt:app,configuration:NSWorkspace.OpenConfiguration()){[weak self] _,error in
                DispatchQueue.main.async{if let error{self?.inform("打开请求未完成：\(error.localizedDescription)，副本保留。")}}
            }
        }
    }
    func sharingServicePicker(_ sharingServicePicker:NSSharingServicePicker,didChoose service:NSSharingService?){
        guard sharingPicker === sharingServicePicker else{return};sharingPicker=nil
        if sharingEscapeTimestamp==nil{sharingEscapeTimestamp=NSApp.currentEvent?.timestamp}
        // AppKit can call this before forwarding the dismissal key, with its
        // currentEvent still pointing to the menu click. Cover that delivery
        // interval as well as repeated dispatch of the exact Escape event.
        if service==nil{sharingDismissalUntil=ProcessInfo.processInfo.systemUptime+0.35}
        if service==nil{inform("已取消系统共享，副本保留。")}else{inform("已交给系统共享界面，请在系统中核对最终发送结果。")}
    }
    func sharingServicePicker(_ sharingServicePicker:NSSharingServicePicker,delegateFor sharingService:NSSharingService)->NSSharingServiceDelegate?{self}
    func sharingService(_ sharingService:NSSharingService,didShareItems items:[Any]){inform("系统已确认共享完成；交付副本保留。")}
    func sharingService(_ sharingService:NSSharingService,didFailToShareItems items:[Any],error:Error){inform("系统共享未完成：\(error.localizedDescription)，副本保留。")}
    func numberOfPreviewItems(in panel:QLPreviewPanel!)->Int{previewURLs.count}
    func previewPanel(_ panel:QLPreviewPanel!,previewItemAt index:Int)->QLPreviewItem!{previewURLs.indices.contains(index) ? previewURLs[index] as NSURL:nil}
}
