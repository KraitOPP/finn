package dev.finn.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer.CookieValue;

class IdentityConfigurationTest {
    @Test void productionRejectsInsecureOrAmbiguousIdentityAddresses() {
        for (String value : new String[]{"http://127.0.0.1:8180", "https://user:secret@example.invalid", "https://example.invalid?token=bad", "https://example.invalid/#fragment", "not-a-uri"}) {
            assertThatIllegalArgumentException().isThrownBy(() -> IdentityConfiguration.validateAddress(value, false, true));
        }
        assertThatIllegalArgumentException().isThrownBy(() -> IdentityConfiguration.validateAddress("http://remote.invalid", true, false));
        assertThatIllegalArgumentException().isThrownBy(() -> IdentityConfiguration.validateAddress("https://remote.invalid", true, true));
        IdentityConfiguration.validateAddress("http://localhost:8180/realms/test", true, false);
        IdentityConfiguration.validateAddress("https://identity.example.invalid/realms/test", false, false);
    }

    @Test void productionSessionCookieIsHostScopedSecureAndHttpOnly() {
        var configuration = new IdentityConfiguration();
        var serializer = configuration.cookieSerializer(new IdentityConfiguration.IdentitySettings(
                "https://app.example.invalid", "https://identity.example.invalid/realms/test", false));
        var response = new MockHttpServletResponse();
        serializer.writeCookieValue(new CookieValue(new MockHttpServletRequest(), response, UUID.randomUUID().toString()));
        assertThat(response.getHeader("Set-Cookie")).contains("__Host-FINN_SESSION=", "Path=/", "Secure", "HttpOnly", "SameSite=Lax").doesNotContain("Domain=");
    }
}
