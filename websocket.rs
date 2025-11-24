use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::Message;

pub async fn websocket(
    req: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;

    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.recv().await {
            match msg {
                Message::Text(text) => {
                    // Broadcast to all clients
                    session.text(format!("Echo: {}", text)).await.ok();
                }
                Message::Close(_) => break,
                _ => (),
            }
        }
    });

    Ok(response)
}