import type { Denops } from "./deps.ts";
import { batch, ensure, fn, is, vars } from "./deps.ts";
import * as cli from "./cli.ts";

/**
 * Show execute result in simple buffer (fallback when NUI not available)
 */
async function showExecuteResultSimple(
  denops: Denops,
  apexCode: string,
  result: cli.ExecuteResult,
): Promise<void> {
  // Create new split
  await denops.cmd("vnew");
  await denops.cmd("setlocal buftype=nofile bufhidden=wipe noswapfile");

  const lines = [
    "=== Apex Execution Result ===",
    "",
    "Input Code:",
    "─────────────────────────────",
    ...apexCode.split("\n"),
    "",
    "Output:",
    "─────────────────────────────",
  ];

  if (result.success) {
    lines.push("✓ Compiled successfully");
    lines.push("✓ Executed successfully");
  } else {
    lines.push("✗ Execution failed");
    if (result.compileProblem) {
      lines.push("");
      lines.push("Compile Error:");
      lines.push(result.compileProblem);
      if (result.line) {
        lines.push(`Line: ${result.line}, Column: ${result.column || 0}`);
      }
    }
    if (result.exceptionMessage) {
      lines.push("");
      lines.push("Exception:");
      lines.push(result.exceptionMessage);
      if (result.exceptionStackTrace) {
        lines.push("");
        lines.push("Stack Trace:");
        lines.push(result.exceptionStackTrace);
      }
    }
  }

  if (result.logs && result.logs.length > 0) {
    lines.push("");
    lines.push("Debug Logs:");
    lines.push("─────────────────────────────");
    lines.push(...result.logs);
  }

  const bufnr = await fn.bufnr(denops, "%") as number;
  await denops.call("nvim_buf_set_lines", bufnr, 0, -1, false, lines);
  await denops.call("nvim_buf_set_option", bufnr, "modifiable", false);
  await denops.cmd("setlocal filetype=apexlog");
}

