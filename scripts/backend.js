const { spawn } = require("node:child_process");
const path = require("node:path");

const command = process.argv[2] ?? "build";
const workspaceRoot = path.resolve(__dirname, "..");
const backendDir = path.join(workspaceRoot, "apps", "backend", "src", "Splity.Api");
const dotnetCliHome = path.join(workspaceRoot, ".dotnet");
const isWindows = process.platform === "win32";
const dotnetCommand = isWindows ? "dotnet.exe" : "dotnet";

const commandMap = {
  build: ["build", "Splity.Api.csproj"],
  restore: ["restore", "Splity.Api.csproj"],
  run: ["watch", "run", "--launch-profile", "http"]
};

const args = commandMap[command];

if (!args) {
  process.stderr.write(`Unknown backend command "${command}". Use build, restore, or run.\n`);
  process.exit(1);
}

const child = spawn(dotnetCommand, args, {
  cwd: backendDir,
  env: {
    ...process.env,
    DOTNET_CLI_HOME: dotnetCliHome,
    ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT ?? "Development"
  },
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
