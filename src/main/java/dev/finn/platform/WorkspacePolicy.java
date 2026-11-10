package dev.finn.platform;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class WorkspacePolicy {
    private WorkspacePolicy() {}

    public static Path requireExternalRoot(String configuredRoot) {
        if (configuredRoot == null || configuredRoot.isBlank()) {
            throw new IllegalArgumentException("Set FINN_WORKSPACE_ROOT to an existing absolute directory outside Git checkouts.");
        }
        Path requested = Path.of(configuredRoot);
        if (!requested.isAbsolute() || !Files.isDirectory(requested)) {
            throw new IllegalArgumentException("FINN_WORKSPACE_ROOT must be an existing absolute directory.");
        }
        try {
            Path resolved = requested.toRealPath();
            for (Path parent = resolved; parent != null; parent = parent.getParent()) {
                if (Files.exists(parent.resolve(".git"))) {
                    throw new IllegalArgumentException("FINN_WORKSPACE_ROOT must stay outside every Git checkout.");
                }
            }
            return resolved;
        } catch (IOException exception) {
            throw new IllegalArgumentException("FINN_WORKSPACE_ROOT cannot be accessed.");
        }
    }
}
