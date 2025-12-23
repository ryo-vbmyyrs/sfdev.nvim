-- Minimal init.lua for local development

-- Add to runtime path
vim.opt.runtimepath:append("~/.local/share/nvim/lazy/denops.vim")
vim.opt.runtimepath:append(".")

-- Denops debug configuration
vim.g["denops#debug"] = 1
vim.g["denops#trace"] = 1

-- Load the plugin
vim.cmd("runtime plugin/sfdev.vim")

-- Debug keymappings
vim.keymap.set("n", "<leader>sl", ":SFOrgList<CR>", { desc = "SF Org List" })
vim.keymap.set("n", "<leader>so", ":SFOrgOpen<CR>", { desc = "SF Org Open" })
vim.keymap.set("n", "<leader>sd", ":SFDeploy<CR>", { desc = "SF Deploy" })

-- Show logs command
vim.api.nvim_create_user_command("DenopsLog", "messages", {})
