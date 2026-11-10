package dev.finn.instruments;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

public class CatalogueTest {
    @Test void validatesExpandedIsinCheckDigitsWithoutGuessingListings() {
        String fictional=fictionalIsin();
        assertThat(Catalogue.validIsin(fictional)).isTrue();
        assertThat(Catalogue.validIsin(fictional.substring(0,11)+(fictional.endsWith("9")?"0":"9"))).isFalse();
        assertThat(Catalogue.validIsin("not-an-isin")).isFalse();
        assertThat(Catalogue.validIsin("ZZ000000001X")).isFalse();
        assertThatThrownBy(()->Catalogue.cleanName("inert\u0000name")).isInstanceOf(dev.finn.platform.ApiFailure.class);
        assertThat(Catalogue.cleanName("  Fictional Company  ")).isEqualTo("Fictional Company");
    }
    public static String fictionalIsin() {
        for(int digit=0;digit<10;digit++){String value="ZZ000000001"+digit;if(Catalogue.validIsin(value))return value;}
        throw new AssertionError("Synthetic ISIN could not be constructed");
    }
}
