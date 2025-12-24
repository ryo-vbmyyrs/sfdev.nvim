import type {
  DeployResult,
  ExecuteResult,
  Org,
  RetrieveResult,
  TestResult,
} from "./types.ts";

/**
 * Detect which Salesforce CLI is available (sf or sfdx)
 */
async function detectSfCli(): Promise<string> {
  try {
    const sfCheck = new Deno.Command("sf", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await sfCheck.output();
    if (success) return "sf";
  } catch {
    // sf not found, try sfdx
  }

  try {
    const sfdxCheck = new Deno.Command("sfdx", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await sfdxCheck.output();
    if (success) return "sfdx";
  } catch {
    // sfdx not found
  }

  throw new Error("Salesforce CLI not found. Please install 'sf' or 'sfdx'.");
}

let cachedCli: string | null = null;

export async function getSfCli(): Promise<string> {
  if (cachedCli) return cachedCli;
  cachedCli = await detectSfCli();
  return cachedCli;
}

/**
 * Execute Salesforce CLI command
 */
export async function execSfCommand(
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  const cli = await getSfCli();
  const command = new Deno.Command(cli, {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, success } = await command.output();
  const stdoutStr = new TextDecoder().decode(stdout);
  const stderrStr = new TextDecoder().decode(stderr);

  return {
    stdout: stdoutStr,
    stderr: stderrStr,
    success,
  };
}

/**
 * List all authenticated orgs
 */
export async function listOrgs(): Promise<Org[]> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  const args = isLegacy
    ? ["force:org:list", "--json"]
    : ["org", "list", "--json"];

  const result = await execSfCommand(args);

  if (!result.success) {
    throw new Error(`Failed to list orgs: ${result.stderr}`);
  }

  try {
    const json = JSON.parse(result.stdout);

    if (isLegacy) {
      // sfdx format
      const nonScratchOrgs = json.result?.nonScratchOrgs || [];
      const scratchOrgs = json.result?.scratchOrgs || [];
      const allOrgs = [...nonScratchOrgs, ...scratchOrgs];

      return allOrgs.map((org: any) => ({
        alias: org.alias,
        username: org.username,
        orgId: org.orgId,
        instanceUrl: org.instanceUrl || org.loginUrl || "",
        isDefaultUsername: org.isDefaultUsername || false,
        isDefaultDevHub: org.isDevHub || false,
      }));
    } else {
      // sf format
      const orgs = json.result?.nonScratchOrgs || json.result?.scratchOrgs || [];
      return orgs.map((org: any) => ({
        alias: org.alias,
        username: org.username,
        orgId: org.orgId,
        instanceUrl: org.instanceUrl || "",
        isDefaultUsername: org.isDefaultUsername || false,
        isDefaultDevHub: org.isDevHubUsername || false,
      }));
    }
  } catch (e) {
    throw new Error(`Failed to parse org list: ${e}`);
  }
}

/**
 * Deploy source to org
 */
export async function deploy(
  sourcePath: string,
  targetOrg?: string,
): Promise<DeployResult> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  const args = isLegacy
    ? ["force:source:deploy", "-p", sourcePath, "--json"]
    : ["project", "deploy", "start", "-d", sourcePath, "--json"];

  if (targetOrg) {
    args.push(isLegacy ? "-u" : "-o", targetOrg);
  }

  const result = await execSfCommand(args);

  try {
    const json = JSON.parse(result.stdout);

    if (isLegacy) {
      return {
        success: json.status === 0,
        status: json.result?.status || "Unknown",
        id: json.result?.id,
        message: json.message,
        componentFailures: json.result?.details?.componentFailures?.map(
          (f: any) => ({
            componentType: f.componentType,
            fullName: f.fullName,
            problemType: f.problemType,
            problem: f.problem,
            lineNumber: f.lineNumber,
            columnNumber: f.columnNumber,
          }),
        ),
      };
    } else {
      return {
        success: json.status === 0,
        status: json.result?.status || "Unknown",
        id: json.result?.id,
        message: json.message,
        componentFailures: json.result?.files
          ?.filter((f: any) => f.state === "Failed")
          .map((f: any) => ({
            componentType: f.type,
            fullName: f.fullName,
            problemType: "Error",
            problem: f.error || "Unknown error",
          })),
      };
    }
  } catch (e) {
    return {
      success: false,
      status: "Error",
      message: `Failed to parse deploy result: ${e}`,
    };
  }
}

/**
 * Retrieve metadata from org
 */
export async function retrieve(
  metadata: string[],
  targetOrg?: string,
): Promise<RetrieveResult> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  const args = isLegacy
    ? ["force:source:retrieve", "-m", metadata.join(","), "--json"]
    : ["project", "retrieve", "start", "-m", metadata.join(","), "--json"];

  if (targetOrg) {
    args.push(isLegacy ? "-u" : "-o", targetOrg);
  }

  const result = await execSfCommand(args);

  try {
    const json = JSON.parse(result.stdout);

    return {
      success: json.status === 0,
      status: json.result?.status || "Unknown",
      message: json.message,
    };
  } catch (e) {
    return {
      success: false,
      status: "Error",
      message: `Failed to parse retrieve result: ${e}`,
    };
  }
}

