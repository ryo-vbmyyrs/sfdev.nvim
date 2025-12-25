import type {
  DeployResult,
  ExecuteResult,
  LogContentResult,
  LogListResult,
  Org,
  RetrieveResult,
  TestClassListResult,
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

      // Extract debug logs from the result
      const logs = json.result?.logs && typeof json.result.logs === "string"
        ? json.result.logs.split("\n").filter((line: string) => line.trim().length > 0)
        : [];

      return {
        success: json.result?.success || false,
        compiled: json.result?.compiled || false,
        compileProblem: json.result?.compileProblem,
        exceptionMessage: json.result?.exceptionMessage,
        exceptionStackTrace: json.result?.exceptionStackTrace,
        line: json.result?.line,
        column: json.result?.column,
        logs: logs.length > 0 ? logs : undefined,
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

/**
 * Apexログの一覧を取得
 */
export async function listLogs(
  targetOrg?: string,
  limit: number = 25,
): Promise<LogListResult> {
  const args = [
    "data",
    "query",
    "--query",
    `SELECT Id, LogUserId, LogUser.Name, Application, DurationMilliseconds, Location, LogLength, Operation, Request, StartTime, Status FROM ApexLog ORDER BY StartTime DESC LIMIT ${limit}`,
    "--json",
  ];

  if (targetOrg) {
    args.push("--target-org", targetOrg);
  }

  try {
    const result = await execSfCommand(args);

    if (result.success && result.stdout) {
      const data = JSON.parse(result.stdout);
      return {
        success: true,
        logs: data.result.records || [],
      };
    }

    return {
      success: false,
      logs: [],
    };
  } catch (error) {
    console.error("Failed to list logs:", error);
    return {
      success: false,
      logs: [],
    };
  }
}

/**
 * 特定のApexログの内容を取得
 */
export async function getLog(
  logId: string,
  targetOrg?: string,
): Promise<LogContentResult> {
  const args = [
    "apex",
    "get",
    "log",
    "--log-id",
    logId,
    "--json",
  ];

  if (targetOrg) {
    args.push("--target-org", targetOrg);
  }

  try {
    const result = await execSfCommand(args);

    if (result.success && result.stdout) {
      const data = JSON.parse(result.stdout);
      // Ensure content is always a string
      let content = "";
      
      // Handle different response formats from Salesforce CLI
      if (typeof data.result === "string") {
        content = data.result;
      } else if (Array.isArray(data.result) && data.result.length > 0) {
        // If result is an array, get the first element's log property
        if (typeof data.result[0] === "string") {
          content = data.result[0];
        } else if (data.result[0] && typeof data.result[0].log === "string") {
          content = data.result[0].log;
        } else {
          content = JSON.stringify(data.result, null, 2);
        }
      } else if (data.result && typeof data.result.log === "string") {
        content = data.result.log;
      } else if (data.result) {
        // If result is an object, try to stringify it
        content = JSON.stringify(data.result, null, 2);
      }
      
      return {
        success: true,
        content: content,
        logId: logId,
      };
    }

    return {
      success: false,
      content: result.stderr || "Failed to retrieve log",
      logId: logId,
    };
  } catch (error) {
    return {
      success: false,
      content: String(error),
      logId: logId,
    };
  }
}

/**
 * Apexログを削除
 */
export async function deleteLog(
  logId: string,
  targetOrg?: string,
): Promise<{ success: boolean; message?: string }> {
  const args = [
    "data",
    "delete",
    "record",
    "--sobject",
    "ApexLog",
    "--record-id",
    logId,
    "--json",
  ];

  if (targetOrg) {
    args.push("--target-org", targetOrg);
  }

  try {
    const result = await execSfCommand(args);

    if (result.success) {
      return {
        success: true,
        message: `Log ${logId} deleted successfully`,
      };
    }

    return {
      success: false,
      message: result.stderr || "Failed to delete log",
    };
  } catch (error) {
    return {
      success: false,
      message: String(error),
    };
  }
}

/**
 * 全てのApexログを削除
 */
export async function clearLogs(
  targetOrg?: string,
): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
  try {
    // まずログ一覧を取得
    const listResult = await listLogs(targetOrg, 1000);

    if (!listResult.success || listResult.logs.length === 0) {
      return {
        success: true,
        message: "No logs to delete",
        deletedCount: 0,
      };
    }

    // 全ログを削除
    let deletedCount = 0;
    for (const log of listResult.logs) {
      const deleteResult = await deleteLog(log.Id, targetOrg);
      if (deleteResult.success) {
        deletedCount++;
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} logs`,
      deletedCount,
    };
  } catch (error) {
    return {
      success: false,
      message: String(error),
      deletedCount: 0,
    };
  }
}

/**
 * テストクラスの一覧を取得
 */
export async function listTestClasses(
  targetOrg?: string,
): Promise<TestClassListResult> {
  const args = [
    "data",
    "query",
    "--query",
    "SELECT Id, Name, NamespacePrefix, ApiVersion, Status, IsValid, LengthWithoutComments, CreatedDate, LastModifiedDate FROM ApexClass WHERE (Name LIKE '%Test%' OR Name LIKE '%test%') ORDER BY Name ASC",
    "--json",
  ];

  if (targetOrg) {
    args.push("--target-org", targetOrg);
  }

  try {
    const result = await execSfCommand(args);

    if (result.success && result.stdout) {
      const data = JSON.parse(result.stdout);
      return {
        success: true,
        classes: data.result.records || [],
      };
    }

    return {
      success: false,
      classes: [],
    };
  } catch (error) {
    console.error("Failed to list test classes:", error);
    return {
      success: false,
      classes: [],
    };
  }
}
