package dev.finn;

import dev.finn.platform.WorkspacePolicy;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FinnApplication {
    public static void main(String[] args) {
        WorkspacePolicy.requireExternalRoot(System.getenv("FINN_WORKSPACE_ROOT"));
        SpringApplication.run(FinnApplication.class, args);
    }
}
