ALTER TABLE finn.company DROP CONSTRAINT company_source_check;
ALTER TABLE finn.company ADD CHECK (source IN ('MANUAL_USER','GROWW_HOLDINGS','NSE_DIRECTORY','YAHOO_DISCOVERY'));
ALTER TABLE finn.listing_symbol DROP CONSTRAINT listing_symbol_source_check;
ALTER TABLE finn.listing_symbol ADD CHECK (source IN ('MANUAL_USER','NSE_DIRECTORY','YAHOO_DISCOVERY'));
ALTER TABLE finn.provider_symbol_history DROP CONSTRAINT provider_symbol_history_source_check;
ALTER TABLE finn.provider_symbol_history ADD CHECK (source IN ('MANUAL_USER','NSE_DIRECTORY','YAHOO_DISCOVERY'));

-- Upgrade only an import placeholder with the selected directory's exact ISIN.
CREATE FUNCTION finn.resolve_imported_security(p_owner uuid, p_isin text, p_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = pg_catalog
AS $$
    WITH resolved AS (
        UPDATE finn.security s
        SET review_status='USER_CONFIRMED'
        WHERE s.owner_id=p_owner AND s.isin=p_isin AND s.review_status='UNRESOLVED'
          AND EXISTS (SELECT 1 FROM finn.company c
                      WHERE c.owner_id=s.owner_id AND c.company_id=s.company_id AND c.source='GROWW_HOLDINGS')
        RETURNING s.owner_id,s.company_id
    )
    UPDATE finn.company c SET name=p_name,source='NSE_DIRECTORY'
    FROM resolved r WHERE c.owner_id=r.owner_id AND c.company_id=r.company_id AND c.source='GROWW_HOLDINGS'
$$;
REVOKE ALL ON FUNCTION finn.resolve_imported_security(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finn.resolve_imported_security(uuid,text,text) TO finn_app;
