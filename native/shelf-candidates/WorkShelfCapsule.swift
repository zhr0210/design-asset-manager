import AppKit
import QuartzCore

/** Native vibrancy over the window glass, with a stationary chevron and two
 text copies. This is a custom AppKit control, not a claimed NSGlassEffectView. */
final class WorkShelfCapsule:NSButton {
    private let material=NSVisualEffectView()
    private let viewport=CALayer(),textTrack=CALayer(),fade=CAGradientLayer()
    private let highlight=CALayer()
    private let first=CATextLayer(),second=CATextLayer(),chevron=NSImageView()
    private var currentName="",layoutKey=""
    private var active=false
    private var observer:NSObjectProtocol?
    override init(frame:NSRect){
        super.init(frame:frame)
        isBordered=false;title="";wantsLayer=true
        material.material = .hudWindow;material.blendingMode = .withinWindow;material.state = .active
        material.wantsLayer=true;material.layer?.cornerRadius=14;material.layer?.masksToBounds=true
        addSubview(material);material.layer?.addSublayer(highlight);layer?.addSublayer(viewport);viewport.addSublayer(textTrack)
        textTrack.addSublayer(first);textTrack.addSublayer(second)
        fade.startPoint=CGPoint(x:0,y:0.5);fade.endPoint=CGPoint(x:1,y:0.5)
        fade.locations=[0,0.15,0.85,1]
        fade.colors=[NSColor.clear.cgColor,NSColor.white.cgColor,NSColor.white.cgColor,NSColor.clear.cgColor]
        chevron.image=NSImage(systemSymbolName:"chevron.right",accessibilityDescription:nil)
        chevron.imageScaling = .scaleProportionallyDown;chevron.setAccessibilityElement(false);addSubview(chevron)
        for t in [first,second]{t.font=NSFont.systemFont(ofSize:12,weight:.semibold);t.fontSize=12;t.alignmentMode = .left;t.truncationMode = .none}
        observer=NSWorkspace.shared.notificationCenter.addObserver(forName:NSWorkspace.accessibilityDisplayOptionsDidChangeNotification,object:nil,queue:.main){[weak self] _ in self?.layoutKey="";self?.refresh()}
    }
    required init?(coder:NSCoder){nil}
    deinit{if let observer{NSWorkspace.shared.notificationCenter.removeObserver(observer)}}
    override func hitTest(_ point:NSPoint)->NSView?{super.hitTest(point)==nil ? nil:self}
    func configure(name:String,active:Bool){
        currentName=name;self.active=active;toolTip=name;setAccessibilityLabel("展开工作集 \(name)");refresh()
    }
    override func layout(){super.layout();refresh()}
    override func viewDidMoveToWindow(){super.viewDidMoveToWindow();layoutKey="";refresh()}
    override func viewDidChangeEffectiveAppearance(){super.viewDidChangeEffectiveAppearance();layoutKey="";refresh()}
    private func refresh(){
        let dark=effectiveAppearance.bestMatch(from:[.darkAqua,.aqua]) == .darkAqua
        let enabled=active && !isHidden && window?.isVisible==true && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        let key="\(currentName)|\(bounds.width)|\(enabled)|\(dark)"
        guard key != layoutKey else{return};layoutKey=key
        CATransaction.begin();CATransaction.setDisableActions(true);defer{CATransaction.commit()}
        textTrack.removeAllAnimations();textTrack.transform=CATransform3DIdentity
        material.frame=bounds
        material.layer?.backgroundColor=(dark ? NSColor.white.withAlphaComponent(0.1):NSColor.black.withAlphaComponent(0.07)).cgColor
        highlight.frame=material.bounds.insetBy(dx:0.5,dy:0.5);highlight.cornerRadius=13.5;highlight.borderWidth=0.5;highlight.borderColor=NSColor.white.withAlphaComponent(dark ? 0.07:0.1).cgColor
        material.layer?.borderWidth=0.5;material.layer?.borderColor=NSColor.labelColor.withAlphaComponent(0.03).cgColor
        layer?.shadowColor=NSColor.black.cgColor;layer?.shadowOpacity=dark ? 0.1:0;layer?.shadowRadius=4;layer?.shadowOffset=CGSize(width:0,height:-2)
        chevron.frame=NSRect(x:bounds.width-22,y:8,width:10,height:12);chevron.contentTintColor = .labelColor
        viewport.frame=CGRect(x:12,y:6,width:max(1,bounds.width-42),height:16)
        textTrack.frame=viewport.bounds
        let font=NSFont.systemFont(ofSize:12,weight:.semibold)
        let width=ceil((currentName as NSString).size(withAttributes:[.font:font]).width),distance=width+12
        for (index,t) in [first,second].enumerated(){
            t.string=currentName;t.contentsScale=window?.backingScaleFactor ?? 2;t.foregroundColor=NSColor.labelColor.cgColor
            t.frame=CGRect(x:CGFloat(index)*distance,y:0,width:max(width,1),height:16)
        }
        let overflow=width>viewport.bounds.width
        second.isHidden = !overflow;viewport.masksToBounds=true
        fade.frame=viewport.bounds;viewport.mask=overflow ? fade:nil
        guard enabled,overflow else{return}
        let duration=max(10,Double(distance)/20),total=duration+2
        let animation=CAKeyframeAnimation(keyPath:"transform.translation.x")
        animation.values=[0,0,-distance];animation.keyTimes=[0,NSNumber(value:2/total),1]
        animation.timingFunctions=[CAMediaTimingFunction(name:.linear),CAMediaTimingFunction(name:.easeInEaseOut)]
        animation.duration=total;animation.repeatCount = .infinity
        textTrack.add(animation,forKey:"name-marquee")
    }
}
