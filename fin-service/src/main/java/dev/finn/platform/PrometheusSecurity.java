package dev.finn.platform;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationEntryPoint;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="finn.metrics.enabled",havingValue="true")
class PrometheusSecurity {
    @Bean @Order(1)
    SecurityFilterChain prometheusChain(HttpSecurity http,@Value("${finn.metrics.password:}") String password)throws Exception{
        if(password.length()<24)throw new IllegalStateException("Set a private metrics password of at least 24 characters");
        byte[] expected=password.getBytes(StandardCharsets.UTF_8);
        AuthenticationManager authentication=request->{
            if(!"finn-metrics".equals(request.getName())||request.getCredentials()==null
                    ||!MessageDigest.isEqual(expected,request.getCredentials().toString().getBytes(StandardCharsets.UTF_8)))
                throw new BadCredentialsException("Invalid metrics credentials");
            return UsernamePasswordAuthenticationToken.authenticated("finn-metrics",null,List.of(new SimpleGrantedAuthority("METRICS")));
        };
        var entry=new BasicAuthenticationEntryPoint();
        entry.setRealmName("FINN metrics");
        entry.afterPropertiesSet();
        return http.securityMatcher("/actuator/prometheus")
                .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache->cache.disable())
                .exceptionHandling(errors->errors.authenticationEntryPoint(entry))
                .authorizeHttpRequests(requests->requests.requestMatchers(org.springframework.http.HttpMethod.GET,"/actuator/prometheus")
                        .hasAuthority("METRICS").anyRequest().denyAll())
                .addFilter(new BasicAuthenticationFilter(authentication,entry)).build();
    }
}
