package dev.finn.imports;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.stream.*;
import static dev.finn.imports.ImportRejected.Code.*;

final class SafeOoxmlPackage {
    static final int MAX_UPLOAD=5*1024*1024;
    private static final int MAX_PART=8*1024*1024, MAX_EXPANDED=25*1024*1024, MAX_MEMBERS=64;
    private static final long LOCAL=0x04034b50L,CENTRAL=0x02014b50L,END=0x06054b50L;
    private static final Set<String> PARTS=Set.of("[Content_Types].xml","_rels/.rels","docProps/app.xml","docProps/core.xml","docProps/custom.xml",
            "xl/workbook.xml","xl/_rels/workbook.xml.rels","xl/worksheets/sheet1.xml","xl/worksheets/_rels/sheet1.xml.rels","xl/sharedStrings.xml","xl/styles.xml","xl/theme/theme1.xml");
    private static final Set<String> BLOCKED_XML=Set.of("f","formula","definedName","externalReference","externalLink","hyperlink","oleObject","control","drawing","legacyDrawing","connection","queryTable","dataConsolidate","ddeLink","webPublishItem");
    private record Member(long size,long compressed,long crc,int method){}
    static final class Budget {
        private final long deadline=System.nanoTime()+Duration.ofSeconds(8).toNanos();
        void check(){if(System.nanoTime()-deadline>=0||Thread.currentThread().isInterrupted())throw new ImportRejected(PARSE_BUDGET_EXCEEDED);}
    }
    private SafeOoxmlPackage(){}

