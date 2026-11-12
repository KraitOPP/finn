package dev.finn.platform;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

final class RequestGuardrails extends OncePerRequestFilter {
    private final Semaphore requests = new Semaphore(32, true);
    private final Semaphore uploads = new Semaphore(4, true);
    static final class BodyLimit extends IOException {}

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String trace = UUID.randomUUID().toString();
        request.setAttribute(Problems.TRACE, trace);
        response.setHeader("X-Request-ID", trace);
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Cache-Control", "no-store");
        var session = request.getSession(false);
        if (session != null && System.currentTimeMillis() - session.getCreationTime() >= Duration.ofHours(8).toMillis()) session.invalidate();
        if (!request.getRequestURI().startsWith("/api/")) { chain.doFilter(request, response); return; }
        if (request.getRequestURI().length() > 1024 || (request.getQueryString() != null && request.getQueryString().length() > 2048)) {
            Problems.write(request, response, 414, "REQUEST_TOO_LARGE"); return;
        }
        boolean pdfUpload="POST".equals(request.getMethod())&&request.getRequestURI().equals("/api/v1/research/pdf");
        boolean upload=pdfUpload||"POST".equals(request.getMethod())&&request.getRequestURI().endsWith("/imports");
        long limit = pdfUpload ? 3 * 1024 * 1024 : upload ? 5 * 1024 * 1024 : 64 * 1024;
        if (request.getContentLengthLong() > limit) { Problems.write(request, response, 413, "REQUEST_TOO_LARGE"); return; }
        if (!requests.tryAcquire()) {
            response.setHeader("Retry-After", "2");
            Problems.write(request, response, 429, "REQUEST_CAPACITY_REACHED"); return;
        }
        if(upload&&!uploads.tryAcquire()){
            requests.release();response.setHeader("Retry-After","2");Problems.write(request,response,429,"UPLOAD_CAPACITY_REACHED");return;
        }
        try { chain.doFilter(new LimitedRequest(request, limit), response); }
        finally { if(upload)uploads.release();requests.release(); }
    }

    static final class LimitedRequest extends HttpServletRequestWrapper {
        private ServletInputStream stream;
        private final long limit;
        LimitedRequest(HttpServletRequest request, long limit) { super(request); this.limit = limit; }
        @Override public ServletInputStream getInputStream() throws IOException {
            if (stream == null) {
                ServletInputStream original = super.getInputStream();
                stream = new ServletInputStream() {
                    private long count;
                    private int counted(int value) throws IOException {
                        if (value >= 0 && ++count > limit) throw new BodyLimit();
                        return value;
                    }
                    @Override public int read() throws IOException { return counted(original.read()); }
                    @Override public int read(byte[] bytes, int offset, int length) throws IOException {
                        int read = original.read(bytes, offset, (int)Math.min(length, Math.max(1, limit - count + 1)));
                        if (read > 0 && (count += read) > limit) throw new BodyLimit();
                        return read;
                    }
                    @Override public boolean isFinished() { return original.isFinished(); }
                    @Override public boolean isReady() { return original.isReady(); }
                    @Override public void setReadListener(ReadListener listener) { original.setReadListener(listener); }
                };
            }
            return stream;
        }
        @Override public BufferedReader getReader() throws IOException { return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8)); }
    }
}
