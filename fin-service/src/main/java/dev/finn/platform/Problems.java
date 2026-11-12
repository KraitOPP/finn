package dev.finn.platform;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;

public final class Problems {
    public static final String TRACE = "finn.traceId";
    private Problems() {}
    public static String trace(HttpServletRequest request) {
        Object trace = request.getAttribute(TRACE);
        return trace instanceof String value ? value : UUID.randomUUID().toString();
    }
    public static Map<String, Object> body(HttpServletRequest request, int status, String code) {
        return Map.of("type", "urn:finn:problem:request", "title", "Request could not be completed", "status", status,
                "detail", "Check the request or sign in again. If this continues, use the reference when reporting it.",
                "instance", "/api", "code", code, "traceId", trace(request));
    }
    public static ResponseEntity<Map<String, Object>> response(HttpServletRequest request, int status, String code) {
        return ResponseEntity.status(status).header("Content-Type", "application/problem+json")
                .header("Cache-Control", "no-store").body(body(request, status, code));
    }
    public static void write(HttpServletRequest request, HttpServletResponse response, int status, String code) throws IOException {
        // Codes are fixed application constants, never request/provider content.
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"type\":\"urn:finn:problem:request\",\"title\":\"Request could not be completed\",\"status\":"
                + status + ",\"detail\":\"Check the request or sign in again.\",\"instance\":\"/api\",\"code\":\""
                + code + "\",\"traceId\":\"" + trace(request) + "\"}");
    }
}
