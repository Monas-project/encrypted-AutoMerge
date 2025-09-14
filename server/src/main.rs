use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        DefaultBodyLimit, Path, Query, State,
    },
    http::Method,
    routing::{get, post},
    Json, Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock, Mutex};
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use base64::{engine::general_purpose, Engine as _};
use bincode;
use tfhe::shortint::{Ciphertext as ShortintCiphertext, CompressedServerKey as ShortintCompressedServerKey, ServerKey as ShortintServerKey};
use rusqlite::{Connection, params};

#[derive(Clone, Debug, Serialize, Deserialize)]
struct WsClientUpdate {
    doc_id: String,
    ts_cts: Vec<String>,
    id_cts: Vec<String>,
    content_id: String,
    content_cts: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct WsServerSelected {
    doc_id: String,
    selected_id_cts: Vec<String>,
}

#[derive(Clone)]
struct AppState {
    shortint_server_key: Arc<RwLock<Option<ShortintServerKey>>>,
    documents: Arc<RwLock<HashMap<String, DocumentState>>>,
    contents: Arc<RwLock<HashMap<String, Vec<String>>>>,
    content_created: Arc<RwLock<HashMap<String, Instant>>>,
    rooms: Arc<RwLock<HashMap<String, broadcast::Sender<String>>>>,
    db: Arc<Mutex<Connection>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct DocumentState {
    doc_id: String,
    selected_id_cts_b64: Vec<String>,
    selected_ts_cts_b64: Vec<String>,
}

#[derive(Deserialize)]
struct WsJoin { doc_id: String }

const TIMESTAMP_DIGITS: usize = 16;
const MAX_CONTENT_LEN: usize = 64;
const CONTENT_NIBBLES: usize = MAX_CONTENT_LEN * 2;

fn b64_to_shortint_ct(b64: &str) -> ShortintCiphertext {
    let bytes = general_purpose::STANDARD.decode(b64.as_bytes()).unwrap();
    bincode::deserialize::<ShortintCiphertext>(&bytes).unwrap()
}

fn shortint_ct_to_b64(ct: &ShortintCiphertext) -> String {
    let bytes = bincode::serialize(ct).unwrap();
    general_purpose::STANDARD.encode(bytes)
}

fn shortint_gt_digits(sk: &ShortintServerKey, a: &[ShortintCiphertext], b: &[ShortintCiphertext]) -> ShortintCiphertext {
    assert_eq!(a.len(), b.len());
    let mut eq_prefix = sk.create_trivial(1);
    let mut res = sk.create_trivial(0);
    for (da, db) in a.iter().zip(b.iter()) {
        let gt_i = sk.unchecked_greater(da, db);
        let eq_i = sk.unchecked_equal(da, db);
        let term = sk.unchecked_bitand(&eq_prefix, &gt_i);
        res = sk.unchecked_bitor(&res, &term);
        eq_prefix = sk.unchecked_bitand(&eq_prefix, &eq_i);
    }
    res
}

fn shortint_mux(sk: &ShortintServerKey, sel: &ShortintCiphertext, x: &ShortintCiphertext, y: &ShortintCiphertext) -> ShortintCiphertext {
    let one = sk.create_trivial(1);
    let not_sel = sk.unchecked_bitxor(&one, sel);
    let lut_and = sk.generate_lookup_table_bivariate(|s, v| if s == 1 { v } else { 0 });
    let a = sk.unchecked_apply_lookup_table_bivariate(sel, x, &lut_and);
    let b = sk.unchecked_apply_lookup_table_bivariate(&not_sel, y, &lut_and);
    sk.unchecked_bitor(&a, &b)
}

fn ensure_room(state: &AppState, doc_id: &str) -> broadcast::Sender<String> {
    let mut rooms = state.rooms.write().unwrap();
    if let Some(tx) = rooms.get(doc_id) { return tx.clone(); }
    let (tx, _rx) = broadcast::channel::<String>(128);
    rooms.insert(doc_id.to_string(), tx.clone());
    tx
}

async fn ws_handler(ws: WebSocketUpgrade, Query(WsJoin { doc_id }): Query<WsJoin>, State(state): State<AppState>) -> impl axum::response::IntoResponse {
    ws.on_upgrade(move |socket| {
        let state = state.clone();
        let doc_id = doc_id.clone();
        async move { handle_socket(socket, state, doc_id).await }
    })
}

async fn handle_socket(mut socket: WebSocket, state: AppState, doc_id: String) {
    let room_tx = ensure_room(&state, &doc_id);

    // send initial selected id if exists
    let initial_msg: Option<String> = {
        let guard = state.documents.read().unwrap();
        guard.get(&doc_id).map(|rec| serde_json::to_string(&WsServerSelected {
            doc_id: rec.doc_id.clone(),
            selected_id_cts: rec.selected_id_cts_b64.clone(),
        }).unwrap())
    };
    if let Some(msg) = initial_msg { let _ = socket.send(Message::Text(msg)).await; }

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let mut room_rx2 = room_tx.subscribe();
    let forward_task = tokio::spawn(async move {
        while let Ok(text) = room_rx2.recv().await {
            if ws_sender.send(Message::Text(text)).await.is_err() { break; }
        }
    });

    while let Some(Ok(msg)) = ws_receiver.next().await {
        if let Message::Text(text) = msg {
            match serde_json::from_str::<WsClientUpdate>(&text) {
                Ok(WsClientUpdate { doc_id, ts_cts, id_cts, content_id, content_cts }) => {
                    let sk_opt = state.shortint_server_key.read().unwrap().clone();
                    let Some(sk) = sk_opt else { continue; };

                    // decode digits
                    let mut new_ts_digits: Vec<ShortintCiphertext> = ts_cts.iter().map(|b| b64_to_shortint_ct(b)).collect();
                    let mut new_id_digits: Vec<ShortintCiphertext> = id_cts.iter().map(|b| b64_to_shortint_ct(b)).collect();
                    let mut new_content_nibbles_b64: Vec<String> = content_cts.clone();

                    // normalize sizes
                    let zeros = || sk.create_trivial(0);
                    let fix_len = |mut v: Vec<ShortintCiphertext>, len: usize| {
                        if v.len() < len { let mut padded = Vec::with_capacity(len); for _ in 0..(len - v.len()) { padded.push(zeros()); } padded.extend(v.into_iter()); return padded; }
                        if v.len() > len { return v[v.len() - len..].to_vec(); }
                        v
                    };
                    new_ts_digits = fix_len(new_ts_digits, TIMESTAMP_DIGITS);
                    new_id_digits = fix_len(new_id_digits, TIMESTAMP_DIGITS);

                    // compare and cmux for selected ts and id
                    let updated_doc = {
                        let mut docs = state.documents.write().unwrap();
                        if let Some(existing) = docs.get(&doc_id) {
                            let old_ts_digits: Vec<ShortintCiphertext> = existing.selected_ts_cts_b64.iter().map(|b| b64_to_shortint_ct(b)).collect();
                            let old_id_digits: Vec<ShortintCiphertext> = existing.selected_id_cts_b64.iter().map(|b| b64_to_shortint_ct(b)).collect();
                            let old_ts_digits = fix_len(old_ts_digits, TIMESTAMP_DIGITS);
                            let old_id_digits = fix_len(old_id_digits, TIMESTAMP_DIGITS);

                            let sel = shortint_gt_digits(&sk, &new_ts_digits, &old_ts_digits);
                            let mux_ts: Vec<ShortintCiphertext> = new_ts_digits.iter().zip(old_ts_digits.iter()).map(|(n, o)| shortint_mux(&sk, &sel, n, o)).collect();
                            let mux_id: Vec<ShortintCiphertext> = new_id_digits.iter().zip(old_id_digits.iter()).map(|(n, o)| shortint_mux(&sk, &sel, n, o)).collect();
                            let selected_ts_cts_b64 = mux_ts.iter().map(|ct| shortint_ct_to_b64(ct)).collect::<Vec<_>>();
                            let selected_id_cts_b64 = mux_id.iter().map(|ct| shortint_ct_to_b64(ct)).collect::<Vec<_>>();
                            let rec = DocumentState { doc_id: doc_id.clone(), selected_id_cts_b64, selected_ts_cts_b64 };
                            docs.insert(doc_id.clone(), rec.clone());
                            rec
                        } else {
                            let selected_ts_cts_b64 = new_ts_digits.iter().map(|ct| shortint_ct_to_b64(ct)).collect::<Vec<_>>();
                            let selected_id_cts_b64 = new_id_digits.iter().map(|ct| shortint_ct_to_b64(ct)).collect::<Vec<_>>();
                            let rec = DocumentState { doc_id: doc_id.clone(), selected_id_cts_b64, selected_ts_cts_b64 };
                            docs.insert(doc_id.clone(), rec.clone());
                            rec
                        }
                    };

                    // store content by plaintext content_id, enforce nibble count and pad with trivial zeros
                    {
                        let mut contents = state.contents.write().unwrap();
                        let mut created = state.content_created.write().unwrap();
                        new_content_nibbles_b64.truncate(CONTENT_NIBBLES);
                        while new_content_nibbles_b64.len() < CONTENT_NIBBLES { new_content_nibbles_b64.push(shortint_ct_to_b64(&sk.create_trivial(0))); }
                        contents.insert(content_id.clone(), new_content_nibbles_b64);
                        created.insert(content_id.clone(), Instant::now());
                    }

                    let outbound = WsServerSelected { doc_id: updated_doc.doc_id.clone(), selected_id_cts: updated_doc.selected_id_cts_b64.clone() };
                    let text = serde_json::to_string(&outbound).unwrap();
                    let _ = room_tx.send(text);
                }
                Err(e) => { eprintln!("ws inbound decode error: {e:?}"); }
            }
        }
    }

    let _ = forward_task.abort();
}

#[derive(Deserialize)]
struct SetServerKeyInput { server_key_b64: String }

async fn set_server_key_api(State(state): State<AppState>, Json(input): Json<SetServerKeyInput>) -> Json<serde_json::Value> {
    let bytes = general_purpose::STANDARD.decode(input.server_key_b64.as_bytes()).unwrap();
    if let Ok(sk_si) = bincode::deserialize::<ShortintServerKey>(&bytes) {
        let mut guard = state.shortint_server_key.write().unwrap();
        *guard = Some(sk_si);
        // persist
        if let Ok(db) = state.db.lock() {
            let _ = db.execute("CREATE TABLE IF NOT EXISTS server_keys (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, blob BLOB NOT NULL)", []);
            let _ = db.execute("DELETE FROM server_keys", []);
            let _ = db.execute("INSERT INTO server_keys (kind, blob) VALUES (?1, ?2)", params!["shortint_server_key", bytes]);
        }
        return Json(serde_json::json!({"ok": true, "kind": "shortint_server_key"}));
    }
    if let Ok(csk_si) = bincode::deserialize::<ShortintCompressedServerKey>(&bytes) {
        let sk_si = csk_si.decompress();
        let mut guard = state.shortint_server_key.write().unwrap();
        *guard = Some(sk_si);
        // persist
        let blob = bytes; // store compressed bytes as-is
        if let Ok(db) = state.db.lock() {
            let _ = db.execute("CREATE TABLE IF NOT EXISTS server_keys (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, blob BLOB NOT NULL)", []);
            let _ = db.execute("DELETE FROM server_keys", []);
            let _ = db.execute("INSERT INTO server_keys (kind, blob) VALUES (?1, ?2)", params!["shortint_compressed_server_key", blob]);
        }
        return Json(serde_json::json!({"ok": true, "kind": "shortint_compressed_server_key"}));
    }
    Json(serde_json::json!({"ok": false, "error": "unrecognized server key payload"}))
}

async fn set_server_key_bin(State(state): State<AppState>, body: Bytes) -> Json<serde_json::Value> {
    let bytes: &[u8] = &body;
    if let Ok(sk_si) = bincode::deserialize::<ShortintServerKey>(bytes) {
        let mut guard = state.shortint_server_key.write().unwrap();
        *guard = Some(sk_si);
        if let Ok(db) = state.db.lock() {
            let _ = db.execute("CREATE TABLE IF NOT EXISTS server_keys (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, blob BLOB NOT NULL)", []);
            let _ = db.execute("DELETE FROM server_keys", []);
            let _ = db.execute("INSERT INTO server_keys (kind, blob) VALUES (?1, ?2)", params!["shortint_server_key", bytes]);
        }
        return Json(serde_json::json!({"ok": true, "kind": "shortint_server_key"}));
    }
    if let Ok(csk_si) = bincode::deserialize::<ShortintCompressedServerKey>(bytes) {
        let sk_si = csk_si.decompress();
        let mut guard = state.shortint_server_key.write().unwrap();
        *guard = Some(sk_si);
        if let Ok(db) = state.db.lock() {
            let _ = db.execute("CREATE TABLE IF NOT EXISTS server_keys (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, blob BLOB NOT NULL)", []);
            let _ = db.execute("DELETE FROM server_keys", []);
            let _ = db.execute("INSERT INTO server_keys (kind, blob) VALUES (?1, ?2)", params!["shortint_compressed_server_key", bytes]);
        }
        return Json(serde_json::json!({"ok": true, "kind": "shortint_compressed_server_key"}));
    }
    Json(serde_json::json!({"ok": false, "error": "unrecognized server key payload (bin)"}))
}

async fn get_content(Path(content_id): Path<String>, State(state): State<AppState>) -> ([(axum::http::header::HeaderName, String); 1], Json<serde_json::Value>) {
    {
        let mut created = state.content_created.write().unwrap();
        if created.contains_key(&content_id) { created.insert(content_id.clone(), Instant::now()); }
    }
    let guard = state.contents.read().unwrap();
    let json = if let Some(cts) = guard.get(&content_id) {
        serde_json::json!({"content_cts": cts})
    } else {
        serde_json::json!({"content_cts": Vec::<String>::new()})
    };
    (
        [(axum::http::header::CACHE_CONTROL, "no-store, no-cache, must-revalidate".to_string())],
        Json(json)
    )
}

#[derive(Serialize)]
struct TestResponse {
    message: String,
}

async fn test_handler() -> Json<TestResponse> {
    Json(TestResponse {
        message: "ok".to_string(),
    })
}

#[tokio::main]
async fn main() {
    // 構造化ログ
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().with_target(false))
        .init();

