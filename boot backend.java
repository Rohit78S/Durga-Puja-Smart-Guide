package com.durgapuja.app;

// --- 1. IMPORTS ---
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.persistence.*;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

// --- 2. MAIN APPLICATION ---
@SpringBootApplication
@EnableScheduling
public class DurgaPujaApplication {
    public static void main(String[] args) {
        SpringApplication.run(DurgaPujaApplication.class, args);
    }
}

// --- 3. SECURITY CONFIGURATION (Spring Boot 3.2+) ---
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    @Autowired @Lazy UserDetailsServiceImpl userDetailsService;
    @Autowired @Lazy JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/pandals/public/**", "/ws/**").permitAll()
                .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    
    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow localhost and your frontend ports
        configuration.setAllowedOriginPatterns(List.of("*")); 
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

// --- 4. WEBSOCKET CONFIGURATION ---
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }
}

// --- 5. CONTROLLERS ---
@RestController
@RequestMapping("/api/auth")
class AuthController {
    @Autowired AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        return ResponseEntity.ok("User registered successfully!");
    }
}

@RestController
@RequestMapping("/api/pandals")
class PandalController {
    @Autowired PandalService pandalService;

    @GetMapping("/public/all")
    public ResponseEntity<List<Pandal>> getAllPandals() {
        return ResponseEntity.ok(pandalService.getAllPandals());
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<Pandal> getPandalById(@PathVariable String id) {
        return ResponseEntity.ok(pandalService.getPandalById(id));
    }
    
    @GetMapping("/public/search")
    public ResponseEntity<List<Pandal>> searchPandals(@RequestParam String query) {
        return ResponseEntity.ok(pandalService.searchPandals(query));
    }
}

@Controller
class WebSocketController {
    @Autowired PandalService pandalService;

    @MessageMapping("/update-crowd")
    @SendTo("/topic/crowd-updates")
    public CrowdUpdateMessage handleCrowdUpdate(CrowdUpdateMessage message) {
        pandalService.updateCrowdStatus(message.getPandalId(), message.getCount());
        return message;
    }
}

// --- 6. SERVICES ---
@Service
class AuthService {
    @Autowired AuthenticationManager authenticationManager;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider tokenProvider;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        
        AuthResponse response = new AuthResponse();
        response.setToken(jwt);
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setPoints(user.getPoints());
        return response;
    }

    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) throw new RuntimeException("Email taken!");
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPoints(50); 
        userRepository.save(user);
    }
}

@Service
class PandalService {
    @Autowired PandalRepository pandalRepository;

    public List<Pandal> getAllPandals() { return pandalRepository.findAll(); }
    
    public Pandal getPandalById(String id) {
        return pandalRepository.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
    }

    public List<Pandal> searchPandals(String query) { return pandalRepository.searchPandals(query); }
    
    public void updateCrowdStatus(String pandalId, Integer count) {
        Pandal pandal = getPandalById(pandalId);
        pandal.setCurrentCrowd(count);
        pandalRepository.save(pandal);
    }
}

@Service
class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired UserRepository userRepository;
    @Override @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException("User Not Found"));
        return UserDetailsImpl.build(user);
    }
}

// --- 7. SECURITY UTILS ---
@Component
class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired JwtTokenProvider tokenProvider;
    @Autowired UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String email = tokenProvider.getEmailFromJWT(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            // Log error
        }
        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

@Component
class JwtTokenProvider {
    @Value("${jwt.secret}") private String jwtSecret;
    @Value("${jwt.expiration}") private long jwtExpirationMs;

    private SecretKey getSigningKey() { return Keys.hmacShaKeyFor(jwtSecret.getBytes()); }

    public String generateToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        return Jwts.builder()
                .setSubject(userPrincipal.getEmail())
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    public String getEmailFromJWT(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody();
        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken);
            return true;
        } catch (Exception e) { return false; }
    }
}

@Data @AllArgsConstructor
class UserDetailsImpl implements UserDetails {
    private Long id;
    private String email;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
    public static UserDetailsImpl build(User user) {
        return new UserDetailsImpl(user.getId(), user.getEmail(), user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
    public String getUsername() { return email; }
    public boolean isAccountNonExpired() { return true; }
    public boolean isAccountNonLocked() { return true; }
    public boolean isCredentialsNonExpired() { return true; }
    public boolean isEnabled() { return true; }
}

// --- 8. ENTITIES ---
@Entity @Table(name = "pandals") @Data @NoArgsConstructor @AllArgsConstructor
class Pandal {
    @Id private String id;
    private String name;
    private String nameBn;
    @Enumerated(EnumType.STRING) private PandalType type;
    private String area;
    private String areaBn;
    private Double latitude;
    private Double longitude;
    private String theme;
    private String themeBn;
    private String hours;
    private String transport;
    @Enumerated(EnumType.STRING) private CrowdLevel crowdLevel;
    private Boolean accessible;
    private Integer currentCrowd = 0;
    @OneToMany(mappedBy = "pandal", cascade = CascadeType.ALL) private Set<Review> reviews = new HashSet<>();
    private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}

@Entity @Table(name = "users") @Data @NoArgsConstructor @AllArgsConstructor
class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true, nullable = false) private String email;
    private String name;
    private String password;
    @Enumerated(EnumType.STRING) private Role role = Role.USER;
    private Integer points = 0;
    @ElementCollection private Set<String> badges = new HashSet<>();
    @OneToMany(mappedBy = "user") private Set<Review> reviews = new HashSet<>();
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
    private LocalDateTime createdAt;
}

@Entity @Table(name = "reviews") @Data @NoArgsConstructor @AllArgsConstructor
class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "user_id") private User user;
    @ManyToOne @JoinColumn(name = "pandal_id") private Pandal pandal;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}

@Entity @Table(name = "user_photos") @Data @NoArgsConstructor @AllArgsConstructor
class UserPhoto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "user_id") private User user;
    @ManyToOne @JoinColumn(name = "pandal_id") private Pandal pandal;
    private String photoUrl;
    private String caption;
    private Integer likes = 0;
    private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}

@Entity @Table(name = "routes") @Data @NoArgsConstructor @AllArgsConstructor
class Route {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "user_id") private User user;
    private String name;
    @Enumerated(EnumType.STRING) private RouteType type;
    private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}

// --- 9. ENUMS & DTOs ---
enum PandalType { HERITAGE, COMMUNITY, THEME }
enum CrowdLevel { LOW, MEDIUM, HIGH }
enum Role { USER, ADMIN }
enum RouteType { CUSTOM, OPTIMIZED, HERITAGE, COMMUNITY, THEME }

@Data class LoginRequest {
    @NotBlank @Email private String email;
    @NotBlank private String password;
}

@Data class RegisterRequest {
    @NotBlank private String name;
    @NotBlank @Email private String email;
    @NotBlank @Size(min = 6) private String password;
}

@Data class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String name;
    private String email;
    private Integer points;
}

@Data class CrowdUpdateMessage {
    private String pandalId;
    private Integer count;
}

// --- 10. REPOSITORIES ---
@Repository interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}

@Repository interface PandalRepository extends JpaRepository<Pandal, String> {
    @Query("SELECT p FROM Pandal p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.area) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Pandal> searchPandals(String query);
}

@Repository interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByPandalId(String pandalId);
}
@Repository interface UserPhotoRepository extends JpaRepository<UserPhoto, Long> {}
@Repository interface RouteRepository extends JpaRepository<Route, Long> {}