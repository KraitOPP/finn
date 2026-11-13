package dev.finn.research;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties={"finn.filings.kafka.enabled=true","finn.filings.kafka.group-prefix=finn-test",
        "finn.metrics.enabled=true","management.endpoints.web.exposure.include=health,prometheus",
        "finn.monitoring.delivery-delay-ms=200","spring.kafka.consumer.properties.session.timeout.ms=6000",
        "spring.kafka.consumer.properties.heartbeat.interval.ms=1500"})
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
class FilingStreamIntegrationTest {
    private static final String APP_PASSWORD=UUID.randomUUID().toString();
    private static final String MIGRATION_PASSWORD=UUID.randomUUID().toString();
    private static final String METRICS_PASSWORD=UUID.randomUUID().toString();
    private static final String TOPIC="finn.reviewed-company-events.v1";
    private static final String ISSUER="http://127.0.0.1:1/test-issuer";

    @Container static final PostgreSQLContainer DATABASE=new PostgreSQLContainer(DockerImageName.parse(
            "postgres:18.6-bookworm@sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("finn").withUsername("finn_bootstrap").withPassword(UUID.randomUUID().toString())
            .withCopyToContainer(Transferable.of(APP_PASSWORD.getBytes(StandardCharsets.UTF_8)),"/run/secrets/finn_app_password")
            .withCopyToContainer(Transferable.of(MIGRATION_PASSWORD.getBytes(StandardCharsets.UTF_8)),"/run/secrets/finn_migration_password")
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("deployment/postgres/10-create-roles.sh").toAbsolutePath()),
                    "/docker-entrypoint-initdb.d/10-create-roles.sh");
    @Container static final KafkaContainer BROKER=new KafkaContainer(DockerImageName.parse(
            "apache/kafka:4.4.0@sha256:833b867a9585a141da455dc2b57431c65cbccb27f11c91f694444cca9f777e0f")
            .asCompatibleSubstituteFor("apache/kafka"));

