import Database from 'better-sqlite3'
const database=new Database('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04/app-state/app-state.sqlite',{readonly:true,fileMustExist:true})
try{console.log(database.prepare("SELECT DISTINCT json_extract(record,'$.configuration.python') AS python FROM managed_model_entries WHERE json_extract(record,'$.configuration.python') IS NOT NULL").all())}finally{database.close()}
