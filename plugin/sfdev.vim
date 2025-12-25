if exists('g:loaded_sfdev')
  finish
endif
let g:loaded_sfdev = 1

" Check for optional dependencies
let g:sfdev_has_telescope = luaeval("pcall(require, 'telescope')")
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
command! -range -nargs=? SFApexExecute call s:ExecuteApex(<line1>, <line2>, <q-args>)
command! -nargs=? SFRunTest call denops#request('sfdev', 'runTest', [<q-args>])

" Apex Log commands
if g:sfdev_has_telescope
  command! SFLogList lua require('sfdev.telescope').show_logs()
else
  command! SFLogList echo 'Telescope is required for log list view'
endif
command! -nargs=1 SFLogGet call denops#request('sfdev', 'getLog', [<f-args>])
command! -nargs=1 SFLogDelete call denops#request('sfdev', 'deleteLog', [<f-args>])
command! SFLogClear call denops#request('sfdev', 'clearLogs', [])

" デフォルト設定
let g:sfdev_default_org = get(g:, 'sfdev_default_org', '')
let g:sfdev_auto_deploy = get(g:, 'sfdev_auto_deploy', 0)
let g:sfdev_cli_path = get(g:, 'sfdev_cli_path', 'sf')

" Apex実行のラッパー関数
function! s:ExecuteApex(line1, line2, args) abort
  let l:code = ''
  
  " 引数が指定されている場合は引数を優先
  if !empty(a:args)
    let l:code = a:args
  " 範囲指定がある場合（Visual mode等）
  elseif a:line1 != a:line2
    let l:lines = getline(a:line1, a:line2)
    let l:code = join(l:lines, "\n")
  " 引数なし、範囲指定なし → バッファ全体
  else
    let l:lines = getline(1, '$')
    let l:code = join(l:lines, "\n")
  endif
  
  " 空のコードは実行しない
  if empty(trim(l:code))
    call sfdev#echo_error('No code to execute')
    return
  endif
  
  " Denopsを呼び出し
  call denops#request('sfdev', 'executeApex', [l:code])
endfunction

" キーマップの自動設定
augroup sfdev_keymaps
  autocmd!
  autocmd VimEnter * call sfdev#setup_keymaps()
  autocmd FileType apex call sfdev#setup_apex_keymaps()
augroup END

" Apexファイルタイプの設定
augroup sfdev_filetype
  autocmd!
  " .apex, .cls ファイルを apex filetype として認識
  autocmd BufNewFile,BufRead *.apex,*.cls setfiletype apex
augroup END
