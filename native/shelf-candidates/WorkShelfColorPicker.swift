import AppKit

struct WorkShelfColorSelection {
    var hue:CGFloat
    var saturation:CGFloat
    var brightness:CGFloat
    init(hex:String) {
        let rgb=UInt32(hex.trimmingCharacters(in:CharacterSet(charactersIn:"#")),radix:16) ?? 0x6040FF
        let color=NSColor(srgbRed:CGFloat((rgb>>16)&255)/255,green:CGFloat((rgb>>8)&255)/255,blue:CGFloat(rgb&255)/255,alpha:1)
        var h:CGFloat=0,s:CGFloat=0,b:CGFloat=0,a:CGFloat=0
        color.getHue(&h,saturation:&s,brightness:&b,alpha:&a)
        hue=h;saturation=s;brightness=b
    }
    var color:NSColor {
        let h=min(1,max(0,hue))*6,s=min(1,max(0,saturation)),v=min(1,max(0,brightness))
        let c=v*s,x=c*(1-abs(h.truncatingRemainder(dividingBy:2)-1)),m=v-c
        let rgb:(CGFloat,CGFloat,CGFloat)
        switch Int(h)%6{case 0:rgb=(c,x,0);case 1:rgb=(x,c,0);case 2:rgb=(0,c,x);case 3:rgb=(0,x,c);case 4:rgb=(x,0,c);default:rgb=(c,0,x)}
        return NSColor(srgbRed:rgb.0+m,green:rgb.1+m,blue:rgb.2+m,alpha:1)
    }
    var hex:String {let rgb=color.usingColorSpace(.sRGB)!;return String(format:"#%02X%02X%02X",Int((rgb.redComponent*255).rounded()),Int((rgb.greenComponent*255).rounded()),Int((rgb.blueComponent*255).rounded()))}
}

final class WorkShelfColorArea:NSView {
    var selection=WorkShelfColorSelection(hex:"#6040FF")
    var changed:((WorkShelfColorSelection)->Void)?
    override var isFlipped:Bool{true}
    override var acceptsFirstResponder:Bool{true}
    override func acceptsFirstMouse(for event:NSEvent?)->Bool{true}
    override func draw(_ dirtyRect:NSRect) {
        NSGraphicsContext.saveGraphicsState();defer{NSGraphicsContext.restoreGraphicsState()}
        NSBezierPath(roundedRect:bounds,xRadius:8,yRadius:8).addClip()
        WorkShelfColorSelection(hue:selection.hue,saturation:1,brightness:1).color.setFill();bounds.fill()
        guard let context=NSGraphicsContext.current?.cgContext else{return}
        let space=CGColorSpaceCreateDeviceRGB()
        if let white=CGGradient(colorsSpace:space,colors:[NSColor.white.cgColor,NSColor.white.withAlphaComponent(0).cgColor] as CFArray,locations:[0,1]){context.drawLinearGradient(white,start:.zero,end:CGPoint(x:bounds.width,y:0),options:[])}
        if let black=CGGradient(colorsSpace:space,colors:[NSColor.black.withAlphaComponent(0).cgColor,NSColor.black.cgColor] as CFArray,locations:[0,1]){context.drawLinearGradient(black,start:.zero,end:CGPoint(x:0,y:bounds.height),options:[])}
        let center=NSPoint(x:selection.saturation*bounds.width,y:(1-selection.brightness)*bounds.height)
        let ring=NSBezierPath(ovalIn:NSRect(x:center.x-6,y:center.y-6,width:12,height:12))
        NSColor.black.withAlphaComponent(0.5).setStroke();ring.lineWidth=4;ring.stroke()
        NSColor.white.setStroke();ring.lineWidth=2;ring.stroke()
    }
    func choose(_ point:NSPoint) {
        selection.saturation=min(1,max(0,point.x/max(1,bounds.width)))
        selection.brightness=1-min(1,max(0,point.y/max(1,bounds.height)))
        needsDisplay=true;changed?(selection)
    }
    override func mouseDown(with event:NSEvent){window?.makeFirstResponder(self);choose(convert(event.locationInWindow,from:nil))}
    override func mouseDragged(with event:NSEvent){choose(convert(event.locationInWindow,from:nil))}
    override func keyDown(with event:NSEvent) {
        switch event.keyCode {case 123:selection.saturation=max(0,selection.saturation-0.02);case 124:selection.saturation=min(1,selection.saturation+0.02);case 125:selection.brightness=max(0,selection.brightness-0.02);case 126:selection.brightness=min(1,selection.brightness+0.02);default:super.keyDown(with:event);return}
        needsDisplay=true;changed?(selection)
    }
    override func isAccessibilityElement()->Bool{true}
    override func accessibilityRole()->NSAccessibility.Role?{.slider}
    override func accessibilityLabel()->String?{"选择颜色；左右调整饱和度，上下调整明度"}
    override func accessibilityValue()->Any?{selection.hex}
    override func accessibilityPerformIncrement()->Bool{selection.saturation=min(1,selection.saturation+0.02);needsDisplay=true;changed?(selection);return true}
    override func accessibilityPerformDecrement()->Bool{selection.saturation=max(0,selection.saturation-0.02);needsDisplay=true;changed?(selection);return true}
}

