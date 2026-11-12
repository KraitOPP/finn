package dev.finn.imports;

public final class ImportRejected extends RuntimeException {
    public enum Code { FILE_TOO_LARGE, INVALID_XLSX, UNSUPPORTED_PACKAGE_CONTENT, PACKAGE_LIMIT_REACHED,
        UNSAFE_XML, UNSUPPORTED_REPORT_LAYOUT, INVALID_REPORT_DATE, PARSE_BUDGET_EXCEEDED }
    private final Code code;
    public ImportRejected(Code code){super(code.name());this.code=code;}
    public Code code(){return code;}
}
