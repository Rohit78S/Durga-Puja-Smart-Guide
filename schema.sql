CREATE DATABASE IF NOT EXISTS durgapuja;

USE durgapuja;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
);

INSERT IGNORE INTO users (username, password) VALUES ('root', 'Rohit@7890S');