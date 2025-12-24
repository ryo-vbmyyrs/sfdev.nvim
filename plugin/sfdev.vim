if exists('g:loaded_sfdev')
  finish
endif
let g:loaded_sfdev = 1

" Check for optional dependencies
let g:sfdev_has_telescope = exists('g:loaded_telescope')
let g:sfdev_has_nui = luaeval("pcall(require, 'nui.popup')")
let g:sfdev_has_notify = luaeval("pcall(require, 'notify')")

" コマンドの定義
" Use Telescope for org list if available, otherwise use default
if g:sfdev_has_telescope
  command! SFOrgList lua require('sfdev.telescope').show_orgs()
else
  command! SFOrgList call denops#request('sfdev', 'listOrgs', [])
endif

command! SFOrgOpen call denops#request('sfdev', 'openOrg', [])
command! SFDeploy call denops#request('sfdev', 'deploy', [])
command! SFRetrieve call denops#request('sfdev', 'retrieve', [])
command! -nargs=? SFApexExecute call denops#request('sfdev', 'executeApex', [<q-args>])
command! -nargs=? SFRunTest call denops#request('sfdev', 'runTest', [<q-args>])

" デフォルト設定
let g:sfdev_default_org = get(g:, 'sfdev_default_org', '')
let g:sfdev_auto_deploy = get(g:, 'sfdev_auto_deploy', 0)
let g:sfdev_cli_path = get(g:, 'sfdev_cli_path', 'sf')
