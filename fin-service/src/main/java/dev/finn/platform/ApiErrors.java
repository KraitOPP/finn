package dev.finn.platform;

import java.util.Map;
import dev.finn.ledger.LedgerViolation;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(LedgerViolation.class)
    ResponseEntity<Map<String, Object>> ledger(LedgerViolation error,HttpServletRequest request) {
        int status=switch(error.code()){case INVALID_EVENT,AMOUNT_OUT_OF_RANGE -> 422;default -> 409;};
        return Problems.response(request,status,error.code().name());
    }
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<Map<String, Object>> duplicate(HttpServletRequest request) {
        return Problems.response(request, 409, "DUPLICATE_RESOURCE");
    }
    @ExceptionHandler(ApiFailure.class)
    ResponseEntity<Map<String, Object>> application(ApiFailure error, HttpServletRequest request) {
        return Problems.response(request, error.status(), error.code());
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class, IllegalArgumentException.class})
    ResponseEntity<Map<String, Object>> validation(Exception error, HttpServletRequest request) {
        return Problems.response(request, 422, "INVALID_INPUT");
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException error, HttpServletRequest request) {
        Throwable cause = error;
        while (cause != null) {
            if (cause instanceof RequestGuardrails.BodyLimit) return Problems.response(request, 413, "REQUEST_TOO_LARGE");
            cause = cause.getCause();
        }
        return Problems.response(request, 400, "MALFORMED_REQUEST");
    }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, Object>> denied(HttpServletRequest request) {
        return Problems.response(request, 403, "OPERATION_FORBIDDEN");
    }
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Map<String, Object>> missing(HttpServletRequest request) {
        return Problems.response(request, 404, "RESOURCE_UNAVAILABLE");
    }
    @ExceptionHandler(RequestGuardrails.BodyLimit.class)
    ResponseEntity<Map<String, Object>> tooLarge(HttpServletRequest request) {
        return Problems.response(request, 413, "REQUEST_TOO_LARGE");
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception error, HttpServletRequest request) {
        if (error instanceof ErrorResponse failure && failure.getStatusCode().is4xxClientError()) {
            return Problems.response(request, failure.getStatusCode().value(), "INVALID_REQUEST");
        }
        // Deliberately exclude exception messages, values, source rows, URLs and stack traces.
        LoggerFactory.getLogger(ApiErrors.class).error("Request failed reference={} category={}", Problems.trace(request),
                error instanceof DataAccessException ? "DATABASE" : "APPLICATION");
        return Problems.response(request, 500, "REQUEST_FAILED");
    }
}
