if exists('g:loaded_sfdev')
  finish
endif
let g:loaded_sfdev = 1

" コマンドの定義
command! SFOrgList call denops#request('sfdev', 'listOrgs', [])
command! SFOrgOpen call denops#request('sfdev', 'openOrg', [])
command! SFDeploy call denops#request('sfdev', 'deploy', [])
command! SFRetrieve call denops#request('sfdev', 'retrieve', [])
command! -nargs=? SFApexExecute call denops#request('sfdev', 'executeApex', [<q-args>])
command! -nargs=? SFRunTest call denops#request('sfdev', 'runTest', [<q-args>])

" デフォルト設定
let g:sfdev_default_org = get(g:, 'sfdev_default_org', '')
let g:sfdev_auto_deploy = get(g:, 'sfdev_auto_deploy', 0)
let g:sfdev_cli_path = get(g:, 'sfdev_cli_path', 'sf')
