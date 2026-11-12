
package dev.finn.research;

import dev.finn.platform.BoundedWorkerProcess;
import dev.finn.platform.WorkspacePolicy;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
class ResearchPdfProcess {
    private static final int MAX_OUTPUT=320*1024;
    private final JsonMapper json;
    private final String python, script, workspace;

    ResearchPdfProcess(JsonMapper json,@Value("${finn.research.pdf-python:}") String python,
                       @Value("${finn.research.pdf-script:}") String script,@Value("${FINN_WORKSPACE_ROOT:}") String workspace) {
        this.json=json;
        this.python=python;
        this.script=script;
        this.workspace=workspace;
    }

    boolean configured() {
        return Path.of(python).isAbsolute() && Files.isRegularFile(Path.of(python)) &&
                Path.of(script).isAbsolute() && Files.isRegularFile(Path.of(script));
    }

    JsonNode extract(byte[] bytes)throws IOException,InterruptedException {
        var root=WorkspacePolicy.requireExternalRoot(workspace);
        var scratch=Files.createDirectories(root.resolve("tmp/research-pdf"));
        var builder=new ProcessBuilder(python,"-I","-B",script).directory(scratch.toFile()).redirectError(ProcessBuilder.Redirect.DISCARD);
        var env=builder.environment();
        env.keySet().removeIf(key->!Set.of("SYSTEMROOT","WINDIR","PATH","LANG","LC_ALL").contains(key.toUpperCase(Locale.ROOT)));
        env.put("TMP",scratch.toString()); env.put("TEMP",scratch.toString()); env.put("TMPDIR",scratch.toString());
        return json.readTree(BoundedWorkerProcess.run(builder,bytes,MAX_OUTPUT,Duration.ofSeconds(15)));
    }
}
