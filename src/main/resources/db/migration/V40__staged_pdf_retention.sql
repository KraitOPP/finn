ALTER TABLE finn.research_pdf ADD COLUMN staged_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE FUNCTION finn.discard_staged_pdf(p_owner UUID,p_file UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
    WITH removed AS (
        DELETE FROM finn.research_pdf p WHERE p.owner_id=p_owner AND p.file_id=p_file
        AND NOT EXISTS(SELECT 1 FROM finn.source_document_version v WHERE v.owner_id=p.owner_id AND v.pdf_id=p.file_id)
        RETURNING 1
    ) SELECT EXISTS(SELECT 1 FROM removed)
$$;
CREATE FUNCTION finn.prune_staged_pdfs(p_owner UUID) RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
    WITH removed AS (
        DELETE FROM finn.research_pdf p WHERE p.owner_id=p_owner AND p.staged_at<clock_timestamp()-interval '7 days'
        AND NOT EXISTS(SELECT 1 FROM finn.source_document_version v WHERE v.owner_id=p.owner_id AND v.pdf_id=p.file_id)
        RETURNING 1
    ) SELECT count(*)::integer FROM removed
$$;
REVOKE ALL ON FUNCTION finn.discard_staged_pdf(UUID,UUID),finn.prune_staged_pdfs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finn.discard_staged_pdf(UUID,UUID),finn.prune_staged_pdfs(UUID) TO finn_app;
