local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local previewers = require("telescope.previewers")
local entry_display = require("telescope.pickers.entry_display")

local M = {}

-- Icons for org types
local icons = {
  default = "✓",
  sandbox = "🟡",
  production = "🔴",
  scratch = "🔵",
  devhub = "⭐",
}

-- Parse org list from JSON
local function parse_orgs(result)
  local ok, data = pcall(vim.json.decode, result.stdout)
  if not ok then
    require("sfdev").notify("Failed to parse org list JSON: " .. tostring(data), vim.log.levels.ERROR)
    return {}
  end
  
  local orgs = {}
  if data.result and data.result.nonScratchOrgs then
    for _, org in ipairs(data.result.nonScratchOrgs) do
      table.insert(orgs, org)
    end
  end
  if data.result and data.result.scratchOrgs then
    for _, org in ipairs(data.result.scratchOrgs) do
      org.isScratch = true
      table.insert(orgs, org)
    end
  end
  
  return orgs
end

-- Create org picker
function M.org_picker(orgs)
  local displayer = entry_display.create({
    separator = " ",
    items = {
      { width = 2 },
      { width = 25 },
      { width = 20 },
      { width = 15 },
      { remaining = true },
    },
  })

  local function make_display(entry)
    local icon = icons.default
    if entry.value.isDefaultUsername then
      icon = icons.default
    elseif entry.value.isScratch then
      icon = icons.scratch
    elseif entry.value.isDevHub then
      icon = icons.devhub
    end

    return displayer({
      { icon, "TelescopeResultsIdentifier" },
      { entry.value.alias or "", "TelescopeResultsField" },
      { entry.value.username or "", "TelescopeResultsComment" },
      { entry.value.orgId and entry.value.orgId:sub(1, 15) or "", "TelescopeResultsNumber" },
      { entry.value.instanceUrl or "", "TelescopeResultsString" },
    })
  end

  local function entry_maker(org)
    return {
      value = org,
      display = make_display,
      ordinal = string.format("%s %s %s", org.alias or "", org.username or "", org.orgId or ""),
    }
  end

  pickers.new({}, {
    prompt_title = "Salesforce Orgs",
    finder = finders.new_table({
      results = orgs,
      entry_maker = entry_maker,
    }),
    sorter = conf.generic_sorter({}),
    previewer = previewers.new_buffer_previewer({
      title = "Org Details",
      define_preview = function(self, entry)
        local org = entry.value
        local lines = {
          "Salesforce Org Information",
          "═══════════════════════════════════════",
          "",
          string.format("Alias:           %s", org.alias or "N/A"),
          string.format("Username:        %s", org.username or "N/A"),
          string.format("Org ID:          %s", org.orgId or "N/A"),
          string.format("Instance URL:    %s", org.instanceUrl or "N/A"),
          string.format("Connected:       %s", org.connectedStatus or "N/A"),
          "",
          "Status:",
          string.format("  Default:       %s", org.isDefaultUsername and "Yes" or "No"),
          string.format("  DevHub:        %s", org.isDevHub and "Yes" or "No"),
          string.format("  Scratch:       %s", org.isScratch and "Yes" or "No"),
        }
        
        vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
        vim.bo[self.state.bufnr].filetype = "markdown"
      end,
    }),
    attach_mappings = function(prompt_bufnr, map)
      -- Open in browser
      actions.select_default:replace(function()
        local selection = action_state.get_selected_entry()
        actions.close(prompt_bufnr)
        
        if selection then
          local ok, err = pcall(vim.fn["denops#request"], "sfdev", "openOrg", { selection.value.alias or selection.value.username })
          if not ok then
            require("sfdev").notify("Failed to open org: " .. tostring(err), vim.log.levels.ERROR)
          end
        end
      end)

      -- Set as default
      map("i", "<C-d>", function()
        local selection = action_state.get_selected_entry()
        if selection then
          local ok, err = pcall(vim.fn["denops#request"], "sfdev", "setDefaultOrg", { selection.value.alias or selection.value.username })
          if ok then
            require("sfdev").notify("Set as default: " .. (selection.value.alias or selection.value.username), vim.log.levels.INFO)
          else
            require("sfdev").notify("Failed to set default org: " .. tostring(err), vim.log.levels.ERROR)
          end
        end
      end)

      -- Logout
      map("i", "<C-x>", function()
        local selection = action_state.get_selected_entry()
        if selection then
          local confirm = vim.fn.confirm(
            "Logout from " .. (selection.value.alias or selection.value.username) .. "?",
            "&Yes\n&No",
            2
          )
          if confirm == 1 then
            local ok, err = pcall(vim.fn["denops#request"], "sfdev", "logoutOrg", { selection.value.alias or selection.value.username })
            if not ok then
              require("sfdev").notify("Failed to logout: " .. tostring(err), vim.log.levels.ERROR)
            end
            actions.close(prompt_bufnr)
          end
        end
      end)

      return true
    end,
  }):find()
end

