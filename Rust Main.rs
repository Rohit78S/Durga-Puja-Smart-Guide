use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;

mod auth;
mod websocket;
mod upload;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🦀 Rust Server starting on http://localhost:8080");

    HttpServer::new(|| {
        let cors = Cors::permissive();
        
        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .route("/api/auth/login", web::post().to(auth::login))
            .route("/api/auth/register", web::post().to(auth::register))
            .route("/api/auth/verify", web::get().to(auth::verify_token))
            .route("/ws/notifications", web::get().to(websocket::websocket))
            .route("/api/upload", web::post().to(upload::handle_upload))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}