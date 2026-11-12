package dev.finn.platform;

import static org.assertj.core.api.Assertions.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestGuardrailsTest {
    @Test void countsUnknownLengthStreamsAndRejectsDeclaredOversizeWithoutReading() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/preferences");
        request.setContent(new byte[65]);
        var limited = new RequestGuardrails.LimitedRequest(request, 64);
        assertThatThrownBy(() -> limited.getInputStream().readAllBytes()).isInstanceOf(RequestGuardrails.BodyLimit.class);
        request.setContent(new byte[65537]);
        var response = new MockHttpServletResponse();
        new RequestGuardrails().doFilter(request, response, (a,b) -> { throw new AssertionError("Oversized request reached application"); });
        assertThat(response.getStatus()).isEqualTo(413);
        assertThat(response.getContentAsString()).contains("REQUEST_TOO_LARGE");
    }

    @Test void boundsConcurrentRequestsAndNeverEchoesSuppliedReferences() throws Exception {
        var filter = new RequestGuardrails();
        var entered = new CountDownLatch(32);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 32; i++) executor.submit(() -> {
                try {
                    filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/session"), new MockHttpServletResponse(), (a,b) -> {
                        entered.countDown();
                        try { release.await(10, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                    });
                } catch (Exception e) { throw new AssertionError(e); }
            });
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                var request = new MockHttpServletRequest("GET", "/api/v1/session");
                request.addHeader("X-Request-ID", "secret-value-untrusted");
                var response = new MockHttpServletResponse();
                filter.doFilter(request, response, (a,b) -> { throw new AssertionError("Capacity exceeded"); });
                assertThat(response.getStatus()).isEqualTo(429);
                assertThat(response.getHeader("Retry-After")).isEqualTo("2");
                assertThat(response.getContentAsString()).contains(response.getHeader("X-Request-ID")).doesNotContain("secret-value-untrusted");
            } finally { release.countDown(); }
        }
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/session"), response, (a,b) -> b.getWriter().write("recovered"));
        assertThat(response.getContentAsString()).isEqualTo("recovered");
    }
}
