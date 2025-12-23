-- Minimal init.lua for local development

-- ランタイムパスに追加
vim.opt.runtimepath:append("~/.local/share/nvim/lazy/denops.vim")
vim.opt.runtimepath:append(".")

-- Denopsのデバッグ設定
vim.g["denops#debug"] = 1
vim.g["denops#trace"] = 1

-- プラグインの読み込み
vim.cmd("runtime plugin/sfdev.vim")

-- デバッグ用のマッピング
vim.keymap.set("n", "<leader>sl", ":SFOrgList<CR>", { desc = "SF Org List" })
vim.keymap.set("n", "<leader>so", ":SFOrgOpen<CR>", { desc = "SF Org Open" })
vim.keymap.set("n", "<leader>sd", ":SFDeploy<CR>", { desc = "SF Deploy" })

-- ログ表示コマンド
vim.api.nvim_create_user_command("DenopsLog", "messages", {})
