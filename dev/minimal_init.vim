" Minimal init.vim for local development

set runtimepath+=~/.local/share/nvim/lazy/denops.vim
set runtimepath+=.

" Denops configuration
let g:denops#debug = 1
let g:denops#trace = 1

" Load the plugin
runtime plugin/sfdev.vim

" Debug keymappings
nnoremap <leader>sl :SFOrgList<CR>
nnoremap <leader>so :SFOrgOpen<CR>
nnoremap <leader>sd :SFDeploy<CR>

" Show logs
command! DenopsLog messages