    // setup SQLite
    let db_path = std::env::var("SQLITE_PATH").unwrap_or_else(|_| "./server_keys.sqlite".to_string());
    let db = Connection::open(db_path).expect("open sqlite");
    let _ = db.execute("CREATE TABLE IF NOT EXISTS server_keys (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, blob BLOB NOT NULL)", []);

    // try restore server key at boot
    let mut restored_key: Option<ShortintServerKey> = None;
    if let Ok(mut stmt) = db.prepare("SELECT kind, blob FROM server_keys ORDER BY id DESC LIMIT 1") {
        if let Ok(mut rows) = stmt.query([]) {
            if let Ok(Some(row)) = rows.next() {
                let kind: String = row.get(0).unwrap_or_default();
                let blob: Vec<u8> = row.get(1).unwrap_or_default();
                if kind == "shortint_server_key" {
                    if let Ok(sk) = bincode::deserialize::<ShortintServerKey>(&blob) { restored_key = Some(sk); }
                } else if kind == "shortint_compressed_server_key" {
                    if let Ok(csk) = bincode::deserialize::<ShortintCompressedServerKey>(&blob) { restored_key = Some(csk.decompress()); }
                }
            }
        }
    }

    let state = AppState {
        shortint_server_key: Arc::new(RwLock::new(None)),
        documents: Arc::new(RwLock::new(HashMap::new())),
        contents: Arc::new(RwLock::new(HashMap::new())),
        content_created: Arc::new(RwLock::new(HashMap::new())),
        rooms: Arc::new(RwLock::new(HashMap::new())),
        db: Arc::new(Mutex::new(db)),
    };

