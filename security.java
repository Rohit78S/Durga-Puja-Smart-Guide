import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.core.Authentication;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;

import com.durgapuja.app.model.*;
import com.durgapuja.app.repository.*;
import com.durgapuja.app.dto.*;

import com.durgapuja.app.security.JwtTokenProvider;
import com.durgapuja.app.security.UserDetailsImpl;

// Note: this file consolidates multiple classes into a single compilation unit.
// To follow best practices, consider splitting each top-level class into its own file.

@Component
class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String email = tokenProvider.getEmailFromJWT(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                    );
                
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
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

@Service
class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> 
                    new UsernameNotFoundException("User not found with email: " + email)
                );
        
        return UserDetailsImpl.build(user);
    }
}

@Configuration
@EnableWebSecurity
class SecurityConfig {
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) 
            throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/pandals/**").permitAll()
                .requestMatchers("/api/reviews/**").permitAll()
                .requestMatchers("/api/photos/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .anyRequest().authenticated()
            );
        
        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:5000", 
            "http://localhost:3000",
            "http://127.0.0.1:5000"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

// ====================================
// 9. Services
// ====================================

@Service
class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setLastLogin(LocalDateTime.now());
        
        user = userRepository.save(user);
        
        // Auto-login after registration
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);
        
        return new AuthResponse(
            token,
            "Bearer",
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPoints()
        );
    }
    
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        return new AuthResponse(
            token,
            "Bearer",
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPoints()
        );
    }
}

@Service
class PandalService {
    
    @Autowired
    private PandalRepository pandalRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ReviewRepository reviewRepository;
    
    public List<Pandal> getAllPandals() {
        return pandalRepository.findAll();
    }
    
    public Pandal getPandalById(String id) {
        return pandalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pandal not found"));
    }
    
    public List<Pandal> getPandalsByType(PandalType type) {
        return pandalRepository.findByType(type);
    }
    
    public List<Pandal> getAccessiblePandals() {
        return pandalRepository.findByAccessibleTrue();
    }
    
    public List<Pandal> searchPandals(String query) {
        return pandalRepository.searchPandals(query);
    }
    
    @Transactional
    public void addBookmark(Long userId, String pandalId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pandal pandal = pandalRepository.findById(pandalId)
                .orElseThrow(() -> new RuntimeException("Pandal not found"));
        
        user.getBookmarks().add(pandal);
        user.setPoints(user.getPoints() + 5); // Award points
        userRepository.save(user);
    }
    
    @Transactional
    public void removeBookmark(Long userId, String pandalId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pandal pandal = pandalRepository.findById(pandalId)
                .orElseThrow(() -> new RuntimeException("Pandal not found"));
        
        user.getBookmarks().remove(pandal);
        userRepository.save(user);
    }
    
    @Transactional
    public void markVisited(Long userId, String pandalId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pandal pandal = pandalRepository.findById(pandalId)
                .orElseThrow(() -> new RuntimeException("Pandal not found"));
        
        if (!user.getVisitedPandals().contains(pandal)) {
            user.getVisitedPandals().add(pandal);
            user.setPoints(user.getPoints() + 10); // Award points
            
            // Check for badges
            checkAndAwardBadges(user);
            
            userRepository.save(user);
        }
    }
    
    private void checkAndAwardBadges(User user) {
        int visitCount = user.getVisitedPandals().size();
        Set<String> badges = user.getBadges();
        
        if (visitCount == 1 && !badges.contains("first-visit")) {
            badges.add("first-visit");
            user.setPoints(user.getPoints() + 10);
        } else if (visitCount == 3 && !badges.contains("heritage-explorer")) {
            badges.add("heritage-explorer");
            user.setPoints(user.getPoints() + 25);
        } else if (visitCount == 5 && !badges.contains("photo-enthusiast")) {
            badges.add("photo-enthusiast");
            user.setPoints(user.getPoints() + 50);
        } else if (visitCount == 8 && !badges.contains("route-master")) {
            badges.add("route-master");
            user.setPoints(user.getPoints() + 75);
        } else if (visitCount == 15 && !badges.contains("cultural-ambassador")) {
            badges.add("cultural-ambassador");
            user.setPoints(user.getPoints() + 150);
        } else if (visitCount == 31 && !badges.contains("pandal-champion")) {
            badges.add("pandal-champion");
            user.setPoints(user.getPoints() + 300);
        }
    }
    
    public Set<Pandal> getUserBookmarks(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getBookmarks();
    }
    
    public Set<Pandal> getUserVisitedPandals(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getVisitedPandals();
    }
}

@Service
class ReviewService {
    
    @Autowired
    private ReviewRepository reviewRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PandalRepository pandalRepository;
    
    public List<Review> getReviewsByPandal(String pandalId) {
        return reviewRepository.findByPandalId(pandalId);
    }
    
    public Double getAverageRating(String pandalId) {
        return reviewRepository.getAverageRating(pandalId);
    }
    
    @Transactional
    public Review addReview(Long userId, ReviewRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pandal pandal = pandalRepository.findById(request.getPandalId())
                .orElseThrow(() -> new RuntimeException("Pandal not found"));
        
        Review review = new Review();
        review.setUser(user);
        review.setPandal(pandal);
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        
        review = reviewRepository.save(review);
        
        // Award points
        user.setPoints(user.getPoints() + 5);
        userRepository.save(user);
        
        return review;
    }
}

// ====================================
// 10. Controllers
// ====================================

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Auth API is working!");
    }
}

@RestController
@RequestMapping("/api/pandals")
@CrossOrigin(origins = "*")
class PandalController {
    
    @Autowired
    private PandalService pandalService;
    
    @GetMapping
    public ResponseEntity<List<Pandal>> getAllPandals() {
        return ResponseEntity.ok(pandalService.getAllPandals());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Pandal> getPandalById(@PathVariable String id) {
        return ResponseEntity.ok(pandalService.getPandalById(id));
    }
    
    @GetMapping("/type/{type}")
    public ResponseEntity<List<Pandal>> getPandalsByType(@PathVariable PandalType type) {
        return ResponseEntity.ok(pandalService.getPandalsByType(type));
    }
    
    @GetMapping("/accessible")
    public ResponseEntity<List<Pandal>> getAccessiblePandals() {
        return ResponseEntity.ok(pandalService.getAccessiblePandals());
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Pandal>> searchPandals(@RequestParam String q) {
        return ResponseEntity.ok(pandalService.searchPandals(q));
    }
    
    @PostMapping("/bookmark")
    public ResponseEntity<String> addBookmark(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody BookmarkRequest request) {
        pandalService.addBookmark(userDetails.getId(), request.getPandalId());
        return ResponseEntity.ok("Bookmark added successfully");
    }
    
    @DeleteMapping("/bookmark/{pandalId}")
    public ResponseEntity<String> removeBookmark(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String pandalId) {
        pandalService.removeBookmark(userDetails.getId(), pandalId);
        return ResponseEntity.ok("Bookmark removed successfully");
    }
    
    @PostMapping("/visit")
    public ResponseEntity<String> markVisited(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody VisitRequest request) {
        pandalService.markVisited(userDetails.getId(), request.getPandalId());
        return ResponseEntity.ok("Pandal marked as visited");
    }
    
    @GetMapping("/bookmarks")
    public ResponseEntity<Set<Pandal>> getUserBookmarks(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(pandalService.getUserBookmarks(userDetails.getId()));
    }
    
    @GetMapping("/visited")
    public ResponseEntity<Set<Pandal>> getUserVisitedPandals(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(pandalService.getUserVisitedPandals(userDetails.getId()));
    }
}

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
class ReviewController {
    
    @Autowired
    private ReviewService reviewService;
    
    @GetMapping("/pandal/{pandalId}")
    public ResponseEntity<List<Review>> getReviewsByPandal(@PathVariable String pandalId) {
        return ResponseEntity.ok(reviewService.getReviewsByPandal(pandalId));
    }
    
    @GetMapping("/pandal/{pandalId}/rating")
    public ResponseEntity<Double> getAverageRating(@PathVariable String pandalId) {
        return ResponseEntity.ok(reviewService.getAverageRating(pandalId));
    }
    
    @PostMapping
    public ResponseEntity<Review> addReview(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.addReview(userDetails.getId(), request));
    }
}