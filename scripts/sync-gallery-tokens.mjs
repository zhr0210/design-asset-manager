import fs from 'node:fs/promises'
import yaml from 'js-yaml'
const tokens=yaml.load((await fs.readFile('DESIGN.md','utf8')).split(/^---\s*$/m)[1])
const css='.gallery-design{'+Object.entries(tokens.colors).map(([k,v])=>`--${k}:${v};`).join('')+Object.entries(tokens.rounded).map(([k,v])=>`--radius-${k}:${v};`).join('')+'}\n'
const target='src/renderer/components/gallery/tokens.css'
if(process.argv.includes('--check')){if(await fs.readFile(target,'utf8')!==css)throw Error('Gallery tokens differ from DESIGN.md');console.log('Gallery design tokens match')}else await fs.writeFile(target,css)
