import Database from 'better-sqlite3'
const db=new Database('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04/app-state/app-state.sqlite',{readonly:true,fileMustExist:true})
try {
 console.log(JSON.stringify(db.prepare('SELECT root FROM local_ocr_runtime WHERE singleton=1').get()))
 const rows=(db.prepare('SELECT qualification FROM local_ocr_qualification').all() as {qualification:string}[]).map(row=>JSON.parse(row.qualification)).sort((a,b)=>Date.parse(b.testedAt)-Date.parse(a.testedAt))
 console.log(JSON.stringify(rows[0]?{testedAt:rows[0].testedAt,measuredPeakRamBytes:rows[0].measuredPeakRamBytes,inputEnvelope:rows[0].inputEnvelope,envelope:rows[0].envelope}:null))
}
finally {db.close()}
