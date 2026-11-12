
package dev.finn.research;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

final class EvidenceText {
    record Anchor(int lineStart,int lineEnd,String kind,String quote,List<String> cells) {}
    record Page(int number,String state,String content,List<Anchor> anchors) {}
    record Result(String status,String reason,int totalPages,List<Page> pages) {}
    private static final Set<String> PAGE_STATES=Set.of("TEXT","TRUNCATED","NO_TEXT","UNREADABLE");
    private static final int MAX_LINES=600;
    private static final int MAX_LINE=1200;

    private EvidenceText() {}

    static Result text(String input) {
        return summarize(1,List.of(page(1,"TEXT",input)));
    }

    static Result pdf(JsonNode result) {
        String code=result.path("code").asText();
        if(code.equals("MALFORMED_PDF"))return new Result("FAILED",code,0,List.of());
        if(code.equals("ENCRYPTED_PDF")||code.equals("PDF_PAGE_LIMIT"))return new Result("UNSUPPORTED",code,0,List.of());
        var totalNode=result.path("total");
        int total=totalNode.asInt(0);
        var pages=result.path("pages");
        if(!code.equals("OK")||!totalNode.isIntegralNumber()||total<1||total>10000||!pages.isArray()||pages.size()<1||pages.size()>Math.min(total,20))
            return invalid();
        var parsed=new ArrayList<Page>();
        int characters=0;
        for(var row:pages){
            int number=row.path("number").asInt(0);
            String state=row.path("state").asText();
            var source=row.path("text");
            if(number!=parsed.size()+1||!PAGE_STATES.contains(state)||!source.isString())return invalid();
            String text=source.asText();
            characters+=text.length();
            if(text.length()>24000||characters>120000||((state.equals("NO_TEXT")||state.equals("UNREADABLE"))&&!text.isEmpty()))return invalid();
            parsed.add(page(number,state,text));
        }
        return summarize(total,parsed);
    }

    private static Result invalid() {
        return new Result("FAILED","PDF_EXTRACTOR_RESPONSE_INVALID",0,List.of());
    }

    private static Result summarize(int total,List<Page> pages) {
        boolean any=pages.stream().anyMatch(page->!page.anchors().isEmpty());
        if(!any){
            boolean unreadable=pages.stream().anyMatch(page->page.state().equals("UNREADABLE"));
            return new Result("NO_TEXT",unreadable?"UNREADABLE_PAGES":"NO_TEXT_LAYER",total,List.copyOf(pages));
        }
        boolean complete=pages.size()==total&&pages.stream().allMatch(page->page.state().equals("TEXT"));
        return new Result(complete?"READY":"PARTIAL",complete?null:"INCOMPLETE_PAGE_COVERAGE",total,List.copyOf(pages));
    }

    private static Page page(int number,String state,String raw) {
        if(state.equals("NO_TEXT")||state.equals("UNREADABLE"))return new Page(number,state,"",List.of());
        String safe=raw.replaceAll("[\\p{Cc}\\p{Cf}&&[^\\n\\t]]"," ");
        String[] all=safe.split("\n",-1);
        int count=Math.min(all.length,MAX_LINES);
        boolean truncated=all.length>count||state.equals("TRUNCATED");
        List<String> lines=new ArrayList<>();
        int budget=59000;
        for(int index=0;index<count;index++){
            String line=all[index].stripTrailing();
            int cap=Math.min(Math.min(line.length(),MAX_LINE),budget);
            if(cap<line.length()){
                truncated=true;
                if(cap>0&&Character.isHighSurrogate(line.charAt(cap-1)))cap--;
                line=line.substring(0,cap);
            }
            lines.add(line);
            budget-=line.length()+1;
            if(budget<=0){truncated=true;break;}
        }
        String content=String.join("\n",lines);
        if(content.isBlank())return new Page(number,"NO_TEXT","",List.of());
        return new Page(number,truncated?"TRUNCATED":"TEXT",content,index(lines));
    }

    private static List<Anchor> index(List<String> lines) {
        var result=new ArrayList<Anchor>();
        int start=0;
        while(start<lines.size()){
            if(lines.get(start).isBlank()){start++;continue;}
            int width=cells(lines.get(start)).size();
            int end=start+1;
            if(width>=2){
                while(end<lines.size()&&cells(lines.get(end)).size()==width)end++;
                boolean numeric=false;
                for(int i=start;i<end&&!numeric;i++)numeric=cells(lines.get(i)).stream().anyMatch(EvidenceText::numeric);
                if(end-start>=2&&numeric){
                    for(int i=start;i<end;i++)result.add(new Anchor(i+1,i+1,"TABLE_ROW",lines.get(i),cells(lines.get(i))));
                    start=end;
                    continue;
                }
            }
            end=start+1;
            int size=lines.get(start).length();
            while(end<lines.size()&&!lines.get(end).isBlank()&&cells(lines.get(end)).isEmpty()
                    &&end-start<6&&size+1+lines.get(end).length()<=3000){
                size+=1+lines.get(end).length();
                end++;
            }
            result.add(new Anchor(start+1,end,"PASSAGE",String.join("\n",lines.subList(start,end)),List.of()));
            start=end;
        }
        return List.copyOf(result);
    }

    private static List<String> cells(String line) {
        var values=Arrays.stream(line.strip().split("(?:\\t+| {2,})")).map(String::strip).toList();
        return values.size()>=2&&values.size()<=12&&values.stream().allMatch(value->!value.isBlank()&&value.length()<=400)
                ? values : List.of();
    }

    private static boolean numeric(String value) {
        return value.matches("[-+]?\\(?[0-9][0-9,]*(?:\\.[0-9]+)?\\)?%?");
    }
}
