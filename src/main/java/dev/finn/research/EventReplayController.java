
package dev.finn.research;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/replay")
class EventReplayController {
    private final EventReplay replay;
    EventReplayController(EventReplay replay) { this.replay=replay; }

    @GetMapping EventReplay.View read() { return replay.read(); }
    @PostMapping EventReplay.View start() { return replay.start(); }
}
