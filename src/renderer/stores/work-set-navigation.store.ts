import {create} from 'zustand'
import type {WorkScope} from '../../shared/contracts/work-set.contract'
interface WorkNavigation {request:(WorkScope & {setId:string;assetId?:string})|null;receive:(request:NonNullable<WorkNavigation['request']>)=>void;clear:()=>void}
export const useWorkSetNavigation=create<WorkNavigation>(set=>({request:null,receive:request=>set({request}),clear:()=>set({request:null})}))
