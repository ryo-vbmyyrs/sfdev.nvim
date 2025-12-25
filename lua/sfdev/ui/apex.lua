local Popup = require("nui.popup")
local Split = require("nui.split")
local Layout = require("nui.layout")

local M = {}

-- 実行結果を保存（エラー行へのジャンプ用）
M.last_result = nil

function M.show_execute_result(apex_code, result)
  -- Save result for error navigation
  M.last_result = {
    code = apex_code,
    result = result,
  }

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
  vim.bo[input_popup.bufnr].filetype = "apex"
  vim.bo[input_popup.bufnr].modifiable = false

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
      if result.line then
        table.insert(output_lines, string.format("Line: %d, Column: %d", result.line, result.column or 0))
      end
    end
    if result.exceptionMessage then
      table.insert(output_lines, "")
      table.insert(output_lines, "Exception:")
      table.insert(output_lines, result.exceptionMessage)
      if result.exceptionStackTrace then
        table.insert(output_lines, "")
        table.insert(output_lines, "Stack Trace:")
        table.insert(output_lines, result.exceptionStackTrace)
      end
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

  -- Add help text if there's an error with line info
  if not result.success and result.line then
    table.insert(output_lines, "")
    table.insert(output_lines, "Press <CR> to jump to error line")
  end

  vim.api.nvim_buf_set_lines(output_popup.bufnr, 0, -1, false, output_lines)
  vim.bo[output_popup.bufnr].modifiable = false

  -- Syntax highlighting
  vim.api.nvim_buf_call(output_popup.bufnr, function()
    vim.cmd([[syntax match SFSuccess /✓.*/]])
    vim.cmd([[syntax match SFFailed /✗.*/]])
    vim.cmd([[syntax match SFLog /USER_DEBUG.*/]])
    vim.cmd([[highlight SFSuccess guifg=#98c379]])
    vim.cmd([[highlight SFFailed guifg=#e06c75]])
    vim.cmd([[highlight SFLog guifg=#61afef]])
  end)

  -- Error navigation mapping
  if not result.success and result.line then
    output_popup:map("n", "<CR>", function()
      M.goto_error_line(result.line, result.column)
      layout:unmount()
    end, { noremap = true })
  end

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

-- エラー行へジャンプ
function M.goto_error_line(line, column)
  -- 前のウィンドウに戻る
  vim.cmd("wincmd p")
  
  -- 該当行へジャンプ (column is 1-based, nvim_win_set_cursor expects 0-based column)
  local col_zero_based = math.max(0, (column or 1) - 1)
  vim.api.nvim_win_set_cursor(0, { line, col_zero_based })
  
  -- ハイライト
  vim.fn.matchaddpos("Error", {{ line }})
  vim.defer_fn(function()
    vim.fn.clearmatches()
  end, 2000)
end

return M
