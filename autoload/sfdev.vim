function! sfdev#echo_info(msg) abort
  echohl Comment
  echo '[sfdev]' a:msg
  echohl None
endfunction

function! sfdev#echo_error(msg) abort
  echohl ErrorMsg
  echo '[sfdev]' a:msg
  echohl None
endfunction

function! sfdev#echo_success(msg) abort
  echohl String
  echo '[sfdev]' a:msg
  echohl None
endfunction

" デフォルトのキーマップを設定
function! sfdev#setup_keymaps() abort
  " グローバルキーマップ
  if !exists('g:sfdev_no_default_keymaps')
    nnoremap <silent> <leader>se :SFApexExecute<CR>
    vnoremap <silent> <leader>se :'<,'>SFApexExecute<CR>
    
    nnoremap <silent> <leader>sl :SFOrgList<CR>
    nnoremap <silent> <leader>so :SFOrgOpen<CR>
    nnoremap <silent> <leader>sd :SFDeploy<CR>
    nnoremap <silent> <leader>sr :SFRetrieve<CR>
    nnoremap <silent> <leader>st :SFRunTest<CR>
  endif
endfunction

" Apexファイルタイプ専用のキーマップ
function! sfdev#setup_apex_keymaps() abort
  if !exists('g:sfdev_no_apex_keymaps')
    nnoremap <buffer> <silent> <leader>r :SFApexExecute<CR>
    vnoremap <buffer> <silent> <leader>r :'<,'>SFApexExecute<CR>
    
    " エラー行へジャンプ
    nnoremap <buffer> <silent> <leader>e :call sfdev#goto_error()<CR>
  endif
endfunction

" 最後の実行結果のエラー行にジャンプ
function! sfdev#goto_error() abort
  " Check if NUI is available (pcall returns [success, result])
  let l:pcall_result = luaeval("pcall(require, 'sfdev.ui.apex')")
  if !l:pcall_result[0]
    call sfdev#echo_error('Error navigation requires nui.nvim')
    return
  endif

  let l:result = luaeval("require('sfdev.ui.apex').last_result")
  
  if empty(l:result)
    call sfdev#echo_error('No execution result found')
    return
  endif
  
  let l:line = get(l:result.result, 'line', 0)
  let l:column = get(l:result.result, 'column', 1)
  
  if l:line > 0
    call cursor(l:line, l:column)
    call sfdev#echo_info('Jumped to error at line ' . l:line)
  else
    call sfdev#echo_error('No error line information available')
  endif
endfunction