/**
 * Open org in browser
 */
export async function openOrg(targetOrg?: string): Promise<void> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  const args = isLegacy ? ["force:org:open"] : ["org", "open"];

  if (targetOrg) {
    args.push(isLegacy ? "-u" : "-o", targetOrg);
  }

  const result = await execSfCommand(args);

  if (!result.success) {
    throw new Error(`Failed to open org: ${result.stderr}`);
  }
}

/**
 * Execute anonymous Apex
 */
export async function executeApex(
  apexCode: string,
  targetOrg?: string,
): Promise<ExecuteResult> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  // Write apex code to a temporary file
  const tempFile = await Deno.makeTempFile({ suffix: ".apex" });
  await Deno.writeTextFile(tempFile, apexCode);

  try {
    const args = isLegacy
      ? ["force:apex:execute", "-f", tempFile, "--json"]
      : ["apex", "run", "-f", tempFile, "--json"];

    if (targetOrg) {
      args.push(isLegacy ? "-u" : "-o", targetOrg);
    }

    const result = await execSfCommand(args);

    try {
      const json = JSON.parse(result.stdout);

      return {
        success: json.result?.success || false,
        compiled: json.result?.compiled || false,
        compileProblem: json.result?.compileProblem,
        exceptionMessage: json.result?.exceptionMessage,
        exceptionStackTrace: json.result?.exceptionStackTrace,
        line: json.result?.line,
        column: json.result?.column,
      };
    } catch (e) {
      return {
        success: false,
        compiled: false,
        compileProblem: `Failed to parse execute result: ${e}`,
      };
    }
  } finally {
    // Clean up temp file
    try {
      await Deno.remove(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run Apex tests
 */
export async function runTests(
  testNames?: string[],
  targetOrg?: string,
): Promise<TestResult> {
  const cli = await getSfCli();
  const isLegacy = cli === "sfdx";

  const args = isLegacy
    ? ["force:apex:test:run", "--json", "--result-format", "json"]
    : ["apex", "run", "test", "--json", "--result-format", "json"];

  if (testNames && testNames.length > 0) {
    args.push(isLegacy ? "-n" : "-t", testNames.join(","));
  }

  if (targetOrg) {
    args.push(isLegacy ? "-u" : "-o", targetOrg);
  }

  const result = await execSfCommand(args);

  try {
    const json = JSON.parse(result.stdout);
    const summary = json.result?.summary || {};

    return {
      success: summary.outcome === "Passed",
      summary: {
        outcome: summary.outcome || "Unknown",
        testsRan: summary.testsRan || 0,
        passing: summary.passing || 0,
        failing: summary.failing || 0,
        skipped: summary.skipped || 0,
      },
      tests: json.result?.tests?.map((test: any) => ({
        fullName: test.fullName || test.FullName,
        outcome: test.outcome || test.Outcome,
        message: test.message || test.Message,
        stackTrace: test.stackTrace || test.StackTrace,
        runTime: test.runTime || test.RunTime,
      })),
    };
  } catch (e) {
    return {
      success: false,
      summary: {
        outcome: "Error",
        testsRan: 0,
        passing: 0,
        failing: 0,
        skipped: 0,
      },
    };
  }
}
