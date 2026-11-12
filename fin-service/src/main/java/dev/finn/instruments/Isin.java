package dev.finn.instruments;

public final class Isin {
    private Isin(){}
    public static boolean valid(String value){
        if(value==null||!value.matches("[A-Z]{2}[A-Z0-9]{9}[0-9]"))return false;
        var expanded=new StringBuilder();
        value.chars().forEach(character->{if(character>='A'&&character<='Z')expanded.append(character-'A'+10);else expanded.append((char)character);});
        int sum=0;boolean doubleDigit=false;
        for(int i=expanded.length()-1;i>=0;i--){int digit=expanded.charAt(i)-'0';if(doubleDigit){digit*=2;if(digit>9)digit-=9;}sum+=digit;doubleDigit=!doubleDigit;}
        return sum%10==0;
    }
}
