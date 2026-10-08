import {useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import {getWorkspaceClient} from '../../workspace-client'
export default function WorkspaceConnection() {
  const client=getWorkspaceClient()
  const [state,setState]=useState(client?.connectionState()??{connected:false,reconciling:false})
  useEffect(()=>{
    if(!client)return
    const update=(next:{connected:boolean;reconciling?:boolean})=>setState({connected:next.connected,reconciling:next.reconciling??false})
    const stop=client.onConnectionChanged(update)
    // Initial reconciliation may finish between rendering and subscribing.
    update(client.connectionState())
    return stop
  },[client])
  return state.connected?null:createPortal(<div className="workspace-recovery-banner workspace-connection-banner" role="status" data-workspace-transition-surface>
    {state.reconciling?'正在重新读取本机状态，请等待校准后继续操作。':'本机 DAM 连接已中断。输入仍在此界面；尚未送达的内容未暂存。请重新使用 DAM 浏览器版入口，核对保存结果后继续。'}
  </div>,document.body)
}