export async function main(denops: Denops): Promise<void> {
  // Register plugin API
  denops.dispatcher = {
    /**
     * List all authenticated orgs
     */
    async listOrgs(): Promise<void> {
      try {
        const orgs = await cli.listOrgs();

        if (orgs.length === 0) {
          await denops.call("sfdev#echo_info", "No authenticated orgs found");
          return;
        }

        // Create buffer content
        const lines = ["# Authenticated Orgs", ""];
        for (const org of orgs) {
          const defaultMarker = org.isDefaultUsername ? " (default)" : "";
          const devHubMarker = org.isDefaultDevHub ? " [DevHub]" : "";
          const alias = org.alias ? `${org.alias} - ` : "";
          lines.push(`${alias}${org.username}${defaultMarker}${devHubMarker}`);
          lines.push(`  Org ID: ${org.orgId}`);
          lines.push(`  Instance: ${org.instanceUrl}`);
          lines.push("");
        }

        // Create new buffer and display
        await batch.batch(denops, async (denops) => {
          await denops.cmd("new");
          await denops.call("setline", 1, lines);
          await denops.cmd("setlocal buftype=nofile bufhidden=wipe noswapfile");
          await denops.cmd("setlocal filetype=sfdev-orgs");
          await denops.cmd("file [SF Orgs]");
        });

        await denops.call("sfdev#echo_success", "Org list displayed");
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Failed to list orgs: ${String(e)}`,
        );
      }
    },

    /**
     * Open org in browser
     */
    async openOrg(targetOrg?: unknown): Promise<void> {
      try {
        const org = ensure(targetOrg, is.OptionalOf(is.String));
        const orgToUse = org ||
          (await vars.g.get(denops, "sfdev_default_org", "")) as string;

        await cli.openOrg(orgToUse || undefined);
        await denops.call("sfdev#echo_success", "Org opened in browser");
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Failed to open org: ${String(e)}`,
        );
      }
    },

    /**
     * Deploy current file or project
     */
    async deploy(sourcePath?: unknown): Promise<void> {
      try {
        const path = ensure(sourcePath, is.OptionalOf(is.String));
        const targetOrg = (await vars.g.get(
          denops,
          "sfdev_default_org",
          "",
        )) as string;

        let deployPath: string;
        if (path) {
          deployPath = path;
        } else {
          // Get current file path
          const currentFile = await fn.expand(denops, "%:p") as string;
          if (!currentFile) {
            await denops.call(
              "sfdev#echo_error",
              "No file to deploy",
            );
            return;
          }
          deployPath = currentFile;
        }

        await denops.call("sfdev#echo_info", "Deploying...");

        const result = await cli.deploy(
          deployPath,
          targetOrg || undefined,
        );

        if (result.success) {
          await denops.call(
            "sfdev#echo_success",
            `Deploy succeeded: ${result.status}`,
          );
        } else {
          let errorMsg = `Deploy failed: ${result.status}`;
          if (result.componentFailures && result.componentFailures.length > 0) {
            errorMsg += "\n" +
              result.componentFailures
                .map((f) => `  ${f.fullName}: ${f.problem}`)
                .join("\n");
          }
          await denops.call("sfdev#echo_error", errorMsg);
        }
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Deploy error: ${String(e)}`,
        );
      }
    },

    /**
     * Retrieve metadata from org
     */
    async retrieve(metadata?: unknown): Promise<void> {
      try {
        const meta = ensure(metadata, is.OptionalOf(is.String));
        const targetOrg = (await vars.g.get(
          denops,
          "sfdev_default_org",
          "",
        )) as string;

        if (!meta) {
          await denops.call(
            "sfdev#echo_error",
            "Please specify metadata to retrieve",
          );
          return;
        }

        await denops.call("sfdev#echo_info", "Retrieving metadata...");

        const metadataArray = meta.split(",").map((m) => m.trim());
        const result = await cli.retrieve(
          metadataArray,
          targetOrg || undefined,
        );

        if (result.success) {
          await denops.call(
            "sfdev#echo_success",
            `Retrieve succeeded: ${result.status}`,
          );
        } else {
          await denops.call(
            "sfdev#echo_error",
            `Retrieve failed: ${result.message || result.status}`,
          );
        }
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Retrieve error: ${String(e)}`,
        );
      }
    },

    /**
     * Execute anonymous Apex
     * Note: This method accepts both string and array arguments because it's called
     * from Vim commands which may pass arguments in different formats depending on
     * how they're invoked (e.g., <q-args> may pass as string or array).
     */
    async executeApex(args: unknown): Promise<void> {
      try {
        // Handle both string and array arguments flexibly
        let apexCode = "";
        
        if (typeof args === "string") {
          apexCode = args;
        } else if (Array.isArray(args)) {
          if (args.length > 0 && typeof args[0] === "string") {
            apexCode = args[0];
          }
        } else {
          await denops.call(
            "sfdev#echo_error",
            "Invalid arguments. Use :SFApexExecute [code] or :SFApexExecute without args to execute buffer",
          );
          return;
        }

        if (!apexCode || apexCode.trim() === "") {
          await denops.call("sfdev#echo_error", "No Apex code provided");
          return;
        }

        const targetOrg = (await vars.g.get(
          denops,
          "sfdev_default_org",
          "",
        )) as string;

        // Execution info
        const lines = apexCode.split("\n").length;
        await denops.call(
          "sfdev#echo_info",
          `Executing ${lines} line(s) of Apex code...`,
        );

        const result = await cli.executeApex(
          apexCode,
          targetOrg || undefined,
        );

        // Display result in simple buffer
        await showExecuteResultSimple(denops, apexCode, result);

        // Show status message
        if (result.success) {
          await denops.call("sfdev#echo_success", "Apex executed successfully");
        } else {
          await denops.call("sfdev#echo_error", "Apex execution failed");
        }
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Execute error: ${String(e)}`,
        );
      }
    },

    /**
     * Run Apex tests
     */
    async runTest(testNames?: unknown): Promise<void> {
      try {
        const tests = ensure(testNames, is.OptionalOf(is.String));
        const targetOrg = (await vars.g.get(
          denops,
          "sfdev_default_org",
          "",
        )) as string;

        await denops.call("sfdev#echo_info", "Running tests...");

        const testArray = tests ? tests.split(",").map((t) => t.trim()) : undefined;
        const result = await cli.runTests(
          testArray,
          targetOrg || undefined,
        );

        // Display results in a buffer
        const lines = [
          "# Apex Test Results",
          "",
          `Outcome: ${result.summary.outcome}`,
          `Tests Ran: ${result.summary.testsRan}`,
          `Passing: ${result.summary.passing}`,
          `Failing: ${result.summary.failing}`,
          `Skipped: ${result.summary.skipped}`,
          "",
        ];

        if (result.tests && result.tests.length > 0) {
          lines.push("## Test Details", "");
          for (const test of result.tests) {
            lines.push(`${test.outcome}: ${test.fullName}`);
            if (test.message) {
              lines.push(`  Message: ${test.message}`);
            }
            if (test.stackTrace) {
              lines.push(`  Stack: ${test.stackTrace}`);
            }
            if (test.runTime) {
              lines.push(`  Time: ${test.runTime}ms`);
            }
            lines.push("");
          }
        }

        await batch.batch(denops, async (denops) => {
          await denops.cmd("new");
          await denops.call("setline", 1, lines);
          await denops.cmd("setlocal buftype=nofile bufhidden=wipe noswapfile");
          await denops.cmd("setlocal filetype=sfdev-test-results");
          await denops.cmd("file [SF Test Results]");
        });

        if (result.success) {
          await denops.call(
            "sfdev#echo_success",
            `All tests passed (${result.summary.passing}/${result.summary.testsRan})`,
          );
        } else {
          await denops.call(
            "sfdev#echo_error",
            `Tests failed (${result.summary.failing} failures)`,
          );
        }
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Test error: ${String(e)}`,
        );
      }
    },

    /**
     * List orgs in JSON format (for Telescope integration)
     */
    async listOrgsJson(): Promise<unknown> {
      try {
        const cliName = await cli.getSfCli();
        const isLegacy = cliName === "sfdx";

        const args = isLegacy
          ? ["force:org:list", "--json"]
          : ["org", "list", "--json"];

        const rawResult = await cli.execSfCommand(args);

        if (!rawResult.success) {
          throw new Error(`Failed to list orgs: ${rawResult.stderr}`);
        }

        const json = JSON.parse(rawResult.stdout);
        const result = {
          nonScratchOrgs: json.result?.nonScratchOrgs || [],
          scratchOrgs: json.result?.scratchOrgs || [],
        };

        return { success: true, stdout: JSON.stringify({ result }), stderr: "" };
      } catch (e) {
        return { success: false, stdout: "", stderr: String(e) };
      }
    },

    /**
     * Set default org
     */
    async setDefaultOrg(args: unknown): Promise<unknown> {
      ensure(args, is.Array);
      const [targetOrg] = args as [string];

      try {
        await cli.execSfCommand(["config", "set", "target-org", targetOrg]);
        await denops.call(
          "sfdev#echo_success",
          `Set default org to: ${targetOrg}`,
        );
        return { success: true, message: `Set default org to: ${targetOrg}` };
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Failed to set default org: ${String(e)}`,
        );
        return { success: false, message: String(e) };
      }
    },

    /**
     * Logout from org
     */
    async logoutOrg(args: unknown): Promise<unknown> {
      ensure(args, is.Array);
      const [targetOrg] = args as [string];

      try {
        await cli.execSfCommand([
          "org",
          "logout",
          "--target-org",
          targetOrg,
          "--no-prompt",
        ]);
        await denops.call(
          "sfdev#echo_success",
          `Logged out from: ${targetOrg}`,
        );
        return { success: true, message: `Logged out from: ${targetOrg}` };
      } catch (e) {
        await denops.call(
          "sfdev#echo_error",
          `Failed to logout: ${String(e)}`,
        );
        return { success: false, message: String(e) };
      }
    },

    /**
     * Apexログ一覧を取得
     */
    async listLogs(): Promise<unknown> {
      try {
        const result = await cli.listLogs();
        return result;
      } catch (error) {
        await denops.call("sfdev#echo_error", `Failed to list logs: ${error}`);
        return { success: false, error: String(error), logs: [] };
      }
    },

    /**
     * Apexログの内容を取得
     */
    async getLog(args: unknown): Promise<unknown> {
      try {
        let logId = "";
        if (typeof args === "string") {
          logId = args;
        } else if (Array.isArray(args) && args.length > 0) {
          logId = String(args[0]);
        }

        if (!logId) {
          throw new Error("No log ID provided");
        }

        await denops.call("sfdev#echo_info", "Fetching log...");
        const result = await cli.getLog(logId);

        if (result.success) {
          // 新しいバッファを作成
          await denops.cmd("new");

          // ログ内容を設定
          const lines = result.content.split("\n");
          await fn.setline(denops, 1, lines);

          // バッファ設定
          await denops.cmd("setlocal buftype=nofile");
          await denops.cmd("setlocal bufhidden=wipe");
          await denops.cmd("setlocal noswapfile");
          await denops.cmd("setlocal filetype=apexlog");
          await denops.cmd(`file [ApexLog] ${logId}`);

          await denops.call("sfdev#echo_success", "Log loaded successfully");
        } else {
          await denops.call("sfdev#echo_error", `Failed to fetch log: ${result.content}`);
        }

        return result;
      } catch (error) {
        await denops.call("sfdev#echo_error", `Get log error: ${error}`);
        return { success: false, error: String(error) };
      }
    },

    /**
     * Apexログを削除
     */
    async deleteLog(args: unknown): Promise<unknown> {
      try {
        let logId = "";
        if (typeof args === "string") {
          logId = args;
        } else if (Array.isArray(args) && args.length > 0) {
          logId = String(args[0]);
        }

        if (!logId) {
          throw new Error("No log ID provided");
        }

        await denops.call("sfdev#echo_info", "Deleting log...");
        const result = await cli.deleteLog(logId);

        if (result.success) {
          await denops.call("sfdev#echo_success", result.message || "Log deleted");
        } else {
          await denops.call("sfdev#echo_error", result.message || "Failed to delete log");
        }

        return result;
      } catch (error) {
        await denops.call("sfdev#echo_error", `Delete log error: ${error}`);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 全Apexログを削除
     */
    async clearLogs(): Promise<unknown> {
      try {
        await denops.call("sfdev#echo_info", "Clearing all logs...");
        const result = await cli.clearLogs();

        if (result.success) {
          await denops.call(
            "sfdev#echo_success",
            result.message || `Deleted ${result.deletedCount} logs`,
          );
        } else {
          await denops.call("sfdev#echo_error", result.message || "Failed to clear logs");
        }

        return result;
      } catch (error) {
        await denops.call("sfdev#echo_error", `Clear logs error: ${error}`);
        return { success: false, error: String(error) };
      }
    },
  };

  await denops.call("sfdev#echo_info", "sfdev.nvim loaded");
}
