import React from 'react'
import{FocusView}from'../../components/gallery/FocusView'
import{loadNotebook,holdNotebook,saveNotebook,notebookDirty}from'./focus-notes'
export function FocusMode(props:Omit<React.ComponentProps<typeof FocusView>,'notebook'>){return <FocusView {...props} notebook={{load:loadNotebook,hold:holdNotebook,save:saveNotebook,dirty:notebookDirty,saveLabel:'笔记已保存到此原型；原图未改变。'}}/>}
