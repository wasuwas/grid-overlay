# Grid Overlay (Electron)

Windows向けのタスクトレイ常駐グリッドオーバーレイです。  
透明な最前面ウィンドウにグリッド線を描画し、常時クリック透過で下のアプリを操作できます。

## 必要環境

- Windows 10/11
- Node.js 18+ (推奨)

## セットアップ

```bash
npm install
```

## 起動

```bash
npm start
```

起動するとタスクトレイに常駐し、以下を操作できます。

- `Show Grid`: 表示ON/OFF
- `Display`: 表示対象モニタの選択
- `Grid Spacing`: グリッド間隔
- `Grid Color`: グリッド色
- `Grid Opacity`: グリッド透明度
- `Quit`: アプリ終了

## 設定ファイル

- ルートの `settings.json` に保存されます。
- 保存項目: `enabled`, `displayId`, `spacing`, `color`, `opacity`

## 既知の制約

- 管理者権限で実行されている一部アプリ上では、オーバーレイ表示が期待通りにならない場合があります。
- 一部のフルスクリーン描画やゲーム環境では最前面表示が制限されることがあります。

## 手動テストチェックリスト

- トレイの `Show Grid` で表示切替が即時反映される。
- グリッド表示中でも下層アプリを通常操作できる（クリック透過）。
- `Display` 変更で選択モニタにのみグリッドが表示される。
- `Grid Spacing` / `Grid Color` / `Grid Opacity` が即時反映される。
- 再起動後に設定が復元される。
# grid-overlay
