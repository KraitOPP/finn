package dev.finn.platform;

import java.io.IOException;
import java.util.UUID;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
class FoundationSecurity {
    @Bean
    UserDetailsService unavailableIdentity() {
        // Identity integration is a separate feature. Never create a default account/password.
        return ignored -> { throw new UsernameNotFoundException("Identity is not configured."); };
    }

    @Bean
    SecurityFilterChain foundationChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(requests -> requests
                .requestMatchers(HttpMethod.GET, "/api/v1/demo/quote", "/actuator/health",
                        "/actuator/health/liveness", "/actuator/health/readiness").permitAll()
                .anyRequest().denyAll())
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> problem(response, 401,
                        "AUTHENTICATION_REQUIRED", "Authentication required"))
                .accessDeniedHandler((request, response, error) -> problem(response, 403,
                        "OPERATION_FORBIDDEN", "Operation forbidden")))
            .headers(headers -> headers.contentSecurityPolicy(policy -> policy
                    .policyDirectives("default-src 'none'; frame-ancestors 'none'")));
        // CSRF remains enabled; no mutation endpoint is public in this foundation.
        return http.build();
    }

    private static void problem(HttpServletResponse response, int status, String code, String title) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"type":"urn:finn:problem:access","title":"%s","status":%d,
                 "detail":"This operation is unavailable in the synthetic demonstration.",
                 "instance":"/api","code":"%s","traceId":"%s"}
                """.formatted(title, status, code, UUID.randomUUID()));
    }
}
