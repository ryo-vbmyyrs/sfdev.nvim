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

## Installation

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua
{
  'ryo-vbmyyrs/sfdev.nvim',
  dependencies = {
    'vim-denops/denops.vim',
  },
  config = function()
    -- Optional: カスタム設定
    vim.g.sfdev_default_org = 'myorg'
    vim.g.sfdev_auto_deploy = 0
  end,
}
```

### Using [packer.nvim](https://github.com/wbthomason/packer.nvim)

```lua
use {
  'ryo-vbmyyrs/sfdev.nvim',
  requires = {
    'vim-denops/denops.vim',
  },
}
```

### Using [vim-plug](https://github.com/junegunn/vim-plug)

```vim
Plug 'vim-denops/denops.vim'
Plug 'ryo-vbmyyrs/sfdev.nvim'
```

## Commands

| Command | Description |
|---------|-------------|
| `:SFOrgList` | 認証済みOrg一覧を表示 |
| `:SFOrgOpen` | ブラウザでOrgを開く |
| `:SFDeploy` | 現在のファイル/プロジェクトをデプロイ |
| `:SFRetrieve` | メタデータを取得 |
| `:SFApexExecute [code]` | 匿名Apexを実行 |
| `:SFRunTest [testName]` | Apexテストを実行 |

## Configuration

```vim
" デフォルトのOrg
let g:sfdev_default_org = ''

" 自動デプロイ（保存時に自動デプロイ）
let g:sfdev_auto_deploy = 0

" Salesforce CLIのパス
let g:sfdev_cli_path = 'sf'
```

## Usage Examples

```vim
" Org一覧を表示
:SFOrgList

" デフォルトOrgをブラウザで開く
:SFOrgOpen

" 現在のファイルをデプロイ
:SFDeploy

" 匿名Apexを実行
:SFApexExecute System.debug('Hello from Neovim!');

" 特定のテストを実行
:SFRunTest MyTestClass
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

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

ryo-vbmyyrs
