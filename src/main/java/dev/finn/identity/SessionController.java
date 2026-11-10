package dev.finn.identity;

import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SessionController {
    record CsrfInformation(String headerName, String parameterName, String token) {}
    record SessionResponse(String contractVersion, String requestId, boolean authenticated,
                           CurrentUser.UserProfile user, CsrfInformation csrf) {}
    private final CurrentUser users;
    SessionController(CurrentUser users) { this.users = users; }

    @GetMapping("/api/v1/session")
    ResponseEntity<SessionResponse> session(Authentication authentication, CsrfToken csrf) {
        boolean authenticated = authentication != null && authentication.getPrincipal() instanceof OidcUser;
        var body = new SessionResponse("0.6.0", UUID.randomUUID().toString(), authenticated,
                authenticated ? users.require() : null,
                new CsrfInformation(csrf.getHeaderName(), csrf.getParameterName(), csrf.getToken()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    @GetMapping("/api/v1/me")
    ResponseEntity<CurrentUser.UserProfile> me() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(users.require());
    }
}
