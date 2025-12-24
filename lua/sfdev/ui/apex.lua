local Popup = require("nui.popup")
local Split = require("nui.split")
local Layout = require("nui.layout")

local M = {}

function M.show_execute_result(apex_code, result)
  local input_popup = Popup({
    border = {
      style = "rounded",
      text = {
        top = " Input ",
        top_align = "center",
      },
    },
  })

  local output_popup = Popup({
    border = {
      style = "rounded",
      text = {
        top = " Output ",
        top_align = "center",
      },
    },
  })

  local layout = Layout(
    {
      position = "50%",
      size = {
        width = "80%",
        height = "80%",
      },
    },
    Layout.Box({
      Layout.Box(input_popup, { size = "40%" }),
      Layout.Box(output_popup, { size = "60%" }),
    }, { dir = "row" })
  )

  layout:mount()

  -- Input content
  local input_lines = vim.split(apex_code, "\n")
  vim.api.nvim_buf_set_lines(input_popup.bufnr, 0, -1, false, input_lines)
  vim.api.nvim_buf_set_option(input_popup.bufnr, "filetype", "apex")
  vim.api.nvim_buf_set_option(input_popup.bufnr, "modifiable", false)

  -- Output content
  local output_lines = {}
  
  if result.success then
    table.insert(output_lines, "✓ Compiled successfully")
    table.insert(output_lines, "✓ Executed successfully")
  else
    table.insert(output_lines, "✗ Execution failed")
    if result.compileProblem then
      table.insert(output_lines, "")
      table.insert(output_lines, "Compile Error:")
      table.insert(output_lines, result.compileProblem)
    end
    if result.exceptionMessage then
      table.insert(output_lines, "")
      table.insert(output_lines, "Exception:")
      table.insert(output_lines, result.exceptionMessage)
    end
  end

  table.insert(output_lines, "")
  table.insert(output_lines, "Debug Logs:")
  table.insert(output_lines, "─────────────────────────────────────")

  if result.logs then
    for _, log in ipairs(result.logs) do
      table.insert(output_lines, log)
    end
  end

  if result.executionTime then
    table.insert(output_lines, "")
    table.insert(output_lines, string.format("Execution time: %dms", result.executionTime))
  end

  vim.api.nvim_buf_set_lines(output_popup.bufnr, 0, -1, false, output_lines)
  vim.api.nvim_buf_set_option(output_popup.bufnr, "modifiable", false)

  -- Syntax highlighting
  vim.api.nvim_buf_call(output_popup.bufnr, function()
    vim.cmd([[syntax match SFSuccess /✓.*/]])
    vim.cmd([[syntax match SFFailed /✗.*/]])
    vim.cmd([[syntax match SFLog /USER_DEBUG.*/]])
    vim.cmd([[highlight SFSuccess guifg=#98c379]])
    vim.cmd([[highlight SFFailed guifg=#e06c75]])
    vim.cmd([[highlight SFLog guifg=#61afef]])
  end)

  -- Close mappings
  local function close_all()
    layout:unmount()
  end

  input_popup:map("n", "q", close_all, { noremap = true })
  input_popup:map("n", "<Esc>", close_all, { noremap = true })
  output_popup:map("n", "q", close_all, { noremap = true })
  output_popup:map("n", "<Esc>", close_all, { noremap = true })

  return layout
end

return M
