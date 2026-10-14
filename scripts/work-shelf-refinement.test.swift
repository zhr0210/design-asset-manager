import AppKit
import QuartzCore
var events:[[String:Any]]=[]
func emit(_ value:[String:Any]){events.append(value)}
@main struct RefinementTests {
 static func main() throws {
  _ = NSApplication.shared
  let directory=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString)
  try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
  defer{try? FileManager.default.removeItem(at:directory)}
  let shelf=NativeWorkShelf(root:directory),area=NSScreen.main!.visibleFrame
  func receivesInput(_ view:NSView)->Bool {
   let point=view.convert(NSPoint(x:view.bounds.midX,y:view.bounds.midY),to:shelf.root.superview)
   let hit=shelf.root.hitTest(point)
   return hit===view || hit?.isDescendant(of:view)==true
  }
  precondition(receivesInput(shelf.back) && receivesInput(shelf.dropdown) && receivesInput(shelf.capsule),"Clear foreground planes must not cover controls in another plane")
  let compact=NSRect(x:area.midX-110,y:floor(area.midY)-120,width:220,height:240)
  shelf.window.setFrame(compact,display:false);shelf.toggleExpanded()
  precondition(shelf.window.standardWindowButton(.zoomButton)?.isHidden != false,"Changing resize chrome must not expose an extra titlebar button")
  precondition(shelf.window.frame==NSRect(x:area.midX-320,y:floor(area.midY)-260,width:640,height:520),"Centered expansion must preserve both center coordinates")
  shelf.toggleExpanded();precondition(shelf.window.frame==compact,"Collapse must restore the exact compact origin")
  for right in [false,true] {
   let c=NSRect(x:right ? area.maxX-225:area.minX+5,y:floor(area.midY)-120,width:220,height:240)
   shelf.window.setFrame(c,display:false);shelf.toggleExpanded()
   precondition(shelf.window.frame.minY==floor(area.midY)-260)
   precondition(right ? shelf.window.frame.maxX==c.maxX:shelf.window.frame.minX==c.minX,"Edge expansion must preserve the corresponding compact edge")
   shelf.toggleExpanded();precondition(shelf.window.frame==c)
  }
  shelf.window.setFrame(compact,display:false);shelf.toggleExpanded()
  let start=shelf.window.convertPoint(toScreen:NSPoint(x:20,y:20)),screenTop=NSScreen.screens.first!.frame.maxY
  func mouse(_ type:CGEventType,_ point:NSPoint)->NSEvent{NSEvent(cgEvent:CGEvent(mouseEventSource:nil,mouseType:type,mouseCursorPosition:CGPoint(x:point.x,y:screenTop-point.y),mouseButton:.left)!)!}
  shelf.root.mouseDown(with:mouse(.leftMouseDown,start));shelf.root.mouseDragged(with:mouse(.leftMouseDragged,NSPoint(x:start.x+50,y:start.y-20)));shelf.root.mouseUp(with:mouse(.leftMouseUp,NSPoint(x:start.x+50,y:start.y-20)))
  shelf.toggleExpanded();precondition(shelf.window.frame==compact.offsetBy(dx:50,dy:-20),"An owned expanded drag translates the compact relation")
  let top=NSRect(x:area.midX-110,y:area.maxY-245,width:220,height:240)
  shelf.window.setFrame(top,display:false);shelf.toggleExpanded();precondition(area.contains(shelf.window.frame))
  shelf.toggleExpanded();precondition(shelf.window.frame==top,"Screen clamping must not become a user move")
  // Restored expanded layouts carry the original compact relation, including
  // vertical clamp, through the same command used by the owned Host pipe.
  shelf.window.setFrame(top,display:false);shelf.toggleExpanded()
  let saved=try JSONSerialization.jsonObject(with:JSONSerialization.data(withJSONObject:shelf.interaction.frameRecord(shelf.window.frame))) as! [String:Any]
  let reopened=NativeWorkShelf(root:directory)
  try reopened.command(["op":"bounds","motionId":1,"presentation":"expanded","x":saved["x"]!,"y":saved["y"]!,"width":640.0,"height":520.0,"expansion":saved["expansion"]!])
  reopened.toggleExpanded();precondition(reopened.window.frame==top);reopened.retire();shelf.toggleExpanded()
  NSApp.setActivationPolicy(.accessory)
  shelf.window.orderFrontRegardless();shelf.window.setFrame(compact,display:true)
  func opacity(_ view:NSView)->CGFloat {var value:CGFloat=1;var current:NSView?=view;while let v=current{value *= CGFloat(v.layer?.presentation()?.opacity ?? Float(v.alphaValue));current=v.superview};return value}
  shelf.toggleExpanded()
  precondition(!receivesInput(shelf.scroll) && !receivesInput(shelf.back),"An invisible incoming plane cannot accept a click")
  precondition(opacity(shelf.scroll)==0 && opacity(shelf.back)==0,"Incoming body and top controls must wait for their approved stages")
  RunLoop.current.run(until:Date().addingTimeInterval(0.1));precondition(opacity(shelf.scroll)==0)
  RunLoop.current.run(until:Date().addingTimeInterval(0.14));precondition(opacity(shelf.back)>0 && opacity(shelf.scroll)>0);precondition(receivesInput(shelf.back) && receivesInput(shelf.scroll),"Visible fading controls are usable before the complete transition")
  shelf.note.string="draft during animation";shelf.toggleExpanded()
  RunLoop.current.run(until:Date().addingTimeInterval(0.55))
  precondition(!shelf.expanded && shelf.window.frame==compact && shelf.note.string=="draft during animation")
  precondition(opacity(shelf.capsule)==1 && opacity(shelf.back)==1,"Canceled expand callbacks must not replace the compact final state")
  shelf.toggleExpanded();RunLoop.current.run(until:Date().addingTimeInterval(0.03));shelf.toggleExpanded()
  RunLoop.current.run(until:Date().addingTimeInterval(0.03));shelf.toggleExpanded()
  RunLoop.current.run(until:Date().addingTimeInterval(0.55));shelf.toggleExpanded()
  RunLoop.current.run(until:Date().addingTimeInterval(0.3))
  precondition(shelf.window.frame==compact,"Rapid direction reversal must retain the 220×240 compact relation")
  shelf.toggleExpanded();RunLoop.current.run(until:Date().addingTimeInterval(0.02))
  let clickStart=shelf.window.convertPoint(toScreen:NSPoint(x:20,y:20))
  shelf.root.mouseDown(with:mouse(.leftMouseDown,clickStart))
  // Controlled OS geometry represents a frame interrupted before reaching its
  // target; the production press/release methods must settle the valid size.
  shelf.window.setFrame(NSRect(x:compact.midX-210,y:compact.midY-190,width:420,height:380),display:true)
  RunLoop.current.run(until:Date().addingTimeInterval(0.18))
  precondition(shelf.noteScroll.frame.width==604,"Holding a press must preserve the fixed foreground layout while the frame is interrupted")
  shelf.root.mouseUp(with:mouse(.leftMouseUp,clickStart))
  RunLoop.current.run(until:Date().addingTimeInterval(0.3))
  precondition(shelf.window.frame.size==NSSize(width:640,height:520),"A focus click during expansion must not leave an intermediate window size")
  shelf.toggleExpanded();RunLoop.current.run(until:Date().addingTimeInterval(0.3));shelf.toggleExpanded()
  try shelf.command(["op":"freeze","value":true,"requestId":"close-fixture"])
  let frozenFrame=shelf.window.frame
  precondition(frozenFrame.size==NSSize(width:640,height:520) && shelf.note.string=="draft during animation")
  RunLoop.current.run(until:Date().addingTimeInterval(0.55));precondition(shelf.window.frame==frozenFrame)
  try shelf.command(["op":"freeze","value":false,"requestId":"resume-fixture"])
  shelf.toggleExpanded();try shelf.command(["op":"hide"])
  RunLoop.current.run(until:Date().addingTimeInterval(0.55));precondition(shelf.window.frame==compact && !shelf.window.isVisible)
  let card=WorkShelfCard(frame:NSRect(x:0,y:0,width:180,height:190))
  let item=WorkShelfItem(id:"asset",name:"public.png",type:"png",dimensions:"800×800",available:true,imageKey:"public",image:nil)
  card.update(item,selected:false);card.layoutSubtreeIfNeeded();card.update(item,selected:true)
  guard let background=card.layer?.sublayers?.first(where:{$0.name=="selection-background"}) else{fatalError("Selection needs an independent background; foreground must not fade")}
  precondition(background.opacity==1 && card.picture.alphaValue==1 && card.caption.alphaValue==1)
  guard let fade=background.animation(forKey:"selection-opacity") as? CABasicAnimation else{fatalError("Selection background must fade rather than jump")}
  precondition(fade.duration==0.16 && (fade.toValue as? Float)==1)
  card.update(item,selected:false)
  precondition((background.animation(forKey:"selection-opacity") as! CABasicAnimation).fromValue as? Float==0,"A reversal before the first render must not flash a never-displayed selected background")
  card.update(item,selected:true)
  shelf.root.addSubview(card);shelf.window.orderFrontRegardless()
  RunLoop.current.run(until:Date().addingTimeInterval(0.06))
  let visualBeforeReversal=background.presentation()?.opacity ?? background.opacity
  card.update(item,selected:false)
  let reversal=background.animation(forKey:"selection-opacity") as! CABasicAnimation
  precondition(abs((reversal.fromValue as! Float)-visualBeforeReversal)<0.02,"Rapid reversal continues from the current visible opacity")
  precondition(background.opacity==0 && card.accessibilityValue() as? String=="未选择")
  precondition((background.animation(forKey:"selection-opacity") as? CABasicAnimation)?.toValue as? Float==0)
  card.update(WorkShelfItem(id:"other",name:"other.png",type:"png",dimensions:"800×800",available:true,imageKey:"other",image:nil),selected:false)
  precondition(background.animation(forKey:"selection-opacity")==nil,"Reusing a card must not animate the previous asset's selection")
  shelf.retire();print("PASS native refinement: centered/symmetric edge expansion, no-move restoration, screen clamping, translated/reopened relation, staged crossfade interruption/draft retention, background-only 160ms selection and reuse")
 }
}
