# sfdev.nvim

Salesforce development plugin for Neovim with TypeScript/Denops

VSCodeのSalesforce拡張機能と同等の開発体験をNeovimで実現するプラグインです。

## Features

- 🚀 Salesforce CLI統合
- 📦 メタデータのデプロイ・取得
- 🔐 Org管理・認証
- ⚡ 匿名Apex実行
- 🧪 Apexテスト実行
- 💻 TypeScriptで型安全に実装

## Requirements

- Neovim 0.8+
- [Deno](https://deno.land/) 1.37+
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) (sf or sfdx)

### Optional (for rich UI)

- [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) - For interactive pickers
- [nui.nvim](https://github.com/MunifTanjim/nui.nvim) - For rich UI components
- [nvim-notify](https://github.com/rcarriga/nvim-notify) - For notifications
- [nvim-web-devicons](https://github.com/nvim-tree/nvim-web-devicons) - For icons

## Installation

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua
{
  'ryo-vbmyyrs/sfdev.nvim',
  dependencies = {
    'vim-denops/denops.vim',
    -- Optional UI dependencies
    'nvim-telescope/telescope.nvim',
    'MunifTanjim/nui.nvim',
    'rcarriga/nvim-notify',
    'nvim-tree/nvim-web-devicons',
  },
  config = function()
    require('sfdev').setup({
      -- Configuration options
    })
  end,
}
```

### Using [packer.nvim](https://github.com/wbthomason/packer.nvim)

```lua
use {
  'ryo-vbmyyrs/sfdev.nvim',
  requires = {
    'vim-denops/denops.vim',
    -- Optional UI dependencies
    'nvim-telescope/telescope.nvim',
    'MunifTanjim/nui.nvim',
    'rcarriga/nvim-notify',
    'nvim-tree/nvim-web-devicons',
  },
  config = function()
    require('sfdev').setup()
  end,
}
```

### Using [vim-plug](https://github.com/junegunn/vim-plug)

```vim
Plug 'vim-denops/denops.vim'
" Optional UI plugins
Plug 'nvim-telescope/telescope.nvim'
Plug 'MunifTanjim/nui.nvim'
Plug 'rcarriga/nvim-notify'
Plug 'nvim-tree/nvim-web-devicons'
Plug 'ryo-vbmyyrs/sfdev.nvim'
```

## Commands

| Command | Description |
|---------|-------------|
| `:SFOrgList` | 認証済みOrg一覧を表示（Telescope使用時は対話的なピッカー） |
| `:SFOrgOpen` | ブラウザでOrgを開く |
| `:SFDeploy` | 現在のファイル/プロジェクトをデプロイ |
| `:SFRetrieve` | メタデータを取得 |
| `:[range]SFApexExecute [code]` | 匿名Apexを実行（引数、選択範囲、またはバッファ全体） |
| `:SFRunTest [testName]` | Apexテストを実行 |

### Telescope Features

When [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) is installed, `:SFOrgList` provides an interactive picker with:

- **`<CR>`** (Enter) - Open selected org in browser
- **`<C-d>`** - Set selected org as default
- **`<C-x>`** - Logout from selected org
- Live preview of org details in the preview window

## Configuration

```lua
require('sfdev').setup({
  -- Use Telescope for org list (default: true if available)
  use_telescope = true,
  
  -- Use NUI for rich UI (default: true if available)
  use_nui = true,
  
  -- Use nvim-notify for notifications (default: true if available)
  use_notify = true,
  
  -- Salesforce CLI path
  cli_path = 'sf',
  
  -- Default org
  default_org = '',
  
  -- Auto deploy on save
  auto_deploy = false,
})
```

Or using Vimscript:

```vim
" デフォルトのOrg
let g:sfdev_default_org = ''

" 自動デプロイ（保存時に自動デプロイ）
let g:sfdev_auto_deploy = 0

" Salesforce CLIのパス
let g:sfdev_cli_path = 'sf'
```

## Usage Examples

### Basic Commands

```vim
" Org一覧を表示
:SFOrgList

" デフォルトOrgをブラウザで開く
:SFOrgOpen

" 現在のファイルをデプロイ
:SFDeploy

" 匿名Apexを実行（引数として渡す）
:SFApexExecute System.debug('Hello from Neovim!');

" 特定のテストを実行
:SFRunTest MyTestClass
```

### Execute Apex Code from Buffer

The `SFApexExecute` command now supports executing code from the current buffer:

```vim
" 1. Apexファイルを作成/開く
:edit test.apex

" 2. コードを記述
" System.debug('Hello from Neovim!');
" Account acc = new Account(Name='Test');
" insert acc;

" 3. バッファ全体を実行
:SFApexExecute

" または、キーマップを使用 (Normal mode)
<leader>se

" 4. 範囲を選択して実行 (Visual mode)
" ビジュアルモードでコードを選択してから:
'<,'>SFApexExecute
" または
<leader>se

" 5. Apexファイルでは専用のキーマップも使用可能
" Normal mode: <leader>r でバッファ全体を実行
" Visual mode: <leader>r で選択範囲を実行
```

### Default Keymaps

Global keymaps (work in all file types):
- `<leader>se` - Execute Apex (buffer or visual selection)
- `<leader>sl` - List Orgs
- `<leader>so` - Open Org in browser
- `<leader>sd` - Deploy current file
- `<leader>sr` - Retrieve metadata
- `<leader>st` - Run tests

Apex file keymaps (only in `.apex` or `.cls` files):
- `<leader>r` - Execute Apex (buffer or visual selection)
- `<leader>e` - Jump to error line (after execution failure)

To disable default keymaps:
```vim
let g:sfdev_no_default_keymaps = 1  " Disable all default keymaps
let g:sfdev_no_apex_keymaps = 1     " Disable only Apex file keymaps
```

## Roadmap

- [ ] Apex Language Server統合
- [ ] SOQL実行・結果表示
- [ ] Org Browser（オブジェクト・フィールド一覧）
- [ ] ログビューア
- [ ] LWC/Auraコンポーネントサポート
- [ ] Code completion
- [ ] Diagnostics integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development

### Local Development Setup

ローカルで開発・動作確認を行う方法：

#### 前提条件

- Neovim 0.8+
- Deno 1.37+
- denops.vim がインストールされていること

#### 起動方法

```bash
# 開発用スクリプトで起動
chmod +x dev/run.sh
./dev/run.sh

# または、直接起動（Lua設定の場合）
nvim -u dev/minimal_init.lua

# または、直接起動（Vim設定の場合）
nvim -u dev/minimal_init.vim
```

#### デバッグ

```vim
" Denopsのログを確認
:messages

" Denopsの状態を確認
:echo denops#server#status()

" プラグインのリロード
:call denops#plugin#reload('sfdev')
```

#### ディレクトリ構造

```
dev/
├── minimal_init.vim   # 開発用Vim設定
├── minimal_init.lua   # 開発用Lua設定
└── run.sh            # 起動スクリプト
```

### テスト

```bash
# 型チェック
deno task check

# フォーマット
deno task fmt

# Lint
deno task lint
```

### デバッグのヒント

1. **Denopsが起動しない場合**
   ```vim
   :checkhealth denops
   ```

2. **プラグインが読み込まれない場合**
   ```vim
   :echo denops#plugin#is_loaded('sfdev')
   :call denops#cache#reload()
   ```

3. **エラーログの確認**
   ```vim
   :messages
   :DenopsLog
   ```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

ryo-vbmyyrs
