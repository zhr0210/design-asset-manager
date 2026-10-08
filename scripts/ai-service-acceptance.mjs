// Default plan-only CLI: no application settings, Vault, model/HTTP or native SQLite imports.
import {createHash} from 'node:crypto'
const args=process.argv.slice(2),read=flag=>args.find(v=>v.startsWith(flag+'='))?.slice(flag.length+1)
if(args.includes('--execute'))throw Error('ACCEPTANCE_EXECUTION_REQUIRES_TRUSTED_MAIN_USER_PERMIT: open the isolated acceptance interface; CLI cannot mint approval')
const plan={schemaVersion:1,mode:'PLAN_ONLY',approved:false,runId:read('--run')??null,connectionReference:read('--connection')??null,model:read('--model')??null,origin:read('--origin')??null,generatedOnly:true,allowUserLibrary:false,realRequestBudget:0,maxEstimatedCostUsd:0,requires:'trusted Main user review, selected isolated connection/model/destination/input digest, finite budgets and one-use signed permit',templateDigest:createHash('sha256').update('dam-acceptance-v1').digest('hex')}
process.stdout.write(JSON.stringify(plan,null,2)+'\n')
