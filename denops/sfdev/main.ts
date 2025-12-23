import type { Denops } from "./deps.ts";
import { batch, ensure, fn, is, vars } from "./deps.ts";
import * as cli from "./cli.ts";

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
          await denops.cmd('call sfdev#echo_info("No authenticated orgs found")');
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

        await denops.cmd('call sfdev#echo_success("Org list displayed")');
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Failed to list orgs: ${String(e)}")`,
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
        await denops.cmd('call sfdev#echo_success("Org opened in browser")');
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Failed to open org: ${String(e)}")`,
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
            await denops.cmd(
              'call sfdev#echo_error("No file to deploy")',
            );
            return;
          }
          deployPath = currentFile;
        }

        await denops.cmd('call sfdev#echo_info("Deploying...")');

        const result = await cli.deploy(
          deployPath,
          targetOrg || undefined,
        );

        if (result.success) {
          await denops.cmd(
            `call sfdev#echo_success("Deploy succeeded: ${result.status}")`,
          );
        } else {
          let errorMsg = `Deploy failed: ${result.status}`;
          if (result.componentFailures && result.componentFailures.length > 0) {
            errorMsg += "\\n" +
              result.componentFailures
                .map((f) => `  ${f.fullName}: ${f.problem}`)
                .join("\\n");
          }
          await denops.cmd(`call sfdev#echo_error("${errorMsg}")`);
        }
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Deploy error: ${String(e)}")`,
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
          await denops.cmd(
            'call sfdev#echo_error("Please specify metadata to retrieve")',
          );
          return;
        }

        await denops.cmd('call sfdev#echo_info("Retrieving metadata...")');

        const metadataArray = meta.split(",").map((m) => m.trim());
        const result = await cli.retrieve(
          metadataArray,
          targetOrg || undefined,
        );

        if (result.success) {
          await denops.cmd(
            `call sfdev#echo_success("Retrieve succeeded: ${result.status}")`,
          );
        } else {
          await denops.cmd(
            `call sfdev#echo_error("Retrieve failed: ${result.message || result.status}")`,
          );
        }
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Retrieve error: ${String(e)}")`,
        );
      }
    },

    /**
     * Execute anonymous Apex
     */
    async executeApex(apexCode?: unknown): Promise<void> {
      try {
        const code = ensure(apexCode, is.OptionalOf(is.String));
        const targetOrg = (await vars.g.get(
          denops,
          "sfdev_default_org",
          "",
        )) as string;

        let apexToExecute: string;
        if (code) {
          apexToExecute = code;
        } else {
          // Get visual selection or current line
          const mode = await fn.mode(denops) as string;
          if (mode === "v" || mode === "V") {
            // Visual mode - get selected text
            await denops.cmd('normal! "xy');
            apexToExecute = await fn.getreg(denops, "x") as string;
          } else {
            // Get all lines in buffer
            const lines = await fn.getline(denops, 1, "$") as string[];
            apexToExecute = lines.join("\n");
          }
        }

        if (!apexToExecute.trim()) {
          await denops.cmd(
            'call sfdev#echo_error("No Apex code to execute")',
          );
          return;
        }

        await denops.cmd('call sfdev#echo_info("Executing Apex...")');

        const result = await cli.executeApex(
          apexToExecute,
          targetOrg || undefined,
        );

        if (result.success) {
          await denops.cmd(
            'call sfdev#echo_success("Apex executed successfully")',
          );
        } else if (!result.compiled) {
          await denops.cmd(
            `call sfdev#echo_error("Compilation failed: ${result.compileProblem || "Unknown error"}")`,
          );
        } else {
          await denops.cmd(
            `call sfdev#echo_error("Execution failed: ${result.exceptionMessage || "Unknown error"}")`,
          );
        }
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Execute error: ${String(e)}")`,
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

        await denops.cmd('call sfdev#echo_info("Running tests...")');

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
          await denops.cmd(
            `call sfdev#echo_success("All tests passed (${result.summary.passing}/${result.summary.testsRan})")`,
          );
        } else {
          await denops.cmd(
            `call sfdev#echo_error("Tests failed (${result.summary.failing} failures)")`,
          );
        }
      } catch (e) {
        await denops.cmd(
          `call sfdev#echo_error("Test error: ${String(e)}")`,
        );
      }
    },
  };

  await denops.cmd('call sfdev#echo_info("sfdev.nvim loaded")');
}
