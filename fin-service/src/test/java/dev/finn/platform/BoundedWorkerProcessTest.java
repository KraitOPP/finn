package dev.finn.platform;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(12)
class BoundedWorkerProcessTest {
    @Test void drainsPipesWithinTheSameDeadline() throws Exception {
        byte[] bytes={10,0,13,-1};
        assertArrayEquals(bytes,BoundedWorkerProcess.run(child("echo"),bytes,8,Duration.ofSeconds(6)));
        assertThrows(IOException.class,()->BoundedWorkerProcess.run(child("large"),new byte[0],32,Duration.ofSeconds(6)));
    }

    @Test void deadlineIncludesAChildThatNeverReadsStdin() {
        assertTimeout(Duration.ofSeconds(5),()->assertThrows(IOException.class,
                ()->BoundedWorkerProcess.run(child("stall"),new byte[1024*1024],64,Duration.ofMillis(500))));
    }

    private static ProcessBuilder child(String operation){
        String java=Path.of(System.getProperty("java.home"),"bin","java").toString();
        return new ProcessBuilder(java,"-cp",System.getProperty("java.class.path"),Child.class.getName(),operation)
                .redirectError(ProcessBuilder.Redirect.DISCARD);
    }

    public static class Child {
        public static void main(String[] arguments)throws Exception {
            switch(arguments[0]){
                case "echo" -> System.in.transferTo(System.out);
                case "large" -> System.out.write(new byte[4096]);
                case "stall" -> Thread.sleep(Duration.ofSeconds(20));
                default -> throw new IllegalArgumentException("Invalid test operation.");
            }
        }
    }
}
