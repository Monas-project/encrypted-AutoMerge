# アプリケーション設計ドキュメント

## 目的

ハッカソンで開発するアプリケーションのフロント側の設計を書いていく。

---

## アプリケーションについて

「サーバーがテキスト内容を読めない状態でユーザー同士がリアルタイムにテキストを共同編集できるアプリケーション」

- Google Docs 的な共同編集体験を提供  
- サーバーはどのような操作が行われたか、どんなコンテンツがあるかを知ることができない  
- サーバーの役割は、暗号化状態のまま **LWW に基づいて最新状態を判定**し、中継する  

---

## ユースケース

- ユーザーはブラウザで新しい文書を作成する  
- 文書はリンク（鍵を含むURL）で共有可能  
- 他のユーザーはリンクを知っていれば参加可能  
- 編集内容、操作は全て暗号化され同期サーバーを経由して他クライアントに配信される  
- サーバーは暗号化された operation/payload を受け取り、LWWに基づいて「最新」かどうかだけを判断  
- クライアントは受け取った暗号化データを復号化し、自身のUIに反映する  

---

## 機能リスト

- 文書作成・編集（text）  
- リアルタイム共同編集  
- ドキュメントの共有（リンクベース）  
- 鍵の生成と配布（URLに埋め込み or 別途共有）  

---

## 画面設計

- **テキストのエディタ画面**  
  - プレーンテキストのみ or リッチテキスト対応  
- **共有ダイアログ**  
  - リンクのコピー  

---

## 使えそうなライブラリ

**UI（テキスト）**  
- **CodeMirror 6**  
  - 軽量でカスタマイズしやすいテキストエディタ  
  - プレーンテキスト用途に適する  
- **Slate.js**  
  - React向けのリッチテキストフレームワーク  
  - JSONベースデータモデル → 暗号化前にシリアライズ可能  
- **TipTap**  
  - リッチテキスト志向（Notion/Google Docs ライク）  
  - PoC段階ではやや重厚  

**暗号ライブラリ**  
- 未選定（AES-GCM, WebCrypto API, libsodium など検討中）  

---

## ディレクトリ構成
```
src/
 ├── app/
 │    └── editor/
 │         ├── page.tsx
 │
 ├── components/
 │    └── Editor.tsx          # エディタUI
 │
 ├── application/
 │
 ├── infrastructure/
 │
 └── utils/
```

## シーケンス図
```mermaid
sequenceDiagram
    participant U1 as User1_Browser
    participant S as SyncServer
    participant U2 as User2_Browser

    Note over U1: Create document
    U1->>U1: Encrypt document
    U1->>U1: Generate CID (hash of encrypted content)
    U1->>S: {CID, EncryptedData, Timestamp} upload
    U1->>U2: Share LinkURL (CID + Key)

    Note over U2: Open document
    U2->>S: Get encrypted data by CID
    U2->>U2: Decrypt with Key → Show document

    U1->>U1: Edit (encrypt locally)
    U1->>U1: Generate new CID
    U1->>S: {NewCID, EncryptedData, Timestamp}
    S->>S: LWW judge → decide latest CID
    S->>U1: Send latest encrypted data
    S->>U2: Send latest encrypted data
    U1->>U1: Decrypt → Update UI
    U2->>U2: Decrypt → Update UI
```

```mermaid
sequenceDiagram
    participant U1 as ユーザー1ブラウザ
    participant S as 同期サーバー
    participant U2 as ユーザー2ブラウザ

    Note over U1: 新しい文書を作成
    U1->>U1: 文書を暗号化
    U1->>U1: CIDを生成（暗号化内容のハッシュ）
    U1->>S: {CID, 暗号化データ, タイムスタンプ} をアップロード
    U1->>U2: リンクURLを共有（CID + 鍵）

    Note over U2: 文書を開く
    U2->>S: CIDで暗号化データを取得
    U2->>U2: 鍵で復号 → 文書を表示

    U1->>U1: 編集（ローカルで暗号化）
    U1->>U1: 新しいCIDを生成
    U1->>S: {新CID, 暗号化データ, タイムスタンプ}
    S->>S: LWWで最新CIDを判定
    S->>U1: 最新の暗号化データを送信
    S->>U2: 最新の暗号化データを送信
    U1->>U1: 復号してUIを更新
    U2->>U2: 復号してUIを更新

    Note over S: サーバーは「暗号化データの保管」と「LWW判定」のみを担当
```

## JSON例
### 暗号化前のJSON
```json
{
  "text": "hello, world",
  "timestamp": 1736812345678
}
```

### リクエスト例
```json
{
  "id": "doc-1234",
  "content": "Q0FMAACf0sh84xzmkRZ3e1PY0lY9e+0i9Nxk21v8..."
}
```

### サーバーからの push 例
```json
{
  "id": "doc-1234",
  "content": "Q0FMAACf0sh84xzmkRZ3e1PY0lY9e+0i9Nxk21v8...",
  "timestamp": 1736812345678,
  "latest": true
}
```

## 受信後の処理順
1. サーバーからメッセージを受け取る
2. JSONをパースする
3. 暗号化された content を復号する
4. 復号結果をさらに JSON パースする
5. { text, timestamp } を取り出す
6. UIに反映する
7. ローカル状態を更新する

### 処理フロー図:
```
受信(JSON文字列)
   ↓
JSON.parse()
   ↓
暗号化データ(content)を復号
   ↓
復号後JSONをさらにJSON.parse()
   ↓
{text, timestamp} を取り出す
   ↓
UIに反映
   ↓
ローカル状態を更新
```
