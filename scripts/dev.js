const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] ?? "full";
const workspaceRoot = path.resolve(__dirname, "..");
const frontendDir = path.join(workspaceRoot, "apps", "frontend");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const nodeCommand = isWindows ? "node.exe" : "node";

const processes = [];
let shuttingDown = false;

function prefixStream(stream, label) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`[${label}] ${line}\n`);
      }
    }
  });

  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`[${label}] ${buffer}\n`);
    }
  });
}

function stopOthers(exitingChild) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (child !== exitingChild && !child.killed) {
      child.kill("SIGINT");
    }
  }
}

function launch(label, command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["inherit", "pipe", "pipe"]
  });

  processes.push(child);
  prefixStream(child.stdout, label);
  prefixStream(child.stderr, `${label}:err`);

  child.on("exit", (code, signal) => {
    const status = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    process.stdout.write(`[${label}] exited with ${status}\n`);

    if (processes.length > 1) {
      stopOthers(child);
    }

    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
}

function launchFrontend() {
  const frontendNodeModules = path.join(frontendDir, "node_modules");

  if (!fs.existsSync(frontendNodeModules)) {
    process.stderr.write(
      "Frontend dependencies are missing. Run `npm install` in apps/frontend before `npm run dev`.\n"
    );
    process.exit(1);
  }

  return launch("frontend", npmCommand, ["run", "dev"], {
    cwd: frontendDir,
    env: process.env
  });
}

function launchBackend() {
  return launch("backend", nodeCommand, [path.join("scripts", "backend.js"), "run"], {
    cwd: workspaceRoot,
    env: process.env
  });
}

function shutdown(signal) {
  process.stdout.write(`Received ${signal}, stopping dev services...\n`);
  stopOthers();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (mode === "frontend") {
  launchFrontend();
} else if (mode === "backend") {
  launchBackend();
} else if (mode === "full") {
  launchBackend();
  launchFrontend();
} else {
  process.stderr.write(`Unknown mode "${mode}". Use frontend, backend, or full.\n`);
  process.exit(1);
}
