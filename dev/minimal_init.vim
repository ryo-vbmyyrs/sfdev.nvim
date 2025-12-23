" Minimal init.vim for local development

set runtimepath+=~/.local/share/nvim/lazy/denops.vim
set runtimepath+=.

" Denopsの設定
let g:denops#debug = 1
let g:denops#trace = 1

" プラグインの読み込み
runtime plugin/sfdev.vim

" デバッグ用のマッピング
nnoremap <leader>sl :SFOrgList<CR>
nnoremap <leader>so :SFOrgOpen<CR>
nnoremap <leader>sd :SFDeploy<CR>

" ログ表示
command! DenopsLog messages