extension WorkShelfColorSelection {
    init(hue:CGFloat,saturation:CGFloat,brightness:CGFloat){self.hue=hue;self.saturation=saturation;self.brightness=brightness}
}

final class WorkShelfHueSliderCell:NSSliderCell {
    override func drawBar(inside rect:NSRect,flipped:Bool) {
        let bar=NSRect(x:rect.minX,y:rect.midY-5,width:rect.width,height:10)
        let path=NSBezierPath(roundedRect:bar,xRadius:5,yRadius:5)
        let colors=(0...6).map{WorkShelfColorSelection(hue:CGFloat($0)/6,saturation:1,brightness:1).color}
        NSGradient(colors:colors)?.draw(in:path,angle:0)
    }
}

/** A local opaque-color draft. Only Confirm calls the existing Host edit path. */
final class WorkShelfColorPicker:NSViewController {
    let area=WorkShelfColorArea()
    let hue=NSSlider(value:0,minValue:0,maxValue:1,target:nil,action:nil)
    let hexLabel=NSTextField(labelWithString:"")
    let preview=NSView()
    let confirm=NSButton(title:"添加",target:nil,action:nil)
    let cancel=NSButton(title:"取消",target:nil,action:nil)
    let message=NSTextField(labelWithString:"")
    var selection:WorkShelfColorSelection
    var existing:Set<String>
    private(set) var finished=false
    var added:((String)->Void)?
    var dismissed:(()->Void)?
    init(initial:String,existing:[String]){selection=WorkShelfColorSelection(hex:initial);self.existing=Set(existing.map{$0.uppercased()});super.init(nibName:nil,bundle:nil)}
    required init?(coder:NSCoder){nil}
    override func loadView() {
        view=NSView(frame:NSRect(x:0,y:0,width:280,height:356))
        area.frame=NSRect(x:16,y:92,width:248,height:248);area.selection=selection;area.setAccessibilityIdentifier("work-color-area")
        hue.cell=WorkShelfHueSliderCell();hue.minValue=0;hue.maxValue=1;hue.isContinuous=true;hue.frame=NSRect(x:16,y:58,width:248,height:24);hue.target=self;hue.action=#selector(hueChanged);hue.setAccessibilityLabel("色相")
        preview.frame=NSRect(x:16,y:34,width:18,height:18);preview.wantsLayer=true;preview.layer?.cornerRadius=4
        hexLabel.frame=NSRect(x:42,y:33,width:100,height:20);hexLabel.font=NSFont.monospacedDigitSystemFont(ofSize:13,weight:.medium);hexLabel.isSelectable=true;hexLabel.setAccessibilityLabel("所选颜色 HEX")
        message.frame=NSRect(x:16,y:7,width:105,height:18);message.font = .systemFont(ofSize:11);message.textColor = .secondaryLabelColor
        cancel.frame=NSRect(x:125,y:4,width:66,height:28);cancel.bezelStyle = .rounded;cancel.target=self;cancel.action=#selector(cancelSelection);cancel.keyEquivalent="\u{1b}"
        confirm.frame=NSRect(x:194,y:4,width:70,height:28);confirm.bezelStyle = .rounded;confirm.target=self;confirm.action=#selector(confirmSelection);confirm.keyEquivalent="\r";confirm.setAccessibilityLabel("添加所选颜色")
        for control in [area,hue,preview,hexLabel,message,cancel,confirm] {view.addSubview(control)}
        area.changed={[weak self] value in self?.selection=value;self?.refresh()}
        refresh()
    }
    func refresh(){area.selection=selection;area.needsDisplay=true;hue.doubleValue=Double(selection.hue);hexLabel.stringValue=selection.hex;preview.layer?.backgroundColor=selection.color.cgColor;let duplicate=existing.contains(selection.hex);confirm.isEnabled = !duplicate;message.stringValue=duplicate ? "颜色已在色板中":""}
    @objc func hueChanged(){selection.hue=CGFloat(hue.doubleValue);refresh()}
    @objc func confirmSelection(){guard !finished,!existing.contains(selection.hex) else{return};finished=true;added?(selection.hex);dismissed?()}
    func retireDraft(){finished=true}
    @objc func cancelSelection(){guard !finished else{return};finished=true;dismissed?()}
}
