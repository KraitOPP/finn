
package dev.finn.market;

import dev.finn.research.ResearchExtractionWorker;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ResearchEvidenceChecks {
    private ResearchEvidenceChecks(){}
    public static void linksTextToImmutableVersionAndProtectsPdf(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-evidence-owner",other="fictional-evidence-other";
        String company=company(mvc,owner), root="/api/v1/research/sources";
        String text="Fictional company report\n\nMetric\tQuarter\nRevenue\t125\n";
        String input=source(company,"Fictional report",null,text);
        String id=ok(submit(mvc,root,owner,input)).get("documentId").asText();
        String version=root+"/"+id+"/versions/1";
        String job=ok(submit(mvc,version+"/extraction",owner,"{}")).get("jobId").asText();
        assertThat(ok(submit(mvc,version+"/extraction",owner,"{}")).get("jobId").asText()).isEqualTo(job);
        assertThat(worker.processNext()).isTrue();
        read(mvc,version+"/extraction",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"));
        var list=ok(read(mvc,version+"/anchors",owner)).get("items");
        var row=list.get(2);
        assertThat(row.get("kind").asText()).isEqualTo("TABLE_ROW");
        assertThat(row.get("lineStart").asInt()).isEqualTo(4);
        assertThat(row.get("cells").get(1).asText()).isEqualTo("125");
        String anchor="/api/v1/research/evidence/"+row.get("anchorId").asText();
        ok(submit(mvc,root+"/"+id,owner,"{\"expectedRevision\":1,\"source\":"+input.replace("125","160")+"}"));
        read(mvc,anchor,owner).andExpect(status().isOk()).andExpect(jsonPath("$.documentRevision").value(1))
                .andExpect(jsonPath("$.quote").value("Revenue\t125"));
        read(mvc,version+"/pages/1",other).andExpect(status().isNotFound());
        read(mvc,anchor,other).andExpect(status().isNotFound());

        byte[] bytes="%PDF-1.4\n%%EOF".getBytes(StandardCharsets.US_ASCII);
        var pdf=ok(mvc.perform(post("/api/v1/research/pdf").with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer")
                .subject(owner))).with(csrf()).contentType(MediaType.APPLICATION_PDF).content(bytes)));
        String fileInput=source(company,"Fictional PDF",null,null).strip().replace("\"rightsConfirmed\":true",
                "\"rightsConfirmed\":true,\"pdfFileId\":\""+pdf.get("fileId").asText()+"\"");
        String pdfId=ok(submit(mvc,root,owner,fileInput)).get("documentId").asText();
        var foreignCompany=company(mvc,other);
        submit(mvc,root,other,fileInput.replace(company,foreignCompany)).andExpect(status().isNotFound());
        read(mvc,root+"/"+pdfId+"/versions/1/pdf",other).andExpect(status().isNotFound());
        read(mvc,root+"/"+pdfId+"/versions/1/pdf",owner).andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition","attachment; filename=\"source-document.pdf\"")).andExpect(content().bytes(bytes));
    }
}
