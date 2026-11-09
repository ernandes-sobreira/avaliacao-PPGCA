import {readFile,writeFile} from 'node:fs/promises';
const [auth,worker,unemat,ppgca]=await Promise.all([
  readFile('worker/auth.js','utf8'),readFile('worker/index.js','utf8'),
  readFile('assets/unemat.png'),readFile('assets/ppgca-02.png')
]);
const logos={unemat:unemat.toString('base64'),ppgca:ppgca.toString('base64')};
await writeFile('dist/server/index.js','const logos='+JSON.stringify(logos)+';\n'+auth.replaceAll('export ','')+'\n'+worker.replace(/^import .*\n/,''));
