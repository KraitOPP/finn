package dev.finn.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkspacePolicyTest {
    @TempDir Path temporary;

    @Test void rejectsMissingRelativeAndCheckoutDirectories() throws Exception {
        assertThatIllegalArgumentException().isThrownBy(() -> WorkspacePolicy.requireExternalRoot(null));
        assertThatIllegalArgumentException().isThrownBy(() -> WorkspacePolicy.requireExternalRoot("relative"));
        Path checkout = Files.createDirectory(temporary.resolve("checkout"));
        Files.writeString(checkout.resolve(".git"), "gitdir: intentionally-not-a-real-repository");
        Path nested = Files.createDirectory(checkout.resolve("cache"));
        assertThatIllegalArgumentException().isThrownBy(() -> WorkspacePolicy.requireExternalRoot(nested.toString()));
    }

    @Test void acceptsAnExistingExternalDirectory() throws Exception {
        assertThat(WorkspacePolicy.requireExternalRoot(temporary.toString())).isEqualTo(temporary.toRealPath());
    }
}
