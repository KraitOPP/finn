package dev.finn.imports;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.*;
import java.util.function.Function;
import dev.finn.instruments.Isin;
import dev.finn.ledger.LedgerRules;
import static dev.finn.imports.ImportRejected.Code.*;

public final class GrowwHoldingsReader {
    public static final String PROFILE="groww-holdings-xlsx-v1";
    public static final int MAX_BYTES=SafeOoxmlPackage.MAX_UPLOAD, MAX_ROWS=1000;
    private static final String MAIN="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final String DOC_REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static final String PACKAGE_REL="http://schemas.openxmlformats.org/package/2006/relationships";
    private static final String CONTENT_TYPES="http://schemas.openxmlformats.org/package/2006/content-types";
    private static final String WORKBOOK="xl/workbook.xml", SHEET="xl/worksheets/sheet1.xml";
    private static final String CAPTION="Holdings statement for stocks as on ";
    private static final BigDecimal TOLERANCE=new BigDecimal("0.01");
    private static final List<String> HEADERS=List.of("Stock Name","ISIN","Quantity","Average buy price","Buy value","Closing price","Closing value","Unrealised P&L");
    private static final DateTimeFormatter DATE=DateTimeFormatter.ofPattern("dd-MM-uuuu",Locale.ROOT).withResolverStyle(ResolverStyle.STRICT);
    public record RowIssue(String code,String column,boolean blocksCommit){}
    public record Row(int rowNumber,String reportedName,String isin,String quantity,String averageCost,String buyValue,
                      String closingPrice,String closingValue,String unrealisedPnl,List<RowIssue> issues){}
    public record Totals(String buyValue,String closingValue,String unrealisedPnl){}
    public record Comparison(String field,String reported,String detailSum,String difference,String status){}
    public record Preview(String profile,LocalDate asOfDate,Totals reportedSummary,Totals detailTotals,List<Comparison> comparisons,
                          List<String> warnings,List<Row> rows){}
    private record Relationship(String type,String target){}
    private record Cell(String kind,String text){}
    private GrowwHoldingsReader(){}

