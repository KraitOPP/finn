package dev.finn.imports;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import dev.finn.instruments.Isin;
import dev.finn.platform.WorkspacePolicy;

public final class SyntheticWorkbook {
    private static final String MAIN="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final String REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    public static final String WORKSHEET="xl/worksheets/sheet1.xml";
    private SyntheticWorkbook(){}
    public static void main(String[] args)throws IOException {
        var root=WorkspacePolicy.requireExternalRoot(System.getenv("FINN_WORKSPACE_ROOT"));
        var directory=Files.createDirectories(root.resolve("demo")).toRealPath();
        if(!directory.startsWith(root))throw new IOException("Demo directory is outside the workspace.");
        var workbook=directory.resolve("fictional-groww-holdings.xlsx");
        byte[] data=holdings();
        if(Files.exists(workbook,java.nio.file.LinkOption.NOFOLLOW_LINKS)){
            if(Files.isSymbolicLink(workbook)||Files.size(workbook)!=data.length||!java.util.Arrays.equals(Files.readAllBytes(workbook),data))
                throw new IOException("The synthetic fixture already exists with different contents.");
        }else{
            Files.write(workbook,data,StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);
        }
        System.out.println("Fictional workbook is ready in the external demo directory.");
    }
    public static String isin(int number){
        String prefix="ZZ%09d".formatted(number);
        for(int check=0;check<10;check++)if(Isin.valid(prefix+check))return prefix+check;
        throw new AssertionError("Synthetic ISIN unavailable");
    }
    public static String text(String cell,String value){return "<c r=\""+cell+"\" t=\"inlineStr\"><is><t>"+value.replace("&","&amp;").replace("<","&lt;")+"</t></is></c>";}
    public static String number(String cell,String value){return "<c r=\""+cell+"\"><v>"+value+"</v></c>";}
    public static Map<String,String> parts(){
        var parts=new LinkedHashMap<String,String>();
        parts.put("[Content_Types].xml","""
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                </Types>
                """);
        parts.put("_rels/.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"root1\" Type=\""+REL+"/officeDocument\" Target=\"/xl/workbook.xml\"/></Relationships>");
        parts.put("xl/workbook.xml","<workbook xmlns=\""+MAIN+"\" xmlns:r=\""+REL+"\"><sheets><sheet name=\"Sheet1\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
        parts.put("xl/_rels/workbook.xml.rels","<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\""+REL+"/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>");
        parts.put(WORKSHEET,"<worksheet xmlns=\""+MAIN+"\"><sheetData>"
                + row(1,text("A1","FICTIONAL_METADATA_MUST_NOT_LEAK"))
                + row(4,text("A4","Holdings statement for stocks as on 09-11-2020"))
                + row(7,text("A7","Invested Value")+number("B7","50.00"))
                + row(8,text("A8","Closing Value")+number("B8","49.50"))
                + row(9,text("A9","Unrealised P&L")+number("B9","-0.50"))
                + row(11,text("A11","Stock Name")+text("B11","ISIN")+text("C11","Quantity")+text("D11","Average buy price")+text("E11","Buy value")+text("F11","Closing price")+text("G11","Closing value")+text("H11","Unrealised P&L"))
                + row(12,text("A12","Fictional Alpha Equity")+text("B12",isin(1))+number("C12","3")+number("D12","10.25")+number("E12","30.75")+number("F12","11")+number("G12","33")+number("H12","2.25"))
                + row(14,text("A14","Fictional Beta Equity")+text("B14",isin(2))+number("C14","2")+number("D14","9.00")+number("E14","18.00")+number("F14","8.25")+number("G14","16.50")+number("H14","-1.50"))
                + "</sheetData></worksheet>");
        return parts;
    }
    private static String row(int number,String contents){return "<row r=\""+number+"\">"+contents+"</row>";}
    public static byte[] holdings(){return zip(parts());}
    public static byte[] zip(Map<String,String> parts){
        var output=new ByteArrayOutputStream();
        try(var zip=new ZipOutputStream(output,StandardCharsets.UTF_8)){
            for(var part:parts.entrySet()){
                var entry=new ZipEntry(part.getKey());
                entry.setTime(0);
                zip.putNextEntry(entry);
                zip.write(part.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }catch(IOException error){throw new AssertionError("Synthetic ZIP creation failed",error);}
        return output.toByteArray();
    }
}
