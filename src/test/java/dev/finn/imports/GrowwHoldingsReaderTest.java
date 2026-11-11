package dev.finn.imports;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static dev.finn.imports.ImportRejected.Code.*;
import static dev.finn.imports.SyntheticWorkbook.*;
import static org.assertj.core.api.Assertions.*;

class GrowwHoldingsReaderTest {
    private static void rejected(byte[] input,ImportRejected.Code code){assertThatThrownBy(()->GrowwHoldingsReader.read(input)).isInstanceOfSatisfying(ImportRejected.class,error->assertThat(error.code()).isEqualTo(code));}
    @Test void preservesExactSourceAmountsLocatorsAndBothReconciliationSides(){
        var preview=GrowwHoldingsReader.read(holdings());
        assertThat(preview.asOfDate()).isEqualTo(LocalDate.of(2020,11,9));
        assertThat(preview.rows()).extracting(GrowwHoldingsReader.Row::rowNumber).containsExactly(12,14);
        assertThat(preview.rows().getLast().buyValue()).isEqualTo("18.00");
        assertThat(preview.rows().getLast().unrealisedPnl()).isEqualTo("-1.50");
        assertThat(preview.reportedSummary().buyValue()).isEqualTo("50.00");
        assertThat(preview.detailTotals().buyValue()).isEqualTo("48.75");
        assertThat(preview.comparisons()).extracting(GrowwHoldingsReader.Comparison::status).containsExactly("MISMATCH","MATCH","MISMATCH");
        assertThat(preview.warnings()).contains("SUMMARY_TOTAL_MISMATCH","INR_CONFIRMATION_REQUIRED","HOLDINGS_SNAPSHOT_ONLY").doesNotContain("SUMMARY_ARITHMETIC_MISMATCH","BLOCKED_ROWS_PRESENT");
        assertThat(preview.toString()).doesNotContain("FICTIONAL_METADATA_MUST_NOT_LEAK");
    }
    @Test void marksDuplicateAndFractionalRowsWithoutChoosingAListing(){
        var parts=parts();parts.compute(WORKSHEET,(key,sheet)->sheet.replace(text("B14",isin(2)),text("B14",isin(1))).replace(number("C12","3"),number("C12","1.5")));
        var preview=GrowwHoldingsReader.read(zip(parts));
        assertThat(preview.rows()).allSatisfy(row->assertThat(row.issues()).contains(new GrowwHoldingsReader.RowIssue("DUPLICATE_SECURITY","B",true)));
        assertThat(preview.rows().getFirst().issues()).contains(new GrowwHoldingsReader.RowIssue("INVALID_WHOLE_UNITS","C",true));
        assertThat(preview.warnings()).contains("LISTINGS_NOT_PROVIDED","BLOCKED_ROWS_PRESENT");
    }
    @Test void missingCostAndZeroCloseAreEvidenceRatherThanInventedPrices(){
        var parts=parts();parts.compute(WORKSHEET,(key,sheet)->sheet.replace(number("E12","30.75"),"").replace(number("F12","11"),number("F12","0")));
        var result=GrowwHoldingsReader.read(zip(parts));
        var first=result.rows().getFirst();
        assertThat(first.buyValue()).isNull();assertThat(result.detailTotals().buyValue()).isNull();
        assertThat(first.closingPrice()).isEqualTo("0");
        assertThat(first.issues()).contains(new GrowwHoldingsReader.RowIssue("ZERO_REPORTED_CLOSE","F",false),new GrowwHoldingsReader.RowIssue("REPORTED_COST_UNKNOWN","E",false));
        assertThat(result.warnings()).contains("SUMMARY_INCOMPLETE");
    }
    @Test void rejectsFormulaCachesAndExternalRelationships(){
        var formulas=parts();formulas.compute(WORKSHEET,(key,sheet)->sheet.replace(number("E12","30.75"),"<c r=\"E12\"><f>1+1</f><v>30.75</v></c>"));
        rejected(zip(formulas),UNSUPPORTED_PACKAGE_CONTENT);
        var external=parts();external.compute("xl/_rels/workbook.xml.rels",(key,rels)->rels.replace("Target=\"worksheets/sheet1.xml\"","TargetMode=\"External\" Target=\"https://example.invalid/private\""));
        rejected(zip(external),UNSUPPORTED_PACKAGE_CONTENT);
        var dtd=parts();dtd.compute(WORKSHEET,(key,sheet)->"<!DOCTYPE worksheet SYSTEM 'https://example.invalid/source.dtd'>"+sheet);
        rejected(zip(dtd),UNSAFE_XML);
    }
    @Test void rejectsMacrosTraversalSymlinksAndCorruptDirectoryEvidence(){
        var macro=parts();macro.put("xl/vbaProject.bin","fixture");rejected(zip(macro),UNSUPPORTED_PACKAGE_CONTENT);
        var traversal=parts();traversal.put("../outside.xml","<data/>");rejected(zip(traversal),UNSUPPORTED_PACKAGE_CONTENT);
        byte[] symlink=holdings();int offset=central(symlink);symlink[offset+41]=(byte)0xa0;rejected(symlink,UNSUPPORTED_PACKAGE_CONTENT);
        byte[] crc=holdings();crc[central(crc)+16]^=1;rejected(crc,INVALID_XLSX);
    }
    @Test void enforcesUploadExpansionAndXmlDepthBounds(){
        rejected(new byte[GrowwHoldingsReader.MAX_BYTES+1],FILE_TOO_LARGE);
        var large=parts();large.put("docProps/custom.xml","<data>"+"x".repeat(1_000_000)+"</data>");rejected(zip(large),PACKAGE_LIMIT_REACHED);
        var deep=parts();deep.put("docProps/custom.xml","<data>".repeat(40)+"</data>".repeat(40));rejected(zip(deep),PACKAGE_LIMIT_REACHED);
    }
    @Test void rejectsChangedHeadersFootersAndImpossibleReportDates(){
        var headings=parts();headings.compute(WORKSHEET,(key,sheet)->sheet.replace("Average buy price","Price"));rejected(zip(headings),UNSUPPORTED_REPORT_LAYOUT);
        var footer=parts();footer.compute(WORKSHEET,(key,sheet)->sheet.replace("</sheetData>","<row r=\"15\">"+text("A15","Unrecognised footer")+"</row></sheetData>"));rejected(zip(footer),UNSUPPORTED_REPORT_LAYOUT);
        var dates=parts();dates.compute(WORKSHEET,(key,sheet)->sheet.replace("09-11-2020","31-02-2020"));rejected(zip(dates),INVALID_REPORT_DATE);
    }
    private static int central(byte[] bytes){return ByteBuffer.wrap(bytes,bytes.length-6,4).order(ByteOrder.LITTLE_ENDIAN).getInt();}
}
