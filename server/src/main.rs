use axum::{http::Method, routing::get, Json, Router};
use serde::Serialize;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tokio::net::TcpListener;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

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
    // 構造化ログの初期化（RUST_LOG が無ければ info デフォルト）
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().with_target(false))
        .init();

    let cors = CorsLayer::new()
        .allow_methods([Method::GET])
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/test", get(test_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http());

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
