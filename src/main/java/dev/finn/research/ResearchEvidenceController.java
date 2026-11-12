
package dev.finn.research;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research")
class ResearchEvidenceController {
    private static final String VERSION="/sources/{id}/versions/{revision}";
    private final ResearchPdfs pdfs;
    private final ResearchEvidence evidence;
    ResearchEvidenceController(ResearchPdfs pdfs,ResearchEvidence evidence){this.pdfs=pdfs;this.evidence=evidence;}

    @PostMapping(path="/pdf",consumes=MediaType.APPLICATION_PDF_VALUE)
    ResearchPdfs.FileRef upload(@RequestBody byte[] pdf){return pdfs.stage(pdf);}

    @GetMapping("/pdf/staged") ResearchPdfs.Staging staged(){return pdfs.staged();}
    @PostMapping("/pdf/{file}/discard") ResearchPdfs.Discard discard(@PathVariable UUID file){return pdfs.discard(file);}

    @GetMapping(VERSION+"/pdf")
    ResponseEntity<byte[]> download(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("source-document.pdf").build().toString())
                .body(pdfs.download(id,revision));
    }

    @GetMapping(VERSION+"/extraction")
    ResearchEvidence.Status status(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision){return evidence.status(id,revision);}

    @PostMapping(VERSION+"/extraction")
    ResearchEvidence.Status request(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision){return evidence.request(id,revision);}

    @GetMapping(VERSION+"/anchors")
    ResearchEvidence.Locations locations(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision,
                                        @RequestParam(defaultValue="0") @Min(0) @Max(12000) int offset){return evidence.list(id,revision,offset);}

    @GetMapping(VERSION+"/pages/{number}")
    ResearchEvidence.TextPage page(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision,@PathVariable @Min(1) @Max(20) int number){
        return evidence.page(id,revision,number);
    }

    @GetMapping("/evidence/{anchor}")
    ResearchEvidence.Location anchor(@PathVariable UUID anchor){return evidence.read(anchor);}
}
