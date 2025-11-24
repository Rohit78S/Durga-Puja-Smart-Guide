package com.yourapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class Application {

    public static void main(String[] args) {
        System.out.println("☕ Java Server starting on http://localhost:8081");
        SpringApplication.run(Application.class, args);
    }
    
    @GetMapping("/health")
    public String health() {
        return "Java Backend is running!";
    }
}