-- Show org list with Telescope
function M.show_orgs()
  -- Call denops request asynchronously using vim.schedule
  vim.schedule(function()
    local ok, result = pcall(vim.fn["denops#request"], "sfdev", "listOrgsJson", {})
    
    if not ok then
      require("sfdev").notify("Failed to fetch orgs: " .. tostring(result), vim.log.levels.ERROR)
      return
    end
    
    if result and result.success then
      local orgs = parse_orgs(result)
      if #orgs > 0 then
        M.org_picker(orgs)
      else
        require("sfdev").notify("No orgs found", vim.log.levels.WARN)
      end
    else
      local error_msg = result and result.stderr or "Unknown error"
      require("sfdev").notify("Failed to fetch orgs: " .. error_msg, vim.log.levels.ERROR)
    end
  end)
end

-- Apex Log Picker
function M.log_picker(logs)
  local displayer = entry_display.create({
    separator = " ",
    items = {
      { width = 2 },
      { width = 20 },
      { width = 30 },
      { width = 10 },
      { width = 10 },
      { remaining = true },
    },
  })

  local log_icons = {
    Async = "⚡",
    API = "📡",
    Monitoring = "📊",
    [""] = "📝",
  }

  local function make_display(entry)
    local log = entry.value
    local icon = log_icons[log.Request] or log_icons[""]
    local operation = log.Operation or "N/A"
    local duration = log.DurationMilliseconds and (log.DurationMilliseconds .. "ms") or "N/A"
    local size = log.LogLength and (math.floor(log.LogLength / 1024) .. "KB") or "N/A"
    local status_hl = log.Status == "Success" and "TelescopeResultsString" or "TelescopeResultsError"

    return displayer({
      { icon, "TelescopeResultsIdentifier" },
      { log.StartTime:sub(1, 19):gsub("T", " "), "TelescopeResultsComment" },
      { operation:sub(1, 30), "TelescopeResultsField" },
      { duration, "TelescopeResultsNumber" },
      { size, "TelescopeResultsNumber" },
      { log.Status or "Unknown", status_hl },
    })
  end

  local function entry_maker(log)
    return {
      value = log,
      display = make_display,
      ordinal = string.format("%s %s %s", log.StartTime or "", log.Operation or "", log.Status or ""),
    }
  end

  pickers.new({}, {
    prompt_title = "Salesforce Apex Logs",
    finder = finders.new_table({
      results = logs,
      entry_maker = entry_maker,
    }),
    sorter = conf.generic_sorter({}),
    previewer = previewers.new_buffer_previewer({
      title = "Log Details",
      define_preview = function(self, entry)
        local log = entry.value
        local lines = {
          "Apex Log Information",
          "═══════════════════════════════════════",
          "",
          string.format("Log ID:          %s", log.Id or "N/A"),
          string.format("Start Time:      %s", log.StartTime or "N/A"),
          string.format("Operation:       %s", log.Operation or "N/A"),
          string.format("Status:          %s", log.Status or "N/A"),
          string.format("Duration:        %s ms", log.DurationMilliseconds or "N/A"),
          string.format("Size:            %s bytes", log.LogLength or "N/A"),
          string.format("Location:        %s", log.Location or "N/A"),
          string.format("Application:     %s", log.Application or "N/A"),
          string.format("Request Type:    %s", log.Request or "N/A"),
          "",
          "User Information:",
          string.format("  User ID:       %s", log.LogUserId or "N/A"),
          string.format("  User Name:     %s", (log.LogUser and log.LogUser.Name) or "N/A"),
        }
        
        vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
        vim.api.nvim_buf_set_option(self.state.bufnr, "filetype", "markdown")
      end,
    }),
    attach_mappings = function(prompt_bufnr, map)
      -- Open log
      actions.select_default:replace(function()
        local selection = action_state.get_selected_entry()
        actions.close(prompt_bufnr)
        
        if selection then
          vim.fn["denops#request"]("sfdev", "getLog", { selection.value.Id })
        end
      end)

      -- Delete log
      map("i", "<C-d>", function()
        local selection = action_state.get_selected_entry()
        if selection then
          local confirm = vim.fn.confirm(
            "Delete log " .. selection.value.Id .. "?",
            "&Yes\n&No",
            2
          )
          if confirm == 1 then
            vim.fn["denops#request"]("sfdev", "deleteLog", { selection.value.Id })
            -- Refresh the picker
            vim.defer_fn(function()
              actions.close(prompt_bufnr)
              M.show_logs()
            end, 500)
          end
        end
      end)

      -- Refresh
      map("i", "<C-r>", function()
        actions.close(prompt_bufnr)
        M.show_logs()
        require("sfdev").notify("Refreshing logs...", vim.log.levels.INFO)
      end)

      -- Clear all logs
      map("i", "<C-a>", function()
        local confirm = vim.fn.confirm(
          "Delete ALL logs?",
          "&Yes\n&No",
          2
        )
        if confirm == 1 then
          actions.close(prompt_bufnr)
          vim.fn["denops#request"]("sfdev", "clearLogs", {})
        end
      end)

      return true
    end,
  }):find()
end

-- Show logs with Telescope
function M.show_logs()
  vim.fn["denops#request"]("sfdev", "listLogs", {}, function(result)
    if result and result.success then
      if result.logs and #result.logs > 0 then
        M.log_picker(result.logs)
      else
        require("sfdev").notify("No logs found", vim.log.levels.WARN)
      end
    else
      require("sfdev").notify("Failed to fetch logs", vim.log.levels.ERROR)
    end
  end)
end

return M
