package dev.finn.jobs;

import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import dev.finn.identity.CurrentUser;
import dev.finn.platform.Problems;
import org.springframework.web.bind.annotation.*;

@RestController
public class JobController {
    private final CurrentUser users;private final JobQueue jobs;
    JobController(CurrentUser users,JobQueue jobs){this.users=users;this.jobs=jobs;}
    @GetMapping("/api/v1/jobs/{id}") JobQueue.Status status(@PathVariable UUID id,HttpServletRequest request){return jobs.status(users.requireId(),id,Problems.trace(request));}
}
