local M = {}

-- Check if optional dependencies are available
M.has_telescope = pcall(require, "telescope")
M.has_nui = pcall(require, "nui.popup")
M.has_notify = pcall(require, "notify")

-- Setup function
function M.setup(opts)
  opts = opts or {}
  
  -- Setup notify if available
  if M.has_notify then
    vim.notify = require("notify")
  end
  
  return M
end

-- Notify helper
function M.notify(msg, level, title)
  level = level or vim.log.levels.INFO
  title = title or "sfdev.nvim"
  
  if M.has_notify then
    vim.notify(msg, level, { title = title })
  else
    local level_names = {
      [vim.log.levels.ERROR] = "ERROR",
      [vim.log.levels.WARN] = "WARN",
      [vim.log.levels.INFO] = "INFO",
      [vim.log.levels.DEBUG] = "DEBUG",
    }
    local level_name = level_names[level] or "INFO"
    vim.api.nvim_echo({{ string.format("[%s] %s", title, msg), level_name }}, true, {})
  end
end

return M
