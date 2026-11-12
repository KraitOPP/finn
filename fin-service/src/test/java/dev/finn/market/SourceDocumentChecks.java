
package dev.finn.market;

import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class SourceDocumentChecks {
    private SourceDocumentChecks() {}

    public static void retainsPrivateVersionsAndRejectsUnsafeLinks(MockMvc mvc) throws Exception {
        String owner="fictional-source-owner";
        String company=company(mvc,owner);
        String path="/api/v1/research/sources";
        String input=source(company,"Fictional filing","https://reports.example.com/filing.pdf","Fictional original text");
        submit(mvc,path,owner,input.replace("reports.example.com","127.0.0.1")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,owner,input.replace("https://","http://")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,owner,input.replace("reports.example.com","share.internal")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,owner,input.replace("true","false")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,"fictional-source-other",input).andExpect(status().isNotFound());
        var original=ok(submit(mvc,path,owner,input));
        assertThat(ok(submit(mvc,path,owner,input))).isEqualTo(original);
        String doc=path+"/"+original.get("documentId").asText();
        var revised=ok(submit(mvc,doc,owner,"{\"expectedRevision\":1,\"source\":"+input.replace("original text","revised text")+"}"));
        assertThat(revised.get("checksum")).isNotEqualTo(original.get("checksum"));
        read(mvc,doc+"/versions/1",owner).andExpect(status().isOk()).andExpect(jsonPath("$.attachment").value("Fictional original text"));
        read(mvc,doc+"/versions/2",owner).andExpect(status().isOk()).andExpect(jsonPath("$.attachment").value("Fictional revised text"));
        read(mvc,doc+"/versions/1","fictional-source-other").andExpect(status().isNotFound());
    }

    static String company(MockMvc mvc,String owner)throws Exception {
        return ok(submit(mvc,"/api/v1/catalog/companies",owner,"{\"name\":\"Fictional evidence company\"}")).get("companyId").asText();
    }

    static String source(String company,String title,String url,String attachment) {
        return """
                {"companyId":"%s","title":%s,"sourceName":"Fictional issuer","url":%s,"attachment":%s,"publishedAt":null,"rightsConfirmed":true}
                """.formatted(company,JSON.writeValueAsString(title),JSON.writeValueAsString(url),JSON.writeValueAsString(attachment));
    }
}
