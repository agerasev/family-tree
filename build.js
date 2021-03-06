"use strict";

const fsp = require("fs").promises;
const spawn = require("child_process").spawn;

function run(args, opts) {
  return new Promise((resolve, reject) => {
    console.log("run", args, opts || "");
    opts = opts || {};
    const child = spawn(args[0], args.slice(1), {
      cwd: opts.cwd || process.cwd(),
      //detached: true,
      stdio: "inherit",
    })
    child.on('close', function (code) {
      if (code === 0) {
        resolve();
        console.log();
      } else {
        reject(code);
      }
    });
    child.on('error', function (err) {
      reject(err);
    });
  });
}

function npx(args) {
  return run(["npx"].concat(args));
}

new Promise((resolve, _) => resolve())

.then(_ => fsp.mkdir("src/gen", { recursive: true}))
.then(_ => npx(["ts-interface-builder", "src/data/input.ts", "--outDir", "src/gen"]))

.then(_ => npx(["sass3js", "-f", "ts", "style/defs.scss", "src/gen/style-defs.ts"]))
.then(_ => npx(["sass", "style/main.scss", "output/style.css"]))

.then(_ => run(["wasm-pack", "build", "solver", "--target", "web", "--out-dir", "../src/solver", "--out-name", "index"]))
.then(_ => fsp.copyFile("src/solver/index_bg.wasm", "output/solver.wasm"))

.then(_ => npx(["tsc"]))

.then(_ => npx(["esbuild", "build/main.js", "--bundle", "--outfile=output/bundle.js", "--sourcemap=inline"]))

.catch(err => {
  console.log(err);
  return 1;
});
