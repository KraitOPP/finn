
package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/attention")
class AttentionController {
    record Feedback(@NotNull @Min(1) @Max(100) Integer eventRevision,
                    @NotNull @Pattern(regexp="READ|UNREAD|MUTE|UNMUTE|SNOOZE|UNSNOOZE|USEFUL|ALREADY_KNEW|TOO_MANY|CLEAR_REACTION") String action,
                    @Size(max=32) String snoozeUntil) {}
    private final AttentionInbox inbox;
    AttentionController(AttentionInbox inbox) { this.inbox=inbox; }

    @GetMapping AttentionInbox.Page list(@RequestParam(defaultValue="ACTIVE") @Pattern(regexp="ACTIVE|UNREAD|HIDDEN") String view,
                                        @RequestParam(defaultValue="0") @Min(0) @Max(300) int offset) {
        return inbox.list(view,offset);
    }
    @PostMapping("/{id}") AttentionInbox.State feedback(@PathVariable UUID id,@Valid @RequestBody Feedback input) {
        return inbox.change(id,input.eventRevision(),input.action(),input.snoozeUntil());
    }
}
