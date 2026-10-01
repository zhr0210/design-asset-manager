import React,{useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {appPath} from '../../../shared/workflows/app-navigation.workflow'
import {AUTH_STAGE_LABELS} from '../../../shared/contracts/ai-auth-state'
import type {AiLoginStatus} from '../../../shared/contracts/ai-connection.contract'
/** Main owns attempts. This surface only polls a secret-free activity projection. */
export default function AuthActivity(){
 const [operations,setOperations]=useState<AiLoginStatus[]>([])
 useEffect(()=>{let alive=true,timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const items=await(window as any).electronAPI.aiConnections.activeLogins();if(alive)setOperations(items)}catch{if(alive)setOperations([])}if(alive)timer=setTimeout(poll,750)};void poll();return()=>{alive=false;clearTimeout(timer)}},[])
 if(!operations.length)return null
 return <aside className="auth-activity" aria-label="账号连接进度">{operations.map(op=><div key={op.id}><span>{op.state==='unknown'?'账号进程退出尚未确认':op.stage?AUTH_STAGE_LABELS[op.stage]:'账号连接进行中'}</span><Link to={appPath('ai-console')} state={{connectionRef:op.backendId}}>查看账号连接</Link></div>)}</aside>
}
