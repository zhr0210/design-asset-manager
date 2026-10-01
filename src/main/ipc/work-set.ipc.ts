import type {IpcMainInvokeEvent} from 'electron'
import * as C from '../../shared/contracts/work-set.contract'
import type {createWorkWindowController} from '../work-mode/work-window-controller'
import type {MainIpcHandleRegistrar} from './ipc-registrar'
export function registerWorkSetIpc(input:{controller:ReturnType<typeof createWorkWindowController>;isMain:(event:IpcMainInvokeEvent)=>boolean;handle:MainIpcHandleRegistrar}){
 const denied={success:false,error:'当前窗口没有此操作权限。',code:'UNTRUSTED_SENDER'}
 for(const [channel,operation]of [[C.WORK_SET_READ,input.controller.read],[C.WORK_SET_WRITE,input.controller.write],[C.WORK_WINDOW_OPEN,input.controller.open],[C.WORK_WINDOW_RESTORE,input.controller.restore],[C.WORK_WINDOW_RECOVER,input.controller.recover],[C.WORK_WINDOW_HIDE_MAIN,input.controller.hideMain]] as const)input.handle(channel,(event,request)=>input.isMain(event)?operation(request):denied)
 input.handle(C.WORK_WINDOW_INSPECT,event=>input.controller.inspect(event))
 input.handle(C.WORK_WINDOW_ACTION,(event,request)=>input.controller.act(event,request))
 input.handle(C.WORK_WINDOW_NOTE_READ,(event,request)=>input.controller.notebookRead(event,request))
 input.handle(C.WORK_WINDOW_NOTE_SAVE,(event,request)=>input.controller.notebookSave(event,request))
}