    if let Some(sk) = restored_key { *state.shortint_server_key.write().unwrap() = Some(sk); info!("shortint server key restored from sqlite"); }

    // TTL GC
    let gc_state = state.clone();
    tokio::spawn(async move {
        let ttl = Duration::from_secs(300);
        let interval = Duration::from_secs(5);
        loop {
            tokio::time::sleep(interval).await;
            let now = Instant::now();
            let expired: Vec<String> = {
                let created = gc_state.content_created.read().unwrap();
                created.iter().filter_map(|(k, t)| if now.duration_since(*t) > ttl { Some(k.clone()) } else { None }).collect()
            };
            if expired.is_empty() { continue; }
            let mut contents = gc_state.contents.write().unwrap();
            let mut created = gc_state.content_created.write().unwrap();
            for k in expired { contents.remove(&k); created.remove(&k); }
        }
    });

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/keys/set_server_key", post(set_server_key_api))
        .route("/keys/set_server_key_bin", post(set_server_key_bin))
        .route("/ws", get(ws_handler))
        .route("/content/:content_id", get(get_content))
        .route("/test", get(test_handler))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(512 * 1024 * 1024));

    let port: u16 = std::env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(3001);
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!(error = ?e, %addr, "bind failed");
            std::process::exit(1);
        }
    };
    info!(address = %listener.local_addr().unwrap(), "server listening");
    if let Err(e) = axum::serve(listener, app).await {
        error!(error = ?e, "server failed");
        std::process::exit(1);
    }
}
