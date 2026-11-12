package dev.finn.identity;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUser {
    public record UserProfile(UUID userId, String displayName) {}
    private final JdbcTemplate jdbc;

    CurrentUser(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public UserProfile require() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof OidcUser user)) {
            throw new AccessDeniedException("Authentication required.");
        }
        String issuer = user.getIssuer().toString();
        String subject = user.getSubject();
        if (issuer.length() > 512 || subject == null || subject.isBlank() || subject.length() > 255) throw new AccessDeniedException("Unsupported identity.");
        String name = user.getPreferredUsername();
        if (name == null || name.isBlank()) name = "Investor";
        name = name.replaceAll("[\\p{Cntrl}]", "").strip();
        if (name.isBlank()) name = "Investor";
        if (name.codePointCount(0, name.length()) > 120) name = name.substring(0, name.offsetByCodePoints(0, 120));
        return jdbc.queryForObject("""
                INSERT INTO finn.app_user(user_id, issuer, subject, display_name)
                VALUES (?, ?, ?, ?) ON CONFLICT(issuer, subject)
                DO UPDATE SET display_name=EXCLUDED.display_name
                RETURNING user_id, display_name
                """, (rows, index) -> new UserProfile(rows.getObject("user_id", UUID.class), rows.getString("display_name")),
                UUID.randomUUID(), issuer, subject, name);
    }

    public UUID requireId() { return require().userId(); }
}
