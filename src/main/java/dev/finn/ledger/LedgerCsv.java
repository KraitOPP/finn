package dev.finn.ledger;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import dev.finn.platform.ApiFailure;

final class LedgerCsv {
    static final int MAX_BYTES=12*1024*1024;
    private LedgerCsv(){}
    static byte[] encode(List<Journal.EventView> events,long revision){
        var output=new ByteArrayOutputStream(8192);
        output.writeBytes(new byte[]{(byte)0xef,(byte)0xbb,(byte)0xbf});
        line(output,"ledger_revision","sequence","event_id","effective_date","recorded_at","kind","effective","security_id","security_name","exchange","quantity","price_inr","amount_inr","fees_inr","ratio_numerator","ratio_denominator","source","source_reference","reference","reversal_of","reversed_by","replaces_event_id","currency");
        for(var event:events)line(output,revision,event.sequence(),event.eventId(),event.effectiveDate(),event.recordedAt(),event.kind(),event.reversalOf()==null&&event.reversedBy()==null,
                event.securityId(),event.securityName(),event.exchange(),event.quantity(),event.price(),event.amount(),event.fees(),event.ratioNumerator(),event.ratioDenominator(),
                event.source(),event.sourceReference(),event.reference(),event.reversalOf(),event.reversedBy(),event.replacesEventId(),"INR");
        return output.toByteArray();
    }
    private static void line(ByteArrayOutputStream output,Object... values){
        var row=new StringBuilder();
        for(Object value:values){if(!row.isEmpty())row.append(',');row.append(cell(value==null?"":value.toString()));}
        byte[] encoded=row.append("\r\n").toString().getBytes(StandardCharsets.UTF_8);
        if(output.size()+encoded.length>MAX_BYTES)throw new ApiFailure(409,"EXPORT_LIMIT_REACHED");
        output.writeBytes(encoded);
    }
    static String cell(String value){
        boolean prefix=!value.isEmpty()&&"\t\r\n".indexOf(value.charAt(0))>=0;
        for(int offset=0;!prefix&&offset<value.length();){
            int character=value.codePointAt(offset);offset+=Character.charCount(character);
            if(Character.isWhitespace(character)||Character.isSpaceChar(character)||Character.getType(character)==Character.FORMAT)continue;
            prefix="=+-@＝＋－＠".indexOf(character)>=0;break;
        }
        return "\""+(prefix?"'":"")+value.replace("\"","\"\"")+"\"";
    }
}
