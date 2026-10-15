import AppKit
import QuartzCore
var events:[[String:Any]]=[]
func emit(_ value:[String:Any]){events.append(value)}
@main struct AlignmentTests {
 static func main() throws {
  _ = NSApplication.shared;NSApp.setActivationPolicy(.accessory)
  let root=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString);try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true);defer{try? FileManager.default.removeItem(at:root)}
  let shelf=NativeWorkShelf(root:root),area=NSScreen.main!.visibleFrame
  let compact=NSRect(x:area.midX-110,y:floor(area.midY)-120,width:220,height:240);shelf.window.setFrame(compact,display:false)
  func publish(_ count:Int,name:String="Public test")throws{try shelf.command(["op":"publish","name":name,"revision":1,"items":(0..<count).map{["id":"asset:\($0)","fileName":"public-\($0).png","fileType":"png"]}])}
  try publish(0);precondition(shelf.capsule.isHidden)
  try publish(1);precondition(!shelf.capsule.isHidden && shelf.capsule.frame.height==28)
  shelf.toggleExpanded();precondition(shelf.window.frame.size==NSSize(width:400,height:207));precondition(!shelf.window.styleMask.contains(.resizable))
  for (count,height) in [(3,310.0),(5,310.0),(7,435.0),(1,207.0),(0,207.0)]{try publish(count);precondition(shelf.window.frame.size==NSSize(width:400,height:height));precondition(abs(shelf.window.frame.midX-compact.midX)<=0.5 && abs(shelf.window.frame.midY-compact.midY)<=0.5)}
  let escape=NSEvent.keyEvent(with:.keyDown,location:.zero,modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:shelf.window.windowNumber,context:nil,characters:"\u{1b}",charactersIgnoringModifiers:"\u{1b}",isARepeat:false,keyCode:53)!
  let sharing=NSSharingServicePicker(items:[root.appendingPathComponent("public.png")]);shelf.sharingPicker=sharing
  _ = shelf.key(escape);precondition(shelf.expanded,"Escape from the system share picker must not collapse its shelf")
  shelf.sharingServicePicker(sharing,didChoose:nil);precondition(shelf.retry.isHidden,"Sharing cancellation is not an autosave failure")
  _ = shelf.key(escape);precondition(shelf.expanded,"The same dismissal event must not reach the underlying presentation")
  let nextSharing=NSSharingServicePicker(items:[root.appendingPathComponent("public.png")]);shelf.sharingEscapeTimestamp=nil;shelf.sharingPicker=nextSharing
  shelf.sharingServicePicker(nextSharing,didChoose:nil)
  let forwardedEscape=NSEvent.keyEvent(with:.keyDown,location:.zero,modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:shelf.window.windowNumber,context:nil,characters:"\u{1b}",charactersIgnoringModifiers:"\u{1b}",isARepeat:false,keyCode:53)!
  _ = shelf.key(forwardedEscape);precondition(shelf.expanded,"AppKit may dismiss its picker before forwarding Escape to the shelf")
  RunLoop.current.run(until:Date().addingTimeInterval(0.35))
  shelf.toggleExpanded();precondition(shelf.window.frame==compact)
  try shelf.command(["op":"metadata","indicatorColor":"#AABBCC","alwaysShowIndicator":true,"currentSpaceOnly":true]);precondition(!shelf.indicator.isHidden);precondition(!shelf.window.collectionBehavior.contains(.canJoinAllSpaces))
  try shelf.command(["op":"metadata","indicatorColor":NSNull(),"alwaysShowIndicator":false,"currentSpaceOnly":false]);precondition(shelf.indicator.isHidden && shelf.window.collectionBehavior.contains(.canJoinAllSpaces))
  try publish(1,name:"Public long scrolling title for the native capsule and fixed chevron inspection")
  shelf.window.orderFrontRegardless();shelf.layout();RunLoop.current.run(until:Date().addingTimeInterval(0.05))
  precondition(shelf.capsule.accessibilityLabel()?.contains("Public long scrolling title")==true)
  func animatedLayers(_ layer:CALayer)->[CALayer]{[layer].filter{!($0.animationKeys() ?? []).isEmpty}+((layer.sublayers ?? []).flatMap{animatedLayers($0)})}
  if !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion{precondition(!animatedLayers(shelf.capsule.layer!).isEmpty);RunLoop.current.run(until:Date().addingTimeInterval(4.0));precondition(animatedLayers(shelf.capsule.layer!).contains{abs($0.presentation()?.transform.m41 ?? 0)>0})}
  try shelf.command(["op":"hide"]);precondition(animatedLayers(shelf.capsule.layer!).isEmpty)
  let canvas=WorkShelfAnnotationCanvas(frame:NSRect(x:0,y:0,width:200,height:200));canvas.image=NSImage(size:NSSize(width:80,height:40));let shape=canvas.makeMark(NSPoint(x:20,y:60),NSPoint(x:100,y:100))!;precondition(shape["kind"] as? String=="redact");precondition((shape["x"] as! Double)>=0 && (shape["y"] as! Double)>=0)
  canvas.smart=true;canvas.recognized=[["kind":"redact","x":0.1,"y":0.1,"width":0.5,"height":0.1,"color":"#000000","ocrIndex":0,"text":"PUBLIC 9"]]
  let regions=canvas.accessibilityChildren() ?? [];precondition(regions.count==1,"Recognized text regions must be operable through native accessibility")
  let region=regions[0] as! NSAccessibilityElement;precondition(region.isAccessibilityElement() && region.isAccessibilityEnabled() && region === (canvas.accessibilityChildren()![0] as! NSAccessibilityElement),"Virtual regions must retain stable enabled accessible objects while visible");precondition(region.accessibilityPerformPress() && canvas.marks.count==1);precondition(region.accessibilityPerformPress() && canvas.marks.isEmpty);canvas.undo();precondition(canvas.marks.count==1)
  let markCanvas=WorkShelfAnnotationCanvas(frame:NSRect(x:0,y:0,width:300,height:250));markCanvas.image=NSImage(size:NSSize(width:80,height:40));shelf.root.addSubview(markCanvas)
  func mouse(_ type:NSEvent.EventType,_ point:NSPoint)->NSEvent{NSEvent.mouseEvent(with:type,location:markCanvas.convert(point,to:nil),modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:shelf.window.windowNumber,context:nil,eventNumber:1,clickCount:1,pressure:1)!}
  markCanvas.mouseDown(with:mouse(.leftMouseDown,NSPoint(x:40,y:80)));markCanvas.mouseDragged(with:mouse(.leftMouseDragged,NSPoint(x:110,y:110)));markCanvas.mouseUp(with:mouse(.leftMouseUp,NSPoint(x:110,y:110)));precondition(markCanvas.marks.count==1)
  let initial=markCanvas.marks[0]["x"] as! Double,center=NSPoint(x:markCanvas.markFrame(markCanvas.marks[0]).midX,y:markCanvas.markFrame(markCanvas.marks[0]).midY)
  markCanvas.mouseDown(with:mouse(.leftMouseDown,center));markCanvas.mouseDragged(with:mouse(.leftMouseDragged,NSPoint(x:center.x+20,y:center.y)));markCanvas.mouseUp(with:mouse(.leftMouseUp,NSPoint(x:center.x+20,y:center.y)));precondition((markCanvas.marks[0]["x"] as! Double)>initial);markCanvas.undo();precondition(markCanvas.marks[0]["x"] as! Double==initial);markCanvas.undo();precondition(markCanvas.marks.isEmpty)
  shelf.retire();print("PASS actual AppKit count changes including empty, centered compact relation, no resize chrome, independent indicator/Space settings, overflow animation/hide cancellation and bounded manual annotation. Controlled native path; formal UI separate.")
 }
}
