[CmdletBinding()]
param(
    [Uri]$Origin = 'http://127.0.0.1:5174/',
    [Uri]$Identity = 'http://localhost:8181/',
    [Parameter(Mandatory)][string]$Workspace
)
$ErrorActionPreference = 'Stop'
if ($Origin.Scheme -ne 'http' -or $Origin.Host -ne '127.0.0.1' -or $Identity.Scheme -ne 'http' -or $Identity.Host -ne 'localhost' -or
    $Origin.AbsolutePath -ne '/' -or $Identity.AbsolutePath -ne '/' -or $Origin.Query -or $Identity.Query -or
    $Origin.UserInfo -or $Identity.UserInfo -or $Origin.Fragment -or $Identity.Fragment) { throw 'Use the isolated loopback development origins.' }
$stage = 'synthetic workspace'
try {
    $root = (Resolve-Path -LiteralPath $Workspace).Path
    $demo = Get-Content -LiteralPath (Join-Path $root 'secrets/identity/demo-users.json') -Raw | ConvertFrom-Json
    $user = $demo | Where-Object username -eq 'demo-two' | Select-Object -First 1
    if (!$user.password) { throw 'Run the local setup first' }
    $workbook = Join-Path $root 'demo/fictional-groww-holdings.xlsx'
    if (!(Test-Path -LiteralPath $workbook -PathType Leaf)) { throw 'Generate the fictional workbook first' }
    $site = $Origin.GetLeftPart([UriPartial]::Authority)
    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $stage = 'loopback OIDC'
    $form = Invoke-WebRequest "$site/oauth2/authorization/finn" -WebSession $session -TimeoutSec 20
    $login = [regex]::Match($form.Content,'<form\b[^>]*\bid="kc-form-login"[^>]*>',[Text.RegularExpressions.RegexOptions]::IgnoreCase).Value
    $target = [Net.WebUtility]::HtmlDecode([regex]::Match($login,'\baction="([^"]+)"').Groups[1].Value)
    $action = [Uri]::new($Identity,$target)
    if ($action.Scheme -ne 'http' -or $action.Host -ne 'localhost' -or $action.Port -ne $Identity.Port -or
        !$action.AbsolutePath.StartsWith('/realms/finn-local/login-actions/')) { throw 'Unexpected identity endpoint' }
    # CookieContainer omits the browser exception for Secure cookies on HTTP localhost.
    foreach ($cookie in $session.Cookies.GetAllCookies()) {
        if ($cookie.Domain -eq 'localhost' -and $cookie.Name -in @('AUTH_SESSION_ID','KC_AUTH_SESSION_HASH','KC_RESTART')) {
            $cookie.Secure = $false
            $session.Cookies.Add($action,$cookie)
        }
    }
    $null = Invoke-WebRequest $action -WebSession $session -Method Post -TimeoutSec 20 -ContentType 'application/x-www-form-urlencoded' -Body @{
        username=$user.username;password=$user.password
    }
    $accountSession = Invoke-RestMethod "$site/api/v1/session" -WebSession $session -TimeoutSec 10
    if (!$accountSession.authenticated) { throw 'Synthetic user did not sign in' }
    $headers = @{}
    $headers[$accountSession.csrf.headerName] = $accountSession.csrf.token
    function Read-Private([string]$Path) {
        Invoke-RestMethod "$site$Path" -WebSession $session -TimeoutSec 15
    }
    function Write-Private([string]$Path,[hashtable]$Value) {
        Invoke-RestMethod "$site$Path" -WebSession $session -Method Post -Headers $headers -TimeoutSec 15 -ContentType 'application/json' -Body ($Value | ConvertTo-Json -Depth 10 -Compress)
    }
    $stage = 'empty fictional account check'
    if ((Read-Private '/api/v1/portfolios').items.Count -ne 0) {
        throw 'The demo account already has a portfolio'
    }
    $stage = 'reviewed workbook import'
    $portfolio = Write-Private '/api/v1/portfolios' @{name='Fictional Cedar Tools demo'}
    $portfolioPath = "/api/v1/portfolios/$($portfolio.portfolioId)"
    $account = Write-Private "$portfolioPath/accounts" @{name='Fictional Groww statement';source='GROWW';currency='INR'}
    $accountPath = "$portfolioPath/accounts/$($account.accountId)"
    $importWatch = [Diagnostics.Stopwatch]::StartNew()
    $ticket = Invoke-RestMethod "$site$accountPath/imports" -WebSession $session -Method Post -Headers $headers -TimeoutSec 15 -ContentType 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' -InFile $workbook
    for ($attempt=0; $attempt -lt 40; $attempt++) {
        $job = Read-Private "/api/v1/jobs/$($ticket.jobId)"
        if ($job.state -notin @('QUEUED','RUNNING')) { break }
        Start-Sleep -Milliseconds 400
    }
    $importWatch.Stop()
    if ($job.state -ne 'SUCCEEDED') { throw 'Workbook preview did not complete' }
    $importPath = "$accountPath/imports/$($ticket.importId)"
    $preview = Read-Private "$importPath/preview"
    if ($preview.metadata.rowCount -ne 2 -or $preview.rows[0].source.quantity -ne '3') { throw 'Unexpected fictional preview' }

    $isin = $preview.rows[0].source.isin
    $securities = Read-Private "/api/v1/catalog/securities?query=$isin&limit=10"
    $security = $securities.items | Where-Object isin -eq $isin | Select-Object -First 1
    if (!$security) {
        $company = Write-Private '/api/v1/catalog/companies' @{name='Fictional Cedar Tools'}
        $security = Write-Private '/api/v1/catalog/securities' @{companyId=$company.companyId;name='Fictional Alpha Equity';isin=$isin;confirmed=$true}
    }
    $receipt = Write-Private "$importPath/accept" @{
        confirmInr=$true;retainUnresolvedListings=$true;acknowledgeDifferences=$true;costMode='UNITS_ONLY'
        expectedLedgerRevision=$preview.review.currentLedgerRevision
    }
    $ledger = Read-Private "$accountPath/ledger"
    if ($receipt.acceptedRows -ne 2 -or $ledger.positions.Count -ne 2) { throw 'Unexpected opening holdings' }

    $stage = 'dated guidance and reviewed result'
    $companyPath = "/api/v1/research/companies/$($security.companyId)"
    function Add-Evidence([string]$Title,[string]$Quote,[string]$Published) {
        $indexWatch = [Diagnostics.Stopwatch]::StartNew()
        $doc = Write-Private '/api/v1/research/sources' @{
            companyId=$security.companyId;title=$Title;sourceName='Fictional management'
            attachment=$Quote;publishedAt=$Published;rightsConfirmed=$true
        }
        $version = "/api/v1/research/sources/$($doc.documentId)/versions/$($doc.revision)"
        $state = Read-Private "$version/extraction"
        if ($state.canRequest) { $state = Write-Private "$version/extraction" @{} }
        for ($attempt=0; $attempt -lt 40 -and $state.state -in @('QUEUED','RUNNING','NOT_REQUESTED'); $attempt++) {
            Start-Sleep -Milliseconds 400
            $state = Read-Private "$version/extraction"
        }
        if ($state.state -ne 'READY') { throw 'Fictional evidence was unavailable' }
        $anchor = (Read-Private "$version/anchors").items[0]
        $indexWatch.Stop()
        @{doc=$doc;anchor=$anchor;observedMs=$indexWatch.ElapsedMilliseconds}
    }
    $outlook = Add-Evidence 'Fictional Cedar Tools outlook' 'Management expects consolidated revenue of 120 to 130 crore.' '2025-05-10T10:00:00Z'
    $dimensions = @{metric='REVENUE';basis='CONSOLIDATED';periodKind='QUARTER';periodStart='2025-04-01';periodEnd='2025-06-30';unit='MONEY';currency='INR'}
    $guidance = Write-Private "$companyPath/guidance" @{
        title='Fictional quarterly revenue guidance';kind='RANGE';stage='CONFIRMED';statementDate='2025-05-10';dimensions=$dimensions
        lower='120';upper='130';scale='CRORE';caveats='Subject to demand';anchorId=$outlook.anchor.anchorId
    }
    $thesis = Write-Private "$companyPath/theses" @{
        title='Fictional Cedar Tools thesis';rationale='Review whether the business delivers its revenue commitment'
        risks='Demand could soften';milestones='June-quarter results';decision='MONITOR';decisionNote='';review=$null
        anchorIds=@($outlook.anchor.anchorId)
    }
    $thesisPath = "/api/v1/research/theses/$($thesis.thesisId)"
    $null = Write-Private "$thesisPath/conditions" @{
        expectedRevision=1;label='Quarterly revenue floor';dimensions=$dimensions;comparator='GTE';threshold='120';scale='CRORE'
    }
    $result = Add-Evidence 'Fictional Cedar Tools results' 'Reported consolidated quarterly revenue of 110 crore.' '2025-07-22T10:00:00Z'
    $null = Write-Private "$companyPath/facts" @{
        dimensions=$dimensions;anchorId=$result.anchor.anchorId;amount='110';scale='CRORE';reviewed=$true
    }
    $condition = (Write-Private "$thesisPath/conditions/check" @{}).items[0].lastCheck
    $eventWatch = [Diagnostics.Stopwatch]::StartNew()
    $event = Write-Private '/api/v1/research/events' @{
        documentId=$result.doc.documentId;documentRevision=$result.doc.revision;title='Fictional Cedar Tools quarterly results'
        subtype='RESULTS';stage='COMPLETED';materiality='HIGH';novelty='NEW';reviewed=$true
    }
    $stage = 'one durable review notification'
    $reviewInput = @{
        expectedRevision=1;eventVersionId=$event.versionId;relation='CHALLENGES';anchorId=$result.anchor.anchorId
        conditionCheckId=$condition.checkId;guidance=@{id=$guidance.guidanceId;revision=1}
    }
    $alertWatch = [Diagnostics.Stopwatch]::StartNew()
    $task = Write-Private "$thesisPath/reviews" $reviewInput
    $retry = Write-Private "$thesisPath/reviews" $reviewInput
    if ($retry.reviewId -ne $task.reviewId -or $task.guidance.outcome.state -ne 'MISSED' -or $task.condition.state -ne 'VIOLATED') {
        throw 'The reviewed result did not match the expected workflow'
    }
    for ($attempt=0; $attempt -lt 40; $attempt++) {
        $items = @((Read-Private '/api/v1/monitoring/notifications').items |
            Where-Object { $_.kind -eq 'THESIS_REVIEW' -and $_.subjectId -eq $thesis.thesisId })
        if ($items.Count -ge 1) { break }
        Start-Sleep -Milliseconds 400
    }
    $alertWatch.Stop()
    $eventWatch.Stop()
    if ($items.Count -ne 1) { throw 'Expected one delivered thesis review alert' }
    $stage = 'evidence-linked decision'
    $decision = Write-Private "/api/v1/research/thesis-reviews/$($task.reviewId)/decision" @{
        action='REVISE';note='Revisit the fictional demand assumption';anchorId=$result.anchor.anchorId
    }
    if ($decision.decision.action -ne 'REVISE') { throw 'Fictional decision was not saved' }
    $logout = @{}
    $logout[$accountSession.csrf.parameterName] = $accountSession.csrf.token
    $null = Invoke-WebRequest "$site/api/v1/logout" -Method Post -WebSession $session -TimeoutSec 15 -ContentType 'application/x-www-form-urlencoded' -Body $logout
    [pscustomobject]@{
        mode='SYNTHETIC_DEMO';acceptedRows=$receipt.acceptedRows;ledgerRevision=$ledger.revision;guidanceResult=$task.guidance.outcome.state
        thesisCondition=$task.condition.state;deliveredAlerts=$items.Count;decision=$decision.decision.action
        workbookObservedMs=$importWatch.ElapsedMilliseconds
        sourceToIndexedObservedMs=@($outlook.observedMs,$result.observedMs)
        taskToAlertObservedMs=$alertWatch.ElapsedMilliseconds;eventToAlertObservedMs=$eventWatch.ElapsedMilliseconds
    } | ConvertTo-Json -Compress
} catch {
    Write-Error "Fictional replay failed at $stage. Verify the isolated services and test fixtures."
    exit 1
}
