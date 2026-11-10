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
import org.springframework.security.web.SecurityFilterChain;
import dev.finn.identity.IdentityConfiguration.IdentitySettings;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;

@Configuration(proxyBeanMethods = false)
class FoundationSecurity {
    @Bean
    SecurityFilterChain foundationChain(HttpSecurity http, ClientRegistrationRepository registrations, IdentitySettings settings) throws Exception {
        var authorization = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        authorization.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        var logout = new OidcClientInitiatedLogoutSuccessHandler(registrations);
        logout.setPostLogoutRedirectUri(settings.publicOrigin() + "/");
        logout.setDefaultTargetUrl(settings.publicOrigin() + "/");
        http.authorizeHttpRequests(requests -> requests
                .requestMatchers(HttpMethod.GET, "/api/v1/session", "/api/v1/demo/quote", "/actuator/health",
                        "/actuator/health/liveness", "/actuator/health/readiness").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            .oauth2Login(login -> login
                    .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(authorization))
                    .defaultSuccessUrl(settings.publicOrigin() + "/", true)
                    .failureHandler((request, response, error) -> response.sendRedirect(settings.publicOrigin() + "/?signin=failed")))
            .logout(configuration -> configuration.logoutUrl("/api/v1/logout").invalidateHttpSession(true)
                    .clearAuthentication(true).logoutSuccessHandler(logout))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    .sessionFixation(fixation -> fixation.changeSessionId()))
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
                 "detail":"This operation is unavailable to the current session.",
                 "instance":"/api","code":"%s","traceId":"%s"}
                """.formatted(title, status, code, UUID.randomUUID()));
    }
}
