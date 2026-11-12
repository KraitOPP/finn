package dev.finn.identity;

import java.net.URI;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.ClientRegistrations;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration(proxyBeanMethods = false)
public class IdentityConfiguration {
    public record IdentitySettings(String publicOrigin, String issuer, boolean local) {}

    @Bean
    IdentitySettings identitySettings(Environment environment) {
        boolean local = environment.acceptsProfiles(Profiles.of("local", "test"));
        String origin = required(environment, "finn.public-origin");
        String issuer = required(environment, "finn.oidc.issuer");
        validateAddress(origin, local, true);
        validateAddress(issuer, local, false);
        if (local && !Set.of("127.0.0.1", "localhost", "::1").contains(environment.getProperty("server.address", ""))) {
            throw new IllegalStateException("The local identity profile must bind the application to loopback.");
        }
        return new IdentitySettings(origin.replaceFirst("/$", ""), issuer.replaceFirst("/$", ""), local);
    }

    @Bean
    ClientRegistrationRepository clientRegistrations(Environment environment, IdentitySettings settings) {
        String secret = required(environment, "finn.oidc.client-secret");
        String authorization = environment.getProperty("finn.oidc.authorization-uri");
        ClientRegistration.Builder builder;
        if (authorization == null) {
            builder = ClientRegistrations.fromIssuerLocation(settings.issuer());
        } else {
            String token = required(environment, "finn.oidc.token-uri");
            String jwks = required(environment, "finn.oidc.jwk-set-uri");
            String info = required(environment, "finn.oidc.user-info-uri");
            for (String address : new String[]{authorization, token, jwks, info}) validateAddress(address, settings.local(), false);
            builder = ClientRegistration.withRegistrationId("finn").issuerUri(settings.issuer())
                    .authorizationUri(authorization).tokenUri(token).jwkSetUri(jwks).userInfoUri(info).userNameAttributeName("sub");
        }
        return new InMemoryClientRegistrationRepository(builder.registrationId("finn")
                .clientId("finn-web").clientSecret(secret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .scope("openid", "profile").redirectUri(settings.publicOrigin() + "/login/oauth2/code/finn")
                .clientName("FINN").build());
    }

    @Bean
    DefaultCookieSerializer cookieSerializer(IdentitySettings settings) {
        var serializer = new DefaultCookieSerializer();
        serializer.setCookieName(settings.local() ? "FINN_SESSION" : "__Host-FINN_SESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(!settings.local());
        serializer.setSameSite("Lax");
        serializer.setUseBase64Encoding(false);
        return serializer;
    }

    public static void validateAddress(String value, boolean local, boolean originOnly) {
        URI uri;
        try { uri = URI.create(value); }
        catch (IllegalArgumentException exception) { throw new IllegalArgumentException("Invalid identity address configuration."); }
        boolean loopback = uri.getHost() != null && Set.of("127.0.0.1", "localhost", "::1", "[::1]").contains(uri.getHost());
        boolean secure = "https".equals(uri.getScheme()) || (local && loopback && "http".equals(uri.getScheme()));
        if (!secure || (local && !loopback) || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || (originOnly && !Set.of("", "/").contains(uri.getPath()))) {
            throw new IllegalArgumentException("Identity addresses require HTTPS; explicit local profiles permit loopback HTTP only.");
        }
    }

    private static String required(Environment environment, String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Configure " + key + " outside source control before starting the private application.");
        return value;
    }
}
