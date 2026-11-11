package dev.finn.ledger;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class LedgerCsvTest {
    @Test void neutralizesFormulaTriggersAfterWhitespaceAndFormatCharacters(){
        assertThat(LedgerCsv.cell("=1+1")).isEqualTo("\"'=1+1\"");
        assertThat(LedgerCsv.cell(" \u200b+1")).isEqualTo("\"' \u200b+1\"");
        assertThat(LedgerCsv.cell("\t@SUM(A1)")).isEqualTo("\"'\t@SUM(A1)\"");
        assertThat(LedgerCsv.cell("-example")).isEqualTo("\"'-example\"");
        assertThat(LedgerCsv.cell("\u00a0＝1+1")).isEqualTo("\"'\u00a0＝1+1\"");
        assertThat(LedgerCsv.cell("Fictional, \"quoted\" equity")).isEqualTo("\"Fictional, \"\"quoted\"\" equity\"");
        assertThat(LedgerCsv.cell("123.450001")).isEqualTo("\"123.450001\"");
    }
}
