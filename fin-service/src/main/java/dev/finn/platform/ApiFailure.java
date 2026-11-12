package dev.finn.platform;

public final class ApiFailure extends RuntimeException {
    private final int status;
    private final String code;
    private final Integer retryAfterSeconds;
    public ApiFailure(int status, String code) {
        this(status,code,null);
    }
    public ApiFailure(int status, String code, Integer retryAfterSeconds) {
        super(code);
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
    public int status() { return status; }
    public String code() { return code; }
    public Integer retryAfterSeconds() { return retryAfterSeconds; }
    public static ApiFailure notFound() { return new ApiFailure(404, "RESOURCE_UNAVAILABLE"); }
    public static ApiFailure invalid() { return new ApiFailure(422, "INVALID_INPUT"); }
    public static ApiFailure conflict() { return new ApiFailure(409, "REVIEW_REQUIRED"); }
}
