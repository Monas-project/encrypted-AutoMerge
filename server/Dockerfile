# syntax=docker/dockerfile:1.6

FROM rust:1-bullseye AS builder
WORKDIR /app

# 依存を先にビルドしてキャッシュ（build context はリポジトリ root。server/ を明示）
COPY server/Cargo.toml server/Cargo.lock ./
RUN mkdir -p src && echo 'fn main(){}' > src/main.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release

# アプリ本体
COPY server/src ./src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    cp target/release/server /app/server && \
    strip /app/server

FROM debian:bullseye-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/server /usr/local/bin/server

ENV PORT=3001 \
    RUST_LOG=info,tower_http=info,server=info \
    RUST_BACKTRACE=1
EXPOSE 3001

CMD ["/usr/local/bin/server"]
