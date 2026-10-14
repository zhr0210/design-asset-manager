import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
if(process.platform!=='darwin'){console.log('SKIP AppKit tests: macOS required');process.exit(0)}
const run=promisify(execFile),directory=await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-tests-'))
const sources=['NativeWorkShelf','WorkShelfInteraction','WorkShelfPresentation','WorkShelfColorPicker','WorkShelfCapsule','WorkShelfSystemActions','WorkShelfOCR','WorkShelfRedaction'].map(name=>`native/shelf-candidates/${name}.swift`)
try{
 for(const name of ['work-shelf-second-alignment','work-shelf-refinement','work-shelf-interaction','native-shelf-drop','work-shelf-color-picker']){
  const binary=path.join(directory,name)
  const compiled=await run('/usr/bin/xcrun',['swiftc','-swift-version','5',...sources,`scripts/${name}.test.swift`,'-framework','AppKit','-framework','QuartzCore','-framework','QuickLookUI','-o',binary],{timeout:120000,maxBuffer:65536})
  if(compiled.stderr)process.stderr.write(compiled.stderr)
  const result=await run(binary,[],{timeout:30000,maxBuffer:65536});process.stdout.write(result.stdout);process.stderr.write(result.stderr)
 }
}finally{await fs.rm(directory,{recursive:true,force:true})}
