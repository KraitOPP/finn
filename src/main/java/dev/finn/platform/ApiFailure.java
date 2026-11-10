package dev.finn.platform;

public final class ApiFailure extends RuntimeException {
    private final int status;
    private final String code;
    public ApiFailure(int status, String code) {
        super(code);
        this.status = status;
        this.code = code;
    }
    public int status() { return status; }
    public String code() { return code; }
    public static ApiFailure notFound() { return new ApiFailure(404, "RESOURCE_UNAVAILABLE"); }
    public static ApiFailure invalid() { return new ApiFailure(422, "INVALID_INPUT"); }
    public static ApiFailure conflict() { return new ApiFailure(409, "REVIEW_REQUIRED"); }
}
