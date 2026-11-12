package dev.finn.platform;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Applies one deadline to child execution and both pipes. */
public final class BoundedWorkerProcess {
    private BoundedWorkerProcess() {}

    public static byte[] run(ProcessBuilder builder,byte[] input,int outputLimit,Duration timeout)
            throws IOException,InterruptedException {
        var process=builder.start();
        long deadline=System.nanoTime()+timeout.toNanos();
        var writer=new FutureTask<Void>(()->{
            try(var stream=process.getOutputStream()){stream.write(input);}
            return null;
        });
        var reader=new FutureTask<>(()->{
            try(var stream=process.getInputStream()){
                byte[] bytes=stream.readNBytes(outputLimit+1);
                if(bytes.length>outputLimit){
                    process.destroyForcibly();
                    throw new IOException("Worker response exceeded its limit.");
                }
                return bytes;
            }
        });
        Thread.ofVirtual().start(writer);
        Thread.ofVirtual().start(reader);
        try{
            if(!process.waitFor(remaining(deadline),TimeUnit.NANOSECONDS)||process.exitValue()!=0)
                throw new IOException("Worker execution failed or timed out.");
            writer.get(remaining(deadline),TimeUnit.NANOSECONDS);
            return reader.get(remaining(deadline),TimeUnit.NANOSECONDS);
        }catch(ExecutionException|TimeoutException failure){
            throw new IOException("Worker pipes failed or timed out.");
        }finally{
            if(process.isAlive())process.destroyForcibly();
            writer.cancel(true);
            reader.cancel(true);
        }
    }

    private static long remaining(long deadline){return Math.max(0,deadline-System.nanoTime());}
}