    @DynamicPropertySource static void properties(DynamicPropertyRegistry properties){
        properties.add("spring.datasource.url",DATABASE::getJdbcUrl);
        properties.add("spring.datasource.password",()->APP_PASSWORD);
        properties.add("spring.flyway.password",()->MIGRATION_PASSWORD);
        properties.add("spring.kafka.bootstrap-servers",BROKER::getBootstrapServers);
        properties.add("finn.metrics.password",()->METRICS_PASSWORD);
        properties.add("finn.public-origin",()->"http://127.0.0.1:5173");
        properties.add("finn.oidc.issuer",()->ISSUER);
        properties.add("finn.oidc.client-secret",()->UUID.randomUUID().toString());
        properties.add("finn.oidc.authorization-uri",()->"http://127.0.0.1:1/authorize");
        properties.add("finn.oidc.token-uri",()->"http://127.0.0.1:1/token");
        properties.add("finn.oidc.jwk-set-uri",()->"http://127.0.0.1:1/jwks");
        properties.add("finn.oidc.user-info-uri",()->"http://127.0.0.1:1/userinfo");
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired KafkaListenerEndpointRegistry listeners;
    @Autowired JsonMapper json;
    @Autowired ResearchExtractionWorker extraction;

    @Test void recoversAlertsAndRebuildsRadarAfterReplay()throws Exception{
        int filings=Integer.getInteger("finn.benchmark.filings",20);
        assertThat(filings).isBetween(20,10000);
        try(var admin=Admin.create(Map.of(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG,BROKER.getBootstrapServers()))){
            var alert=listener("alerts");
            var radar=listener("radar");
            await().atMost(Duration.ofSeconds(25)).until(()->assigned(alert)&&assigned(radar));
            stop(alert);
            String user="filing-kafka-fixture";
            int owners=1+(filings-1)/160;
            var output=new java.util.LinkedHashMap<String,Object>();
            Instant submitStart=Instant.now();
            for(int i=0;i<owners;i++){
                String subject=user+"-"+i;
                String company=send(subject,"/api/v1/catalog/companies",Map.of("name","Fictional filing issuer "+i)).path("companyId").asText();
                send(subject,"/api/v1/research/filing-rules",Map.of("companyId",company,"title","Filing arrival","category","ANY",
                        "minimumMateriality","ANY","arrivals",true,"dates",false,"tentative",false));
                for(int j=0;j<Math.min(160,filings-i*160);j++){
                    String title="Fictional quarterly filing "+i+"-"+j;
                    String source=send(subject,"/api/v1/research/sources",Map.of("companyId",company,"title",title,"sourceName","Fictional company",
                            "attachment","Fictional results from an isolated test dataset.","publishedAt",Instant.now().minusSeconds(3).toString(),"rightsConfirmed",true)).path("documentId").asText();
                    var review=Map.of("documentId",source,"documentRevision",1,"title",title,"subtype","RESULTS","stage","ANNOUNCED",
                            "materiality","HIGH","novelty","NEW","reviewed",true);
                    var first=send(subject,"/api/v1/research/events",review);
                    if(j==0)assertThat(send(subject,"/api/v1/research/events",review).path("versionId").asText())
                            .isEqualTo(first.path("versionId").asText());
                }
            }
            output.put("filings",filings);
            output.put("reviewAndSourceWriteSeconds",secondsSince(submitStart));
            await().atMost(Duration.ofMinutes(3)).untilAsserted(()->assertThat(count("SELECT count(*) FROM finn.radar_filing")).isEqualTo(filings));
            assertThat(count("SELECT count(*) FROM finn.activity WHERE kind='COMPANY_EVENT'")).isZero();
            assertThat(count("SELECT count(*) FROM finn.reviewed_event_outbox WHERE filing_version_id IS NOT NULL")).isEqualTo(filings);
            var radarResult=mvc.perform(get("/api/v1/discovery/radar").with(login(user+"-0")))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(json.readTree(radarResult).path("items").isEmpty()).isFalse();
            var otherRadar=mvc.perform(get("/api/v1/discovery/radar").with(login("other-kafka-fixture")))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(json.readTree(otherRadar).path("items").isEmpty()).isTrue();

            Instant resumed=Instant.now();
            alert.start();
            await().atMost(Duration.ofMinutes(3)).untilAsserted(()->assertThat(count("""
                    SELECT count(*) FROM finn.reviewed_event_receipt r JOIN finn.reviewed_event_outbox e USING(message_id)
                    WHERE r.consumer='alerts' AND e.filing_version_id IS NOT NULL
                    """)).isEqualTo(filings));
            output.put("alertBacklogRecoverySeconds",secondsSince(resumed));
            await().atMost(Duration.ofMinutes(3)).untilAsserted(()->assertThat(delivered()).isEqualTo(filings));
            output.put("inboxRecoverySeconds",secondsSince(resumed));
            output.put("p95FilingToInboxMs",jdbc.queryForObject("""
                    SELECT round((percentile_cont(0.95) WITHIN GROUP
                        (ORDER BY extract(epoch FROM d.completed_at-v.reviewed_at)*1000))::numeric,1)
                    FROM finn.activity a JOIN finn.activity_delivery d USING(owner_id,activity_id)
                    JOIN finn.company_event_version v ON v.owner_id=a.owner_id AND v.event_version_id=a.evidence_id
                    WHERE a.kind='COMPANY_EVENT' AND d.channel='IN_APP' AND d.status='DELIVERED'
                    """,java.math.BigDecimal.class));

            stop(alert);
            stop(radar);
            // Test-only database role can clear this disposable projection before rebuilding from Kafka.
            try(var database=java.sql.DriverManager.getConnection(DATABASE.getJdbcUrl(),DATABASE.getUsername(),DATABASE.getPassword());
                var statement=database.createStatement()){
                statement.execute("DELETE FROM finn.radar_filing");
            }
            rewind(admin,"alerts");
            rewind(admin,"radar");
            var targets=admin.listOffsets(topicPartitions(admin).stream().collect(java.util.stream.Collectors.toMap(
                    partition->partition,partition->OffsetSpec.latest()))).all().get(5,TimeUnit.SECONDS);
            var replayStarted=Instant.now();
            alert.start();
            radar.start();
            await().atMost(Duration.ofMinutes(3)).untilAsserted(()->{
                assertThat(count("SELECT count(*) FROM finn.radar_filing")).isEqualTo(filings);
                assertThat(caughtUp(admin,"alerts",targets)).isTrue();
                assertThat(caughtUp(admin,"radar",targets)).isTrue();
            });
            output.put("radarAndAlertReplaySeconds",secondsSince(replayStarted));
            output.put("deliveredAlerts",delivered());
            output.put("duplicateAlertsAfterReplay",count("SELECT count(*) FROM finn.activity WHERE kind='COMPANY_EVENT'")-filings);
            assertThat(output.get("duplicateAlertsAfterReplay")).isEqualTo(0L);
            var metrics=mvc.perform(get("/actuator/prometheus").header("Authorization","Basic "+Base64.getEncoder()
                    .encodeToString(("finn-metrics:"+METRICS_PASSWORD).getBytes(StandardCharsets.UTF_8))))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(metrics).contains("finn_filings_inbox_latency_seconds_count","finn_filings_consumer_pending");
            mvc.perform(get("/actuator/prometheus")).andExpect(status().isUnauthorized());

            String report=System.getProperty("finn.benchmark.report");
            if(report!=null){
                Path file=Path.of(report);
                Files.createDirectories(file.getParent());
                Files.writeString(file,json.writerWithDefaultPrettyPrinter().writeValueAsString(output));
            }
        }
    }

    @Test void checksThesisAfterReviewedFactAndCorrection()throws Exception{
        String subject="fictional-kafka-thesis";
        String root="/api/v1/research";
        String company=send(subject,"/api/v1/catalog/companies",Map.of("name","Fictional thesis issuer")).path("companyId").asText();
        String base=root+"/companies/"+company;
        String thesis=send(subject,base+"/theses",Map.of("title","Fictional revenue thesis","rationale","Watch reviewed revenue",
                "risks","Cyclicality","milestones","Quarterly results","decision","MONITOR","decisionNote","","anchorIds",List.of()))
                .path("thesisId").asText();
        String conditions=root+"/theses/"+thesis+"/conditions";
        var dimensions=Map.of("metric","REVENUE","basis","CONSOLIDATED","periodKind","QUARTER",
                "periodStart","2025-04-01","periodEnd","2025-06-30","unit","MONEY","currency","INR");
        send(subject,conditions,Map.of("expectedRevision",1,"label","Revenue threshold","dimensions",dimensions,
                "comparator","GTE","threshold","120","scale","CRORE"));
        String document=send(subject,root+"/sources",Map.of("companyId",company,"title","Fictional reviewed results","sourceName","Fictional issuer",
                "attachment","Fictional reported revenue 125 crore.","publishedAt","2025-07-22T10:00:00Z","rightsConfirmed",true))
                .path("documentId").asText();
        String source=root+"/sources/"+document;
        String anchor=index(subject,source+"/versions/1");
        var first=Map.of("dimensions",dimensions,"anchorId",anchor,"amount","125","scale","CRORE","reviewed",true);
        String fact=send(subject,base+"/facts",first).path("factId").asText();
        await().atMost(Duration.ofSeconds(30)).untilAsserted(()->assertThat(check(subject,conditions).path("state").asText()).isEqualTo("MATCHED"));
        send(subject,source,Map.of("expectedRevision",1,"source",Map.of("companyId",company,"title","Fictional corrected results",
                "sourceName","Fictional issuer","attachment","Fictional corrected revenue 90 crore.",
                "publishedAt","2025-07-23T10:00:00Z","rightsConfirmed",true)));
        String correctedAnchor=index(subject,source+"/versions/2");
        var correction=Map.of("dimensions",dimensions,"anchorId",correctedAnchor,"amount","90","scale","CRORE","reviewed",true);
        send(subject,root+"/facts/"+fact,Map.of("companyId",company,"expectedRevision",1,"fact",correction));
        await().atMost(Duration.ofSeconds(30)).untilAsserted(()->{
            var result=check(subject,conditions);
            assertThat(result.path("state").asText()).isEqualTo("VIOLATED");
            assertThat(result.path("fact").path("revision").asInt()).isEqualTo(2);
        });
    }

    private String index(String subject,String version)throws Exception{
        send(subject,version+"/extraction",Map.of());
        extraction.processNext();
        String anchors=version+"/anchors";
        await().atMost(Duration.ofSeconds(10)).until(()->!read(subject,anchors).path("items").isEmpty());
        return read(subject,anchors).path("items").path(0).path("anchorId").asText();
    }

    private JsonNode check(String subject,String conditions)throws Exception{
        return read(subject,conditions).path("items").path(0).path("lastCheck");
    }

    private JsonNode read(String user,String path)throws Exception{
        var response=mvc.perform(get(path).with(login(user))).andExpect(status().isOk()).andReturn().getResponse();
        return json.readTree(response.getContentAsString());
    }

    private JsonNode send(String user,String path,Object body)throws Exception{
        var response=mvc.perform(post(path).with(login(user)).with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse();
        return json.readTree(response.getContentAsString());
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.OidcLoginRequestPostProcessor login(String user){
        return oidcLogin().idToken(token->token.claim("iss",ISSUER).subject(user));
    }

    private MessageListenerContainer listener(String name){return listeners.getListenerContainer("finn-filing-"+name);}
    private static boolean assigned(MessageListenerContainer listener){
        var partitions=listener.getAssignedPartitions();
        return partitions!=null&&!partitions.isEmpty();
    }
    private static void stop(MessageListenerContainer listener)throws InterruptedException{
        var stopped=new CountDownLatch(1);
        listener.stop(stopped::countDown);
        assertThat(stopped.await(15,TimeUnit.SECONDS)).isTrue();
    }

    private void rewind(Admin admin,String consumer)throws Exception{
        var offsets=new java.util.HashMap<TopicPartition,OffsetAndMetadata>();
        for(var partition:topicPartitions(admin))offsets.put(partition,new OffsetAndMetadata(0));
        admin.alterConsumerGroupOffsets("finn-test-"+consumer,offsets).all().get(15,TimeUnit.SECONDS);
    }

    private List<TopicPartition> topicPartitions(Admin admin)throws Exception{
        return admin.describeTopics(List.of(TOPIC)).allTopicNames().get(5,TimeUnit.SECONDS).get(TOPIC).partitions().stream()
                .map(partition->new TopicPartition(TOPIC,partition.partition())).toList();
    }

    private boolean caughtUp(Admin admin,String consumer,Map<TopicPartition,org.apache.kafka.clients.admin.ListOffsetsResult.ListOffsetsResultInfo> targets)
            throws Exception{
        var offsets=admin.listConsumerGroupOffsets("finn-test-"+consumer).partitionsToOffsetAndMetadata().get(5,TimeUnit.SECONDS);
        return targets.entrySet().stream().allMatch(target->{
            var committed=offsets.get(target.getKey());
            return target.getValue().offset()==0||committed!=null&&committed.offset()>=target.getValue().offset();
        });
    }

    private long delivered(){return count("SELECT count(*) FROM finn.activity_delivery WHERE channel='IN_APP' AND status='DELIVERED'");}
    private long count(String query){return jdbc.queryForObject(query,Long.class);}
    private static double secondsSince(Instant instant){return Duration.between(instant,Instant.now()).toMillis()/1000.0;}
}
