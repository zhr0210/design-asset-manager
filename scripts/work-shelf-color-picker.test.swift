import AppKit
import QuartzCore
var pickerEvents:[[String:Any]]=[]
func emit(_ value:[String:Any]){pickerEvents.append(value)}
@main struct PickerTests {
 static func main() throws {
  _ = NSApplication.shared
  for hex in ["#000000","#FFFFFF","#FF0000","#00FF00","#0000FF","#6040FF","#342342","#4A9DAB"]{let value=WorkShelfColorSelection(hex:hex);precondition(value.hex==hex,"Opaque RGB round trip: \(hex), \(value.hex)");precondition(value.color.alphaComponent==1)}
  var commits:[String]=[]
  let picker=WorkShelfColorPicker(initial:"#6040FF",existing:[]);_ = picker.view;picker.added={commits.append($0)}
  picker.area.choose(.zero);precondition(picker.selection.hex=="#FFFFFF");picker.area.choose(NSPoint(x:picker.area.bounds.width,y:picker.area.bounds.height));precondition(picker.selection.hex=="#000000");picker.area.choose(NSPoint(x:picker.area.bounds.width,y:0))
  let panel=NSPanel(contentRect:NSRect(x:400,y:200,width:280,height:356),styleMask:[.titled],backing:.buffered,defer:false);panel.contentView=picker.view;panel.orderFrontRegardless()
  let location=picker.area.convert(NSPoint(x:124,y:124),to:nil)
  let down=NSEvent.mouseEvent(with:.leftMouseDown,location:location,modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:panel.windowNumber,context:nil,eventNumber:1,clickCount:1,pressure:1)!
  panel.sendEvent(down);precondition(abs(picker.selection.saturation-0.5)<0.01 && abs(picker.selection.brightness-0.5)<0.01,"AppKit dispatch reaches color area")
  let drag=NSEvent.mouseEvent(with:.leftMouseDragged,location:picker.area.convert(NSPoint(x:248,y:0),to:nil),modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:panel.windowNumber,context:nil,eventNumber:2,clickCount:1,pressure:1)!;panel.sendEvent(drag);precondition(picker.selection.saturation==1 && picker.selection.brightness==1);panel.close()
  picker.hue.doubleValue=0;picker.hueChanged();precondition(picker.hexLabel.stringValue=="#FF0000");precondition(commits.isEmpty,"Preview must not save")
  picker.confirmSelection();picker.confirmSelection();precondition(commits==["#FF0000"],"One confirmation, one commit")
  let canceled=WorkShelfColorPicker(initial:"#00FF00",existing:[]);_ = canceled.view;canceled.added={commits.append($0)};canceled.cancelSelection();canceled.confirmSelection();precondition(commits.count==1,"Canceled selection cannot commit late")
  let outside=WorkShelfColorPicker(initial:"#00FF00",existing:[]);_ = outside.view;outside.added={commits.append($0)};outside.retireDraft();outside.confirmSelection();precondition(commits.count==1)
  let duplicate=WorkShelfColorPicker(initial:"#FF0000",existing:["#ff0000"]);_ = duplicate.view;duplicate.added={commits.append($0)};precondition(!duplicate.confirm.isEnabled);duplicate.confirmSelection();precondition(commits.count==1)
  let root=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString);try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true);defer{try? FileManager.default.removeItem(at:root)}
  let shelf=NativeWorkShelf(root:root);shelf.expanded=true;shelf.layout();precondition(shelf.indicatorColor==nil)
  // Exercise the production popover's own window, rather than only a standalone NSPanel.
  try shelf.command(["op":"bounds","motionId":1,"presentation":"expanded","x":100.0,"y":100.0,"width":640.0,"height":520.0])
  shelf.window.orderFrontRegardless();shelf.chooseIndicatorColor()
  guard let nativePicker=shelf.colorPicker?.contentViewController as? WorkShelfColorPicker,let pickerWindow=nativePicker.view.window else{fatalError("Production color popover not shown")}
  let nativeDown=NSEvent.mouseEvent(with:.leftMouseDown,location:nativePicker.area.convert(NSPoint(x:124,y:124),to:nil),modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:pickerWindow.windowNumber,context:nil,eventNumber:3,clickCount:1,pressure:1)!
  pickerWindow.sendEvent(nativeDown)
  precondition(abs(nativePicker.selection.saturation-0.5)<0.01 && abs(nativePicker.selection.brightness-0.5)<0.01,"Production popover routes its window's pointer to the color area")
  let nativeDrag=NSEvent.mouseEvent(with:.leftMouseDragged,location:nativePicker.area.convert(NSPoint(x:248,y:0),to:nil),modifierFlags:[],timestamp:ProcessInfo.processInfo.systemUptime,windowNumber:pickerWindow.windowNumber,context:nil,eventNumber:4,clickCount:1,pressure:1)!
  pickerWindow.sendEvent(nativeDrag);precondition(nativePicker.selection.saturation==1 && nativePicker.selection.brightness==1)
  nativePicker.cancelSelection();shelf.colorPicker?.close()
  shelf.expanded=false;shelf.layout();precondition(shelf.indicatorColor==nil)
  let pop=NSPopover(),late=WorkShelfColorPicker(initial:"#00FF00",existing:[]);_ = late.view;late.added={commits.append($0)};pop.contentViewController=late;shelf.colorPicker=pop
  shelf.popoverWillClose(Notification(name:NSPopover.willCloseNotification,object:pop));late.confirmSelection();precondition(commits.count==1,"Closing float rejects queued confirmation immediately")
  let pendingPop=NSPopover(),pendingPicker=WorkShelfColorPicker(initial:"#00FF00",existing:[]);_ = pendingPicker.view;pendingPicker.added={commits.append($0)};pendingPop.contentViewController=pendingPicker;shelf.colorPicker=pendingPop
  try shelf.command(["op":"freeze","requestId":"freeze-color","value":true])
  try shelf.command(["op":"freeze","requestId":"unfreeze-color","value":false])
  pendingPicker.confirmSelection();precondition(commits.count==1,"Freeze must retire the color draft even when the popover's close notification is unavailable")
  shelf.retire()
  print("PASS production native color picker: opaque RGB round-trip, HSV area/hue controls, preview without commit, exact HEX display, single confirmation, canceled/duplicate refusal, independent window indicator selection. AppKit controls; physical UI path separately required.")
 }
}
