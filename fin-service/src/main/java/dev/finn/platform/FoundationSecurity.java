package dev.finn.platform;

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
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.jdbc.PostgreSqlJdbcIndexedSessionRepositoryCustomizer;

@Configuration(proxyBeanMethods = false)
class FoundationSecurity {
    @Bean
    PostgreSqlJdbcIndexedSessionRepositoryCustomizer sessionAttributeWrites() {
        return new PostgreSqlJdbcIndexedSessionRepositoryCustomizer();
    }

    @Bean
    SecurityFilterChain foundationChain(HttpSecurity http, ClientRegistrationRepository registrations, IdentitySettings settings) throws Exception {
        var authorization = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        authorization.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        var logout = new OidcClientInitiatedLogoutSuccessHandler(registrations);
        logout.setPostLogoutRedirectUri(settings.publicOrigin() + "/");
        logout.setDefaultTargetUrl(settings.publicOrigin() + "/");
        var csrfTokens = new HttpSessionCsrfTokenRepository();
        var signedIn = new SimpleUrlAuthenticationSuccessHandler(settings.publicOrigin() + "/");
        signedIn.setAlwaysUseDefaultTargetUrl(true);
        http.addFilterBefore(new RequestGuardrails(), SecurityContextHolderFilter.class)
            .authorizeHttpRequests(requests -> requests
                .requestMatchers(HttpMethod.GET, "/api/v1/session", "/api/v1/demo/quote", "/actuator/health",
                        "/actuator/health/liveness", "/actuator/health/readiness").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            .csrf(csrf -> csrf.csrfTokenRepository(csrfTokens))
            .oauth2Login(login -> login
                    .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(authorization))
                    .successHandler((request,response,authentication) -> {
                        // Persist the rotated token before the frontend can issue concurrent session reads.
                        csrfTokens.loadDeferredToken(request,response).get();
                        signedIn.onAuthenticationSuccess(request,response,authentication);
                    })
                    .failureHandler((request, response, error) -> response.sendRedirect(settings.publicOrigin() + "/?signin=failed")))
            .logout(configuration -> configuration.logoutUrl("/api/v1/logout").invalidateHttpSession(true)
                    .clearAuthentication(true).logoutSuccessHandler(logout))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    .sessionFixation(fixation -> fixation.changeSessionId()))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> Problems.write(request, response, 401, "AUTHENTICATION_REQUIRED"))
                .accessDeniedHandler((request, response, error) -> Problems.write(request, response, 403, "OPERATION_FORBIDDEN")))
            .headers(headers -> headers.contentSecurityPolicy(policy -> policy
                    .policyDirectives("default-src 'none'; frame-ancestors 'none'")));
        // Cookie-authenticated mutations always require CSRF protection.
        return http.build();
    }
}
