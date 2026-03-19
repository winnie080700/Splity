const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] ?? "full";
const workspaceRoot = path.resolve(__dirname, "..");
const frontendDir = path.join(workspaceRoot, "apps", "frontend");
const backendDir = path.join(workspaceRoot, "apps", "backend", "src", "Splity.Api");
const dotnetCliHome = path.join(workspaceRoot, ".dotnet");

const isWindows = process.platform === "win32";
const dotnetCommand = isWindows ? "dotnet.exe" : "dotnet";
const frontendCommand = isWindows ? "powershell.exe" : "npm";
const frontendArgs = isWindows ? ["-Command", "npm run dev"] : ["run", "dev"];

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
  const stdio = options.prefixed === false ? "inherit" : ["ignore", "pipe", "pipe"];
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio
  });

  processes.push(child);
  if (options.prefixed !== false) {
    prefixStream(child.stdout, label);
    prefixStream(child.stderr, `${label}:err`);
  }

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

  child.on("error", (error) => {
    process.stderr.write(`[${label}:err] ${error.message}\n`);
    stopOthers(child);
    process.exitCode = 1;
  });

  return child;
}

function ensureFrontendDependencies() {
  const frontendNodeModules = path.join(frontendDir, "node_modules");

  if (!fs.existsSync(frontendNodeModules)) {
    process.stderr.write(
      "Frontend dependencies are missing. Run `npm install` in apps/frontend before `npm run dev`.\n"
    );
    process.exit(1);
  }
}

function launchFrontend() {
  ensureFrontendDependencies();
  return launch("frontend", frontendCommand, frontendArgs, {
    cwd: frontendDir,
    env: process.env,
    prefixed: false
  });
}

function launchBackend() {
  return launch("backend", dotnetCommand, ["watch", "run", "--launch-profile", "http"], {
    cwd: backendDir,
    env: {
      ...process.env,
      DOTNET_CLI_HOME: dotnetCliHome,
      ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT ?? "Development"
    },
    prefixed: false
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
  ensureFrontendDependencies();
  launchBackend();
  launchFrontend();
} else {
  process.stderr.write(`Unknown mode "${mode}". Use frontend, backend, or full.\n`);
  process.exit(1);
}
