
package dev.finn.market;

import dev.finn.platform.BoundedWorkerProcess;
import dev.finn.platform.WorkspacePolicy;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
public class YahooProcess {
    private static final int MAX_BYTES = 64 * 1024;
    private final boolean enabled;
    private final String python, source, workspace;
    private final JsonMapper json;

    public YahooProcess(JsonMapper json, @Value("${finn.market.yahoo-enabled:false}") boolean enabled,
                        @Value("${finn.market.python:}") String python, @Value("${finn.market.adapter-source:}") String source,
                        @Value("${FINN_WORKSPACE_ROOT:}") String workspace) {
        this.json=json; this.enabled=enabled; this.python=python; this.source=source; this.workspace=workspace;
    }

    public String capability() {
        if (!enabled) return "DISABLED";
        try {
            if (Path.of(python).isAbsolute() && Files.isRegularFile(Path.of(python))
                && Path.of(source).isAbsolute() && Files.isRegularFile(Path.of(source,"finn_yfinance","cli.py"))) {
                WorkspacePolicy.requireExternalRoot(workspace);
                return "PRIVATE_DAILY";
            }
        } catch (IllegalArgumentException ignored) { /* configuration stays private */ }
        return "CONFIGURATION_REQUIRED";
    }

    JsonNode fetch(MarketPrices.Fetch request) throws IOException, InterruptedException {
        return invoke(request, null, Duration.ofSeconds(30));
    }

    public JsonNode lookup(String query,String exchange) throws IOException, InterruptedException {
        return invoke(Map.of("query",query,"exchange",exchange), "lookup", Duration.ofSeconds(9));
    }

    JsonNode chart(Object request) throws IOException, InterruptedException {
        return invoke(request, "chart", Duration.ofSeconds(18));
    }

    private JsonNode invoke(Object request,String mode,Duration timeout) throws IOException, InterruptedException {
        if (!capability().equals("PRIVATE_DAILY")) throw new IOException("Yahoo configuration unavailable");
        var root=WorkspacePolicy.requireExternalRoot(workspace);
        var scratch=Files.createDirectories(root.resolve("tmp/yahoo-worker"));
        var command=new ArrayList<>(List.of(python,"-B","-m","finn_yfinance.cli",root.toString()));
        if(mode!=null) command.add(mode);
        var builder=new ProcessBuilder(command)
                .directory(scratch.toFile()).redirectError(ProcessBuilder.Redirect.DISCARD);
        var env=builder.environment();
        // Pass only OS launch essentials. Do not inherit app credentials or Python overrides.
        env.keySet().removeIf(key->!java.util.Set.of("SYSTEMROOT","WINDIR","PATH","LANG","LC_ALL").contains(key.toUpperCase(java.util.Locale.ROOT)));
        env.put("PYTHONPATH",source); env.put("PYTHONNOUSERSITE","1"); env.put("PYTHONUTF8","1");
        env.put("TMP",scratch.toString()); env.put("TEMP",scratch.toString()); env.put("TMPDIR",scratch.toString());
        byte[] input=json.writeValueAsString(request).getBytes(StandardCharsets.UTF_8);
        int limit = "chart".equals(mode) ? 4_000_000 : MAX_BYTES;
        return json.readTree(BoundedWorkerProcess.run(builder,input,limit,timeout));
    }
}
