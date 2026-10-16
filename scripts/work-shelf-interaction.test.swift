import AppKit
import QuartzCore
var events:[[String:Any]]=[]
func emit(_ v:[String:Any]){events.append(v)}
@main struct InteractionTests {
 static func main() throws {
  let screen=NSRect(x:0,y:0,width:1200,height:900),f=NSRect(x:20,y:60,width:290,height:310)
  for (input,expected) in [(0.0,0.3),(1,0.6),(1.499,0.6),(1.5,0.45),(1.999,0.45),(2,0.35),(2.999,0.35),(3,0.3),(-1,0.6)]{precondition(shelfDockDuration(input)==expected)}
  for (edge,direction) in [("left",-1.0),("right",1.0)]{
   for p in [0.0,0.2,0.4,0.401,1,1.2]{
    let rect=NSRect(x:edge=="left" ? -500*0.84*p:1200-500+500*0.84*p,y:60,width:500,height:310)
    let zero=shelfEdgeDecision(rect,screen:screen,others:[],deltaX:0)!,out=shelfEdgeDecision(rect,screen:screen,others:[],deltaX:direction)!
    precondition(zero.edge==edge && abs(zero.progress-min(1,p))<1e-9)
    precondition(zero.docks == (p>0.4));precondition(out.docks == (p>0))
    precondition(out.target.size==rect.size)
   }
  }
  precondition(shelfEdgeDecision(f,screen:screen,others:[NSRect(x:-1200,y:0,width:1200,height:900)],deltaX:-1)==nil)
  let _=NSApplication.shared
  let root=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString);try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true);defer{try? FileManager.default.removeItem(at:root)}
  let shelf=NativeWorkShelf(root:root);shelf.window.setFrame(f,display:false)
  events=[];precondition(shelf.interaction.doubleClickDock(NSPoint(x:110,y:12)))
  precondition(events.contains{$0["event"] as? String=="dockIntent" && $0["deltaX"] as? Double==0})
  events=[];precondition(!shelf.interaction.doubleClickDock(NSPoint(x:110,y:27)) && events.isEmpty)
  shelf.expanded=true;precondition(!shelf.interaction.doubleClickDock(NSPoint(x:110,y:12)));shelf.expanded=false
  shelf.interaction.feedback(true,edge:"left",animated:false)
  RunLoop.current.run(until:Date().addingTimeInterval(0.05))
  precondition(shelf.back.isHidden && shelf.dropdown.isHidden && !shelf.back.isEnabled,"Covered buttons leave the visible/accessibility surface")
  shelf.layout();precondition(shelf.back.isHidden && shelf.dropdown.isHidden,"Layout refresh cannot revive covered controls")
  shelf.interaction.feedback(false,animated:false)
  RunLoop.current.run(until:Date().addingTimeInterval(0.05))
  precondition(!shelf.back.isHidden && shelf.back.isEnabled && shelf.back.alphaValue==1,"Restoring feedback returns controls")
  shelf.docked=true;events=[]
  let coveredDelete=NSEvent.keyEvent(with:.keyDown,location:.zero,modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:shelf.window.windowNumber,context:nil,characters:"\u{7f}",charactersIgnoringModifiers:"\u{7f}",isARepeat:false,keyCode:51)!
  shelf.selected=["covered-reference"];_ = shelf.key(coveredDelete)
  precondition(!events.contains{$0["kind"] as? String=="edit"},"Docked content cannot accept a destructive keyboard action")
  shelf.selected=[];shelf.docked=false
  shelf.expanded=true;shelf.moving=true;shelf.dragMoved=true;events=[];shelf.completeUserTracking();precondition(!events.contains{$0["event"] as? String=="dockIntent"})
  shelf.expanded=false;shelf.assetDragging=true;shelf.moving=true;shelf.dragMoved=true;events=[];shelf.completeUserTracking();precondition(!events.contains{$0["event"] as? String=="dockIntent"});shelf.assetDragging=false
  // Production transition completion/geometry and old-token cancellation, no copied animation implementation.
  shelf.interaction.animate(f.offsetBy(dx:30,dy:0),duration:0,docking:false,id:4);RunLoop.current.run(until:Date().addingTimeInterval(0.05))
  precondition(events.contains{$0["event"] as? String=="motionAck" && $0["status"] as? String=="completed" && $0["motionId"] as? Int==4})
  events=[];shelf.expanded=true;try shelf.command(["op":"bounds","motionId":6,"gestureId":shelf.interaction.gestureId,"presentation":"expanded","docked":true,"x":0.0,"y":50.0,"width":640.0,"height":520.0]);precondition(events.contains{$0["motionId"] as? Int==6 && $0["status"] as? String=="failed"});shelf.expanded=false
  shelf.window.orderFrontRegardless();events=[]
  shelf.interaction.animate(f.offsetBy(dx:200,dy:0),duration:1,docking:false,id:5)
  RunLoop.current.run(until:Date().addingTimeInterval(0.1));let displayed=shelf.interaction.actualFrame();shelf.interruptTransition()
  precondition(abs(shelf.window.frame.minX-displayed.minX)<1)
  precondition(events.contains{$0["motionId"] as? Int==5 && $0["status"] as? String=="canceled"})
  let manual=f.offsetBy(dx:80,dy:20);shelf.window.setFrame(manual,display:false)
  RunLoop.current.run(until:Date().addingTimeInterval(1.1));precondition(shelf.window.frame==manual)
  // Real production event methods with owned CGEvents, separately labeled from physical CU.
  let area=shelf.bestScreen(f).frame,top=NSScreen.screens.first!.frame.maxY,start=NSPoint(x:area.minX+150,y:area.minY+200)
  shelf.window.setFrame(NSRect(x:area.minX+40,y:area.minY+50,width:290,height:310),display:false)
  func event(_ type:CGEventType,_ x:CGFloat)->NSEvent{NSEvent(cgEvent:CGEvent(mouseEventSource:nil,mouseType:type,mouseCursorPosition:CGPoint(x:x,y:top-start.y),mouseButton:.left)!)!}
  events=[];shelf.root.mouseDown(with:event(.leftMouseDown,start.x));shelf.root.mouseDragged(with:event(.leftMouseDragged,start.x-200));shelf.root.mouseUp(with:event(.leftMouseUp,start.x-200))
  precondition(events.contains{$0["event"] as? String=="dockIntent" && $0["edge"] as? String=="left"})
  shelf.expanded=true
  let workArea=shelf.bestScreen(f).visibleFrame
  shelf.window.setFrame(NSRect(x:workArea.minX+40,y:workArea.minY+40,width:640,height:520),display:false)
  events=[];shelf.root.mouseDown(with:event(.leftMouseDown,start.x));shelf.root.mouseDragged(with:event(.leftMouseDragged,workArea.maxX+1000));shelf.root.mouseUp(with:event(.leftMouseUp,workArea.maxX+1000))
  precondition(workArea.contains(shelf.window.frame) && shelf.expanded,"Expanded window stays reachable when dragged past the display edge")
  precondition(!events.contains{$0["event"] as? String=="dockIntent"})
  shelf.retire();print("PASS production AppKit interaction: proportional symmetric progress, strict .4/raw-delta duration boundaries, adjacent-screen rejection, expanded/asset-drag refusal and visible expanded bounds, completed/canceled receipts, actual-frame interruption and stale completion protection, owned mouse event path. Controlled AppKit inputs; physical CU separate.")
 }
}
