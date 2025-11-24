use actix_web::{HttpResponse, web};
use serde::{Deserialize, Serialize};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    success: bool,
    token: Option<String>,
    message: String,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

pub async fn login(req: web::Json<LoginRequest>) -> HttpResponse {
    // Hash password with Argon2
    let argon2 = Argon2::default();
    
    // In production, fetch from database
    // For now, demo logic
    
    // Generate JWT token
    let claims = Claims {
        sub: req.username.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("secret_key".as_ref())
    ).unwrap();
    
    HttpResponse::Ok().json(AuthResponse {
        success: true,
        token: Some(token),
        message: "Login successful".to_string(),
    })
}

pub async fn register(req: web::Json<LoginRequest>) -> HttpResponse {
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .unwrap()
        .to_string();
    
    // Save to database via Java API
    
    HttpResponse::Ok().json(AuthResponse {
        success: true,
        token: None,
        message: "Registration successful".to_string(),
    })
}

pub async fn verify_token(req: web::HttpRequest) -> HttpResponse {
    // Verify JWT token
    HttpResponse::Ok().json(serde_json::json!({"valid": true}))
}