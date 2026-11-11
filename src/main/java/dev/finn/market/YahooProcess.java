
package dev.finn.market;

import dev.finn.platform.WorkspacePolicy;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
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
        if (!capability().equals("PRIVATE_DAILY")) throw new IOException("Yahoo configuration unavailable");
        var root=WorkspacePolicy.requireExternalRoot(workspace);
        var scratch=Files.createDirectories(root.resolve("tmp/yahoo-worker"));
        var builder=new ProcessBuilder(python,"-B","-m","finn_yfinance.cli",root.toString())
                .directory(scratch.toFile()).redirectError(ProcessBuilder.Redirect.DISCARD);
        var env=builder.environment();
        // Pass only OS launch essentials. Do not inherit app credentials or Python overrides.
        env.keySet().removeIf(key->!java.util.Set.of("SYSTEMROOT","WINDIR","PATH","LANG","LC_ALL").contains(key.toUpperCase(java.util.Locale.ROOT)));
        env.put("PYTHONPATH",source); env.put("PYTHONNOUSERSITE","1"); env.put("PYTHONUTF8","1");
        env.put("TMP",scratch.toString()); env.put("TEMP",scratch.toString()); env.put("TMPDIR",scratch.toString());
        var process=builder.start();
        var reader=new FutureTask<>(()->{
            try(var input=process.getInputStream()){
                byte[] bytes=input.readNBytes(MAX_BYTES+1);
                if(bytes.length>MAX_BYTES){process.destroyForcibly();throw new IOException("Provider output exceeded bound");}
                return bytes;
            }
        });
        Thread.ofVirtual().start(reader);
        try {
            try(var out=process.getOutputStream()){
                out.write(json.writeValueAsString(request).getBytes(StandardCharsets.UTF_8));
            }
            if(!process.waitFor(30,TimeUnit.SECONDS)||process.exitValue()!=0)throw new IOException("Provider process unavailable");
            return json.readTree(reader.get(1,TimeUnit.SECONDS));
        } catch(java.util.concurrent.ExecutionException|java.util.concurrent.TimeoutException failure){
            throw new IOException("Provider output unavailable");
        } finally {
            if(process.isAlive()) process.destroyForcibly();
            reader.cancel(true);
        }
    }
}