    public static Preview read(byte[] workbook){
        var budget=new SafeOoxmlPackage.Budget();
        var parts=SafeOoxmlPackage.read(workbook,budget);
        validatePackage(parts,budget);
        List<String> strings=parts.containsKey("xl/sharedStrings.xml")?sharedStrings(parts.get("xl/sharedStrings.xml"),budget):List.of();
        var rows=sheet(parts.get(SHEET),strings,budget);
        String caption=label(rows,4,1);
        if(caption==null||!caption.startsWith(CAPTION))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
        LocalDate date;
        try{String raw=caption.substring(CAPTION.length());if(!raw.matches("[0-9]{2}-[0-9]{2}-[0-9]{4}"))throw new ImportRejected(INVALID_REPORT_DATE);date=LocalDate.parse(raw,DATE);}
        catch(DateTimeParseException invalid){throw new ImportRejected(INVALID_REPORT_DATE);}
        if(date.isBefore(LocalDate.of(1900,1,1))||date.isAfter(LocalDate.now(ZoneId.of("Asia/Kolkata"))))throw new ImportRejected(INVALID_REPORT_DATE);
        for(int i=0;i<HEADERS.size();i++)requireLabel(rows,11,i+1,HEADERS.get(i));
        requireLabel(rows,7,1,"Invested Value");requireLabel(rows,8,1,"Closing Value");requireLabel(rows,9,1,"Unrealised P&L");
        var warnings=new TreeSet<>(Set.of("INR_CONFIRMATION_REQUIRED","HOLDINGS_SNAPSHOT_ONLY","LISTINGS_NOT_PROVIDED"));
        var summary=new Totals(summaryNumber(cell(rows,7,2),false,warnings),summaryNumber(cell(rows,8,2),false,warnings),summaryNumber(cell(rows,9,2),true,warnings));
        List<Row> detail=new ArrayList<>();Map<String,Integer> counts=new HashMap<>();
        for(var line:rows.tailMap(12).entrySet()){
            budget.check();var columns=line.getValue();if(columns.isEmpty())continue;
            if(columns.keySet().stream().anyMatch(column->column>8)||(!columns.containsKey(2)&&!columns.containsKey(3)))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
            if(detail.size()>=MAX_ROWS)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
            var row=parseRow(line.getKey(),columns);detail.add(row);
            if(Isin.valid(row.isin()))counts.merge(row.isin(),1,Integer::sum);
        }
        if(detail.isEmpty())throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
        detail=detail.stream().map(row->{
            if(row.isin()==null||counts.getOrDefault(row.isin(),0)<2)return row;
            var issues=new ArrayList<>(row.issues());issues.add(new RowIssue("DUPLICATE_SECURITY","B",true));
            return new Row(row.rowNumber(),row.reportedName(),row.isin(),row.quantity(),row.averageCost(),row.buyValue(),row.closingPrice(),row.closingValue(),row.unrealisedPnl(),List.copyOf(issues));
        }).toList();
        var totals=new Totals(sum(detail,Row::buyValue),sum(detail,Row::closingValue),sum(detail,Row::unrealisedPnl));
        var comparisons=List.of(compare("BUY_VALUE",summary.buyValue(),totals.buyValue()),compare("CLOSING_VALUE",summary.closingValue(),totals.closingValue()),compare("UNREALISED_PNL",summary.unrealisedPnl(),totals.unrealisedPnl()));
        if(comparisons.stream().anyMatch(check->check.status().equals("MISMATCH")))warnings.add("SUMMARY_TOTAL_MISMATCH");
        if(comparisons.stream().anyMatch(check->check.status().equals("INCOMPLETE")))warnings.add("SUMMARY_INCOMPLETE");
        if(summary.buyValue()!=null&&summary.closingValue()!=null&&summary.unrealisedPnl()!=null&&different(decimal(summary.closingValue()).subtract(decimal(summary.buyValue())),decimal(summary.unrealisedPnl())))warnings.add("SUMMARY_ARITHMETIC_MISMATCH");
        if(detail.stream().anyMatch(row->row.issues().stream().anyMatch(RowIssue::blocksCommit)))warnings.add("BLOCKED_ROWS_PRESENT");
        if(detail.stream().anyMatch(row->row.issues().stream().anyMatch(issue->issue.code().startsWith("ROW_"))))warnings.add("ROW_RECONCILIATION_REQUIRED");
        return new Preview(PROFILE,date,summary,totals,comparisons,List.copyOf(warnings),detail);
    }
    private static void validatePackage(Map<String,byte[]> parts,SafeOoxmlPackage.Budget budget){
        for(String required:List.of("[Content_Types].xml","_rels/.rels",WORKBOOK,"xl/_rels/workbook.xml.rels",SHEET))if(!parts.containsKey(required))throw new ImportRejected(INVALID_XLSX);
        var types=new HashMap<String,String>();
        try(var xml=new SafeOoxmlPackage.Xml(parts.get("[Content_Types].xml"),budget)){
            boolean root=false;
            while(xml.next())if(xml.start()){
                if(!root){root=true;requireElement(xml,"Types",CONTENT_TYPES);continue;}
                if(!CONTENT_TYPES.equals(xml.namespace()))throw new ImportRejected(INVALID_XLSX);
                String type=xml.attr("ContentType");
                if(type==null)throw new ImportRejected(INVALID_XLSX);
                String lower=type.toLowerCase(Locale.ROOT);
                if(lower.contains("macro")||lower.contains("activex")||lower.contains("oleobject")||lower.contains("externallink"))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
                if(xml.name().equals("Override")){String part=target("",xml.attr("PartName"));if(!parts.containsKey(part)||types.putIfAbsent(part,type)!=null)throw new ImportRejected(INVALID_XLSX);}
                else if(!xml.name().equals("Default"))throw new ImportRejected(INVALID_XLSX);
            }
        }
        if(!"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml".equals(types.get(WORKBOOK))||!"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml".equals(types.get(SHEET)))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
        var root=relationships(parts,"_rels/.rels","",budget);
        long office=root.values().stream().filter(rel->rel.type().equals(DOC_REL+"/officeDocument")&&rel.target().equals(WORKBOOK)).count();
        if(office!=1)throw new ImportRejected(INVALID_XLSX);
        var workbook=relationships(parts,"xl/_rels/workbook.xml.rels","xl/",budget);
        if(parts.containsKey("xl/worksheets/_rels/sheet1.xml.rels"))relationships(parts,"xl/worksheets/_rels/sheet1.xml.rels","xl/worksheets/",budget);
        try(var xml=new SafeOoxmlPackage.Xml(parts.get(WORKBOOK),budget)){
            boolean foundRoot=false;int sheetCount=0;
            while(xml.next())if(xml.start()){
                if(!foundRoot){foundRoot=true;requireElement(xml,"workbook",MAIN);continue;}
                if(MAIN.equals(xml.namespace())&&xml.name().equals("workbookPr")){
                    String dateSystem=xml.attr("date1904");if(dateSystem!=null&&!Set.of("false","0").contains(dateSystem))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
                }
                if(MAIN.equals(xml.namespace())&&xml.name().equals("sheet")){
                    sheetCount++;String state=xml.attr("state");var rel=workbook.get(xml.attr(DOC_REL,"id"));
                    if(sheetCount!=1||!"Sheet1".equals(xml.attr("name"))||(state!=null&&!state.equals("visible"))||rel==null||!rel.type().equals(DOC_REL+"/worksheet")||!rel.target().equals(SHEET))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
                }
            }
            if(sheetCount!=1)throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
        }
        for(var entry:parts.entrySet()){
            String name=entry.getKey();if(name.endsWith(".rels")||List.of("[Content_Types].xml",WORKBOOK,SHEET,"xl/sharedStrings.xml").contains(name))continue;
            try(var xml=new SafeOoxmlPackage.Xml(entry.getValue(),budget)){while(xml.next()){/* Scan unused parts for unsafe XML or active content. */}}
        }
    }
    private static Map<String,Relationship> relationships(Map<String,byte[]> parts,String path,String base,SafeOoxmlPackage.Budget budget){
        var entries=new HashMap<String,Relationship>();
        try(var xml=new SafeOoxmlPackage.Xml(parts.get(path),budget)){
            boolean root=false;
            while(xml.next())if(xml.start()){
                if(!root){root=true;requireElement(xml,"Relationships",PACKAGE_REL);continue;}
                requireElement(xml,"Relationship",PACKAGE_REL);
                String mode=xml.attr("TargetMode"),type=xml.attr("Type"),id=xml.attr("Id");
                if((mode!=null&&!mode.equals("Internal"))||type==null||type.toLowerCase(Locale.ROOT).matches(".*(?:external|oleobject|hyperlink|activex|connection|attachedtemplate).*"))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
                String resolved=target(base,xml.attr("Target"));
                if(id==null||id.isBlank()||entries.size()>=64||!parts.containsKey(resolved)||entries.putIfAbsent(id,new Relationship(type,resolved))!=null)throw new ImportRejected(INVALID_XLSX);
            }
        }
        return entries;
    }
    private static String target(String base,String input){
        if(input==null||input.isBlank()||!input.matches("/?[A-Za-z0-9_.\\-/]+")||input.startsWith("//"))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
        String path=input.startsWith("/")?input.substring(1):base+input;
        if(Arrays.stream(path.split("/",-1)).anyMatch(piece->piece.isBlank()||piece.equals(".")||piece.equals("..")))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
        return path;
    }
    private static void requireElement(SafeOoxmlPackage.Xml xml,String name,String namespace){if(!name.equals(xml.name())||!namespace.equals(xml.namespace()))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);}
    private static List<String> sharedStrings(byte[] part,SafeOoxmlPackage.Budget budget){
        List<String> values=new ArrayList<>();StringBuilder value=null;boolean collect=false,root=false;
        try(var xml=new SafeOoxmlPackage.Xml(part,budget)){
            while(xml.next()){
                if(xml.start()){
                    if(!root){root=true;requireElement(xml,"sst",MAIN);continue;}
                    if(MAIN.equals(xml.namespace())&&xml.name().equals("si")){if(value!=null||values.size()>=10000)throw new ImportRejected(PACKAGE_LIMIT_REACHED);value=new StringBuilder();}
                    if(MAIN.equals(xml.namespace())&&xml.name().equals("t")&&value!=null)collect=true;
                }else if(xml.chars()&&collect){append(value,xml.text(),512);}
                else if(xml.end()&&MAIN.equals(xml.namespace())){
                    if(xml.name().equals("t"))collect=false;
                    if(xml.name().equals("si")){if(value==null)throw new ImportRejected(INVALID_XLSX);values.add(value.toString());value=null;}
                }
            }
        }
        return List.copyOf(values);
    }
    private static TreeMap<Integer,Map<Integer,Cell>> sheet(byte[] part,List<String> strings,SafeOoxmlPackage.Budget budget){
        var rows=new TreeMap<Integer,Map<Integer,Cell>>();var seen=new HashSet<Integer>();
        int row=0,lastRow=0,column=0,cells=0,numericValues=0;boolean root=false,data=false,foundData=false,collect=false;
        String type=null;StringBuilder value=null;
        try(var xml=new SafeOoxmlPackage.Xml(part,budget)){
            while(xml.next()){
                if(xml.start()){
                    if(!root){root=true;requireElement(xml,"worksheet",MAIN);continue;}
                    if(!MAIN.equals(xml.namespace()))continue;
                    switch(xml.name()){
                        case "sheetData"->{if(foundData)throw new ImportRejected(INVALID_XLSX);foundData=true;data=true;}
                        case "row"->{if(!data||row!=0)throw new ImportRejected(INVALID_XLSX);row=integer(xml.attr("r"),1,1024);if(row<=lastRow)throw new ImportRejected(INVALID_XLSX);lastRow=row;seen.clear();}
                        case "c"->{
                            if(!data||row==0||column!=0||++cells>12000)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                            String ref=xml.attr("r");if(ref==null||!ref.matches("[A-Z]{1,2}[1-9][0-9]{0,3}"))throw new ImportRejected(INVALID_XLSX);
                            int split=0;while(split<ref.length()&&ref.charAt(split)>='A'&&ref.charAt(split)<='Z'){column=column*26+ref.charAt(split)-'A'+1;split++;}
                            if(column>64||integer(ref.substring(split),1,1024)!=row||!seen.add(column))throw new ImportRejected(INVALID_XLSX);
                            type=xml.attr("t");if(type==null)type="n";if(!Set.of("n","s","inlineStr").contains(type))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
                            value=new StringBuilder();numericValues=0;
                        }
                        case "v"->{if(value!=null){if(++numericValues>1||type.equals("inlineStr"))throw new ImportRejected(INVALID_XLSX);collect=true;}}
                        case "t"->{if(value!=null&&type.equals("inlineStr"))collect=true;}
                        default->{}
                    }
                }else if(xml.chars()&&collect){append(value,xml.text(),512);}
                else if(xml.end()&&MAIN.equals(xml.namespace())){
                    switch(xml.name()){
                        case "v","t"->collect=false;
                        case "c"->{
                            if(value==null||column==0)throw new ImportRejected(INVALID_XLSX);
                            String text=value.toString().strip();
                            if(!text.isEmpty()&&row>2){
                                String kind=type;
                                if(type.equals("s")){text=strings.get(integer(text,0,strings.size()-1)).strip();kind="text";}
                                else if(type.equals("inlineStr"))kind="text";
                                if(!text.isEmpty())rows.computeIfAbsent(row,key->new HashMap<>()).put(column,new Cell(kind,text));
                            }
                            column=0;value=null;type=null;
                        }
                        case "row"->row=0;
                        case "sheetData"->data=false;
                        default->{}
                    }
                }
            }
        }
        if(!foundData)throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);
        return rows;
    }
    private static void append(StringBuilder output,String value,int limit){if(output==null||output.length()+value.length()>limit)throw new ImportRejected(PACKAGE_LIMIT_REACHED);output.append(value);}
    private static int integer(String value,int min,int max){
        if(value==null||!value.matches("[0-9]{1,6}"))throw new ImportRejected(INVALID_XLSX);
        int number=Integer.parseInt(value);if(number<min||number>max)throw new ImportRejected(PACKAGE_LIMIT_REACHED);return number;
    }
    private static Cell cell(Map<Integer,Map<Integer,Cell>> rows,int row,int column){return rows.getOrDefault(row,Map.of()).get(column);}
    private static String label(Map<Integer,Map<Integer,Cell>> rows,int row,int column){var value=cell(rows,row,column);return value!=null&&value.kind().equals("text")?value.text():null;}
    private static void requireLabel(Map<Integer,Map<Integer,Cell>> rows,int row,int column,String expected){if(!expected.equals(label(rows,row,column)))throw new ImportRejected(UNSUPPORTED_REPORT_LAYOUT);}
    private static String summaryNumber(Cell cell,boolean signed,Set<String> warnings){String value=number(cell,signed);if(value==null)warnings.add("SUMMARY_INCOMPLETE");return value;}
    private static String number(Cell cell,boolean signed){
        if(cell==null||!cell.kind().equals("n")||!cell.text().matches("-?(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,24})?"))return null;
        BigDecimal parsed=new BigDecimal(cell.text());if((!signed&&parsed.signum()<0)||parsed.abs().compareTo(LedgerRules.MAX_MONEY)>=0)return null;
        return parsed.toPlainString();
    }
    private static Row parseRow(int row,Map<Integer,Cell> columns){
        var issues=new ArrayList<RowIssue>();
        var name=columns.get(1);var identity=columns.get(2);
        String reportedName=name!=null&&name.kind().equals("text")&&name.text().codePoints().noneMatch(Character::isISOControl)?name.text():null;
        String isin=identity!=null&&identity.kind().equals("text")&&Isin.valid(identity.text())?identity.text():null;
        if(reportedName==null)issues.add(new RowIssue("INVALID_SECURITY_NAME","A",true));if(isin==null)issues.add(new RowIssue("INVALID_ISIN","B",true));
        String quantity=rowNumber(columns,3,false,true,issues),average=rowNumber(columns,4,false,false,issues),buy=rowNumber(columns,5,false,false,issues),
                close=rowNumber(columns,6,false,false,issues),closing=rowNumber(columns,7,false,false,issues),pnl=rowNumber(columns,8,true,false,issues);
        if(quantity!=null){BigDecimal units=decimal(quantity);if(units.stripTrailingZeros().scale()>0||units.compareTo(LedgerRules.MAX_QUANTITY)>0)issues.add(new RowIssue("INVALID_WHOLE_UNITS","C",true));if(units.signum()==0)issues.add(new RowIssue("ZERO_QUANTITY","C",false));}
        if(buy==null)issues.add(new RowIssue("REPORTED_COST_UNKNOWN","E",false));
        if(close!=null&&decimal(close).signum()==0)issues.add(new RowIssue("ZERO_REPORTED_CLOSE","F",false));
        if(quantity!=null&&average!=null&&buy!=null&&different(decimal(quantity).multiply(decimal(average)),decimal(buy)))issues.add(new RowIssue("ROW_BUY_MISMATCH","E",false));
        if(quantity!=null&&close!=null&&closing!=null&&different(decimal(quantity).multiply(decimal(close)),decimal(closing)))issues.add(new RowIssue("ROW_CLOSE_MISMATCH","G",false));
        if(closing!=null&&buy!=null&&pnl!=null&&different(decimal(closing).subtract(decimal(buy)),decimal(pnl)))issues.add(new RowIssue("ROW_PNL_MISMATCH","H",false));
        return new Row(row,reportedName,isin,quantity,average,buy,close,closing,pnl,List.copyOf(issues));
    }
    private static String rowNumber(Map<Integer,Cell> row,int column,boolean signed,boolean required,List<RowIssue> issues){
        Cell cell=row.get(column);String value=number(cell,signed);
        if(value==null&&(cell!=null||required))issues.add(new RowIssue(cell==null?"REQUIRED_NUMBER_MISSING":"INVALID_NUMBER",String.valueOf((char)('A'+column-1)),true));
        return value;
    }
    private static BigDecimal decimal(String value){return new BigDecimal(value);}
    private static boolean different(BigDecimal first,BigDecimal second){return first.subtract(second).abs().compareTo(TOLERANCE)>0;}
    private static String sum(List<Row> rows,Function<Row,String> field){BigDecimal result=BigDecimal.ZERO;for(Row row:rows){String value=field.apply(row);if(value==null)return null;result=result.add(decimal(value));}return result.toPlainString();}
    private static Comparison compare(String field,String reported,String sum){
        if(reported==null||sum==null)return new Comparison(field,reported,sum,null,"INCOMPLETE");
        BigDecimal delta=decimal(reported).subtract(decimal(sum));return new Comparison(field,reported,sum,delta.toPlainString(),delta.abs().compareTo(TOLERANCE)>0?"MISMATCH":"MATCH");
    }
}