    static Map<String,byte[]> read(byte[] bytes,Budget budget){
        if(bytes==null||bytes.length<22)throw new ImportRejected(INVALID_XLSX);
        if(bytes.length>MAX_UPLOAD)throw new ImportRejected(FILE_TOO_LARGE);
        if(u32(bytes,0)!=LOCAL)throw new ImportRejected(INVALID_XLSX);
        var metadata=directory(bytes,budget);
        Map<String,byte[]> parts=new LinkedHashMap<>();
        byte[] buffer=new byte[8192];int total=0;
        try(var input=new ZipInputStream(new ByteArrayInputStream(bytes),StandardCharsets.UTF_8)){
            for(var entry=input.getNextEntry();entry!=null;entry=input.getNextEntry()){
                budget.check();Member expected=metadata.get(entry.getName());
                if(expected==null||entry.isDirectory()||parts.containsKey(entry.getName())||entry.getMethod()!=expected.method())throw new ImportRejected(INVALID_XLSX);
                var output=new ByteArrayOutputStream((int)Math.min(expected.size(),8192));int count=0;
                for(int read=input.read(buffer);read!=-1;read=input.read(buffer)){
                    budget.check();count+=read;total+=read;
                    if(count>expected.size()||count>MAX_PART||total>MAX_EXPANDED)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                    output.write(buffer,0,read);
                }
                input.closeEntry();
                if(count!=expected.size()||entry.getCrc()!=expected.crc()||entry.getCompressedSize()!=expected.compressed())throw new ImportRejected(INVALID_XLSX);
                parts.put(entry.getName(),output.toByteArray());
            }
        }catch(IOException|IllegalArgumentException failure){throw new ImportRejected(INVALID_XLSX);}
        if(parts.size()!=metadata.size())throw new ImportRejected(INVALID_XLSX);
        return parts;
    }
    private static Map<String,Member> directory(byte[] bytes,Budget budget){
        int end=-1;int lower=Math.max(0,bytes.length-65557);
        for(int i=bytes.length-22;i>=lower;i--){if(u32(bytes,i)==END&&i+22+u16(bytes,i+20)==bytes.length){end=i;break;}}
        if(end<0||u16(bytes,end+4)!=0||u16(bytes,end+6)!=0)throw new ImportRejected(INVALID_XLSX);
        int count=u16(bytes,end+10);
        if(count<1||count>MAX_MEMBERS)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
        long start=u32(bytes,end+16),length=u32(bytes,end+12);
        if(u16(bytes,end+8)!=count||start<30||start+length!=end)throw new ImportRejected(INVALID_XLSX);
        int cursor=(int)start;long total=0;var entries=new LinkedHashMap<String,Member>();var offsets=new HashSet<Long>();
        for(int i=0;i<count;i++){
            budget.check();
            if(cursor+46>end||u32(bytes,cursor)!=CENTRAL)throw new ImportRejected(INVALID_XLSX);
            int flags=u16(bytes,cursor+8),method=u16(bytes,cursor+10),nameLength=u16(bytes,cursor+28),extra=u16(bytes,cursor+30),comment=u16(bytes,cursor+32);
            long crc=u32(bytes,cursor+16),compressed=u32(bytes,cursor+20),size=u32(bytes,cursor+24),attributes=u32(bytes,cursor+38),local=u32(bytes,cursor+42);
            long after=(long)cursor+46+nameLength+extra+comment;
            if(after>end||nameLength<1||nameLength>128||extra>1024||comment>1024||u16(bytes,cursor+34)!=0)throw new ImportRejected(INVALID_XLSX);
            long unixType=(attributes>>>16)&0xf000;
            if((flags&~0x80e)!=0||(method!=0&&method!=8)||(unixType!=0&&unixType!=0x8000))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
            String name=new String(bytes,cursor+46,nameLength,StandardCharsets.US_ASCII);
            if(!PARTS.contains(name))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
            if(size>MAX_PART||(total+=size)>MAX_EXPANDED||size>200*Math.max(1,compressed))throw new ImportRejected(PACKAGE_LIMIT_REACHED);
            if(local+30>start||!offsets.add(local)||u32(bytes,(int)local)!=LOCAL)throw new ImportRejected(INVALID_XLSX);
            int localName=u16(bytes,(int)local+26),localExtra=u16(bytes,(int)local+28);
            long data=local+30+localName+localExtra;
            if(localName!=nameLength||localExtra>1024||data+compressed>start||u16(bytes,(int)local+6)!=flags||u16(bytes,(int)local+8)!=method
                    ||!new String(bytes,(int)local+30,localName,StandardCharsets.US_ASCII).equals(name))throw new ImportRejected(INVALID_XLSX);
            checkExtra(bytes,cursor+46+nameLength,extra);checkExtra(bytes,(int)local+30+localName,localExtra);
            if(entries.putIfAbsent(name,new Member(size,compressed,crc,method))!=null)throw new ImportRejected(INVALID_XLSX);
            cursor=(int)after;
        }
        if(cursor!=end)throw new ImportRejected(INVALID_XLSX);
        return entries;
    }
    private static void checkExtra(byte[] bytes,int start,int length){
        int end=start+length;
        while(start<end){if(start+4>end)throw new ImportRejected(INVALID_XLSX);int id=u16(bytes,start),size=u16(bytes,start+2);if(id==1)throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);start+=4+size;}
        if(start!=end)throw new ImportRejected(INVALID_XLSX);
    }
    private static int u16(byte[] bytes,int offset){if(offset<0||offset>bytes.length-2)throw new ImportRejected(INVALID_XLSX);return (bytes[offset]&255)|((bytes[offset+1]&255)<<8);}
    private static long u32(byte[] bytes,int offset){return u16(bytes,offset)|((long)u16(bytes,offset+2)<<16);}

    static final class Xml implements AutoCloseable {
        private final XMLStreamReader reader;private final Budget budget;private int depth,events;
        Xml(byte[] bytes,Budget budget){
            if(bytes==null)throw new ImportRejected(INVALID_XLSX);
            this.budget=budget;
            try{
                XMLInputFactory factory=XMLInputFactory.newDefaultFactory();
                factory.setProperty(XMLInputFactory.SUPPORT_DTD,false);factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES,false);
                factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD,"");
                factory.setXMLResolver((publicId,systemId,base,namespace)->{throw new XMLStreamException("External resolution disabled");});
                reader=factory.createXMLStreamReader(new ByteArrayInputStream(bytes),"UTF-8");
            }catch(XMLStreamException|IllegalArgumentException error){throw new ImportRejected(UNSAFE_XML);}
        }
        boolean next(){
            budget.check();
            try{
                if(!reader.hasNext())return false;
                int event=reader.next();
                if(++events>300000)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                if(event==XMLStreamConstants.DTD||event==XMLStreamConstants.ENTITY_REFERENCE||event==XMLStreamConstants.PROCESSING_INSTRUCTION)throw new ImportRejected(UNSAFE_XML);
                if(start()){
                    if(++depth>32||reader.getAttributeCount()>32)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                    if(BLOCKED_XML.contains(name()))throw new ImportRejected(UNSUPPORTED_PACKAGE_CONTENT);
                    for(int i=0;i<reader.getAttributeCount();i++)if(reader.getAttributeValue(i).length()>4096)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                }
                if(end())depth--;
                if(chars()&&reader.getTextLength()>8192)throw new ImportRejected(PACKAGE_LIMIT_REACHED);
                return true;
            }catch(XMLStreamException error){throw new ImportRejected(UNSAFE_XML);}
        }
        boolean start(){return reader.getEventType()==XMLStreamConstants.START_ELEMENT;}
        boolean end(){return reader.getEventType()==XMLStreamConstants.END_ELEMENT;}
        boolean chars(){return reader.getEventType()==XMLStreamConstants.CHARACTERS||reader.getEventType()==XMLStreamConstants.CDATA;}
        String name(){return reader.getLocalName();}
        String namespace(){return reader.getNamespaceURI();}
        String attr(String name){return reader.getAttributeValue(null,name);}
        String attr(String namespace,String name){return reader.getAttributeValue(namespace,name);}
        String text(){return reader.getText();}
        @Override public void close(){try{reader.close();}catch(XMLStreamException ignored){/* Input is bounded in memory. */}}
    }
}
