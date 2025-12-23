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
