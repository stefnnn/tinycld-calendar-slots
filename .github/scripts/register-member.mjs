#!/usr/bin/env node
// bootstrap assembles the workspace with the official tinycld member list, which
// excludes this external package. Without membership pnpm skips its
// devDependencies and never links the tinycld-pkg bin, so `pnpm exec
// tinycld-pkg` fails. Add the package to both member lists (idempotently) so
// pnpm treats it as a real workspace project. Run from the workspace root.
import * as fs from 'node:fs'
import * as path from 'node:path'

const member = process.argv[2]
if (!member) {
    console.error('usage: register-member.mjs <member-dir>')
    process.exit(1)
}

const root = process.cwd()

const wsYamlPath = path.join(root, 'pnpm-workspace.yaml')
let yaml = fs.readFileSync(wsYamlPath, 'utf8')
if (!new RegExp(`^\\s*-\\s*${member}\\s*$`, 'm').test(yaml)) {
    yaml = yaml.replace(/(packages:\n(?: *- .*\n)+)/, (block) => `${block}  - ${member}\n`)
    fs.writeFileSync(wsYamlPath, yaml)
    console.log(`[register-member] added ${member} to pnpm-workspace.yaml`)
} else {
    console.log(`[register-member] ${member} already in pnpm-workspace.yaml`)
}

const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
if (Array.isArray(pkg.workspaces) && !pkg.workspaces.includes(member)) {
    pkg.workspaces.push(member)
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`)
    console.log(`[register-member] added ${member} to package.json workspaces`)
}
