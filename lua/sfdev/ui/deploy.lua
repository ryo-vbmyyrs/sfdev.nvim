local Popup = require("nui.popup")
local event = require("nui.utils.autocmd").event

local M = {}

function M.show_deploy_progress(deploy_id)
  local popup = Popup({
    enter = true,
    focusable = true,
    border = {
      style = "rounded",
      text = {
        top = " Deploy Progress ",
        top_align = "center",
      },
    },
    position = "50%",
    size = {
      width = "60%",
      height = "60%",
    },
  })

  -- Mount popup
  popup:mount()

  -- Close on q or Esc
  popup:map("n", "q", function()
    popup:unmount()
  end, { noremap = true })

  popup:map("n", "<Esc>", function()
    popup:unmount()
  end, { noremap = true })

  -- Initial content
  local lines = {
    "Deploying to org...",
    "",
    "Deploy ID: " .. (deploy_id or "N/A"),
    "",
    "Status: Starting...",
  }

  vim.api.nvim_buf_set_lines(popup.bufnr, 0, -1, false, lines)
  vim.bo[popup.bufnr].modifiable = false

  return popup
end

function M.update_deploy_progress(popup, status)
  if not popup or not vim.api.nvim_buf_is_valid(popup.bufnr) then
    return
  end

  vim.bo[popup.bufnr].modifiable = true

  local lines = {
    "Deploying to: " .. (status.targetOrg or "default org"),
    "",
  }

  -- Progress bar
  local progress = status.progress or 0
  local bar_width = 40
  local filled = math.floor(bar_width * progress / 100)
  local bar = string.rep("█", filled) .. string.rep("░", bar_width - filled)
  table.insert(lines, string.format("%s  %d%%", bar, progress))
  table.insert(lines, "")

  -- File status
  if status.components then
    for _, component in ipairs(status.components) do
      local icon = "⏳"
      if component.status == "success" then
        icon = "✓"
      elseif component.status == "failed" then
        icon = "✗"
      end
      table.insert(lines, string.format("%s %s", icon, component.name))
    end
  end

  table.insert(lines, "")
  table.insert(lines, string.format("Status: %s  (Elapsed: %s)", status.status or "Processing", status.elapsed or "00:00"))

  vim.api.nvim_buf_set_lines(popup.bufnr, 0, -1, false, lines)
  vim.bo[popup.bufnr].modifiable = false

  -- Syntax highlighting
  vim.api.nvim_buf_call(popup.bufnr, function()
    vim.cmd([[syntax match SFDeploySuccess /✓.*/]])
    vim.cmd([[syntax match SFDeployFailed /✗.*/]])
    vim.cmd([[syntax match SFDeployPending /⏳.*/]])
    vim.cmd([[highlight SFDeploySuccess guifg=#98c379]])
    vim.cmd([[highlight SFDeployFailed guifg=#e06c75]])
    vim.cmd([[highlight SFDeployPending guifg=#d19a66]])
  end)
end

return M
