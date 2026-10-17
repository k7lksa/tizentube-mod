// tizentube-mod loader, published as tt.js (the URL inside the APK).
// The TV keeps tt.js in its cache for days (jsDelivr sends max-age=604800), so this file rarely changes.
// L5 (17-10-2026, owner: "the mod loads late, ads show at app start"): the app injects this loader only when YouTube's page
// has loaded, and L4 then spent ~0.6 s asking GitHub for the latest commit and downloading main.js before running it. L5 keeps
// the last main.js in localStorage and runs it at once; it asks GitHub in the background, and when a newer commit exists it
// downloads it, stores it and, if the app was opened moments ago and no key was pressed, reloads the page once so the new
// build runs now (otherwise it runs at the next start). Without a stored copy it works like L4 (GitHub, then main.js of that
// exact commit) and stores the result.
// main.js runs through a Trusted Types policy (the page requires it). A status line at the bottom shows what happened (20 s).
(function () {
    var REPO = 'k7lksa/tizentube-mod';
    var LOADER_VERSION = 'L5';
    var KEY_CODE = 'tt-mod-main-code', KEY_SHA = 'tt-mod-main-sha';
    var RELOAD_WINDOW_MS = 15000;          // a newer build found later than this runs at the next start
    var startedAt = Date.now();
    var status = null, steps = [];
    var ranSha = null, loading = false, lastKey = 0;
    document.addEventListener('keydown', function () { lastKey = Date.now(); }, true);

    function render() {
        try {
            if (!status && document.body) {
                status = document.createElement('div');
                status.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:2147483647;padding:6px 12px;' +
                    'background:rgba(0,0,0,0.8);color:#fff;font:20px sans-serif;direction:ltr;pointer-events:none';
                document.body.appendChild(status);
                setTimeout(function () {
                    if (status && status.parentNode) status.parentNode.removeChild(status);
                }, 20000);
            }
            if (status) status.textContent = 'TT ' + LOADER_VERSION + ': ' + steps.join(' > ');
        } catch (_) {}
    }

    function show(step) {
        steps.push(step + ' (' + ((Date.now() - startedAt) / 1000).toFixed(1) + 's)');
        render();
    }

    // Trusted Types: the names a policy may have can be limited by the page, try a few
    var POLICY_NAMES = ['tizentube-mod', 'tizentube', 'default', 'goog#html', 'youtube-tv', 'ytlr'];
    var policy = null;
    var policyName = 'none';

    function getPolicy() {
        if (policy || !window.trustedTypes || !window.trustedTypes.createPolicy) return policy;
        for (var i = 0; i < POLICY_NAMES.length && !policy; i++) {
            try {
                policy = window.trustedTypes.createPolicy(POLICY_NAMES[i], {
                    createScript: function (s) { return s; },
                    createScriptURL: function (s) { return s; },
                    createHTML: function (s) { return s; }
                });
                policyName = POLICY_NAMES[i];
            } catch (_) {}
        }
        return policy;
    }

    function trusted(kind, value) {
        var p = getPolicy();
        return p ? p[kind](value) : value;
    }

    function errorText(e) {
        return (e && e.message ? e.message : String(e)).slice(0, 70);
    }

    function looksWhole(code) {                // a complete main.js (not a cut or an error page)
        return typeof code === 'string' && code.length > 100000 && code.indexOf('__ttGoalsFix') >= 0 && /\}\)\(\);?\s*$/.test(code);
    }

    function run(code, url) {
        // Set as the first statement: once it's set, the script ran (even if it failed later)
        window.ttModStarted = false;
        var marked = 'window.ttModStarted = true;\n' + code;
        getPolicy();
        // 1. Indirect eval: runs in the global scope, like a script file
        try {
            (0, eval)(trusted('createScript', marked + '\n//# sourceURL=tizentube-mod-main.js'));
            if (window.ttModStarted) return 'eval';
        } catch (e) {
            show('eval: ' + errorText(e));
            if (window.ttModStarted) return 'eval, failed';   // the script ran and failed: don't run it twice
        }
        // 2. Inline script
        try {
            var inline = document.createElement('script');
            inline.text = trusted('createScript', marked);
            (document.head || document.documentElement).appendChild(inline);
            if (window.ttModStarted) return 'inline';
        } catch (e) {
            show('inline: ' + errorText(e));
        }
        // 3. Script file (asynchronous)
        if (!url) return null;
        try {
            var file = document.createElement('script');
            file.src = trusted('createScriptURL', url);
            file.onload = function () { show('src loaded, build ' + (window.ttModBuild || '?')); };
            file.onerror = function () { show('src failed'); };
            (document.head || document.documentElement).appendChild(file);
            return 'src pending';
        } catch (e) {
            show('src: ' + errorText(e));
        }
        return null;
    }

    function store(sha, code) {                // code first, the sha last: the sha marks a complete copy
        try {
            localStorage.removeItem(KEY_SHA);
            localStorage.setItem(KEY_CODE, code);
            localStorage.setItem(KEY_SHA, sha);
            return localStorage.getItem(KEY_CODE).length === code.length;
        } catch (e) {
            try { localStorage.removeItem(KEY_CODE); localStorage.removeItem(KEY_SHA); } catch (_) {}
            show('store failed: ' + errorText(e));
            return false;
        }
    }

    function stored() {
        try {
            var sha = localStorage.getItem(KEY_SHA), code = sha && localStorage.getItem(KEY_CODE);
            if (sha && /^[0-9a-f]{40}$/.test(sha) && looksWhole(code)) return { sha: sha, code: code };
        } catch (_) {}
        return null;
    }

    // Downloads main.js of a commit. runNow: nothing ran yet (no stored copy), run it; otherwise store it for the next start
    // (and reload once if the app was opened moments ago).
    function fetchMain(ref, runNow, bust) {
        if (loading) return;
        loading = true;
        var url = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ref + '/main.js' + (bust ? '?t=' + Math.floor(Date.now() / 600000) : '');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 60000;
        xhr.onload = function () {
            loading = false;
            var code = xhr.responseText || '';
            if (xhr.status !== 200 || !looksWhole(code)) {
                show('main.js HTTP ' + xhr.status + ' ' + code.length + 'B');
                return;
            }
            show('main.js ' + Math.round(code.length / 1024) + 'KB');
            var ok = ref !== 'main' && store(ref, code);
            if (runNow) {
                var how = run(code, url);
                ranSha = ref;
                show(how ? 'ran (' + how + ') build ' + (window.ttModBuild || '?') + (ok ? ', stored' : '') : 'not run');
                return;
            }
            if (!ok) return;
            var age = Date.now() - startedAt;
            if (age < RELOAD_WINDOW_MS && Date.now() - lastKey > 2000 && (location.hash || '').indexOf('#/watch') !== 0) {
                show('new build stored, reloading');
                setTimeout(function () { location.reload(); }, 300);
            } else {
                show('new build stored for the next start');
            }
        };
        xhr.onerror = function () { loading = false; show('main.js network error'); };
        xhr.ontimeout = function () { loading = false; show('main.js timeout'); };
        xhr.send();
    }

    var cached = stored();
    if (cached) {
        show('stored ' + cached.sha.slice(0, 7));
        var how = run(cached.code, null);
        ranSha = cached.sha;
        show(how ? 'ran (' + how + ') build ' + (window.ttModBuild || '?') : 'not run');
        if (!how) cached = null;               // could not run it: fall back to the network below
    }

    var answered = false;
    function latest(sha) {
        if (answered) return;
        answered = true;
        if (cached && sha === cached.sha) { show('github: same'); return; }
        show((cached ? 'github: newer ' : 'commit ') + sha.slice(0, 7));
        fetchMain(sha, !cached, false);
    }
    function fallback(reason) {
        if (answered) return;
        answered = true;
        show(reason);
        if (!cached) fetchMain('main', true, true);   // nothing running yet: the branch, cache-busted every 10 min
    }
    try {
        var api = new XMLHttpRequest();
        api.open('GET', 'https://api.github.com/repos/' + REPO + '/commits/main?t=' + Date.now(), true);
        api.setRequestHeader('Accept', 'application/vnd.github.sha');
        api.timeout = 5000;
        api.onload = function () {
            var sha = (api.responseText || '').trim();
            if (api.status === 200 && /^[0-9a-f]{40}$/.test(sha)) latest(sha);
            else fallback('github ' + api.status);
        };
        api.onerror = function () { fallback('github error'); };
        api.ontimeout = function () { fallback('github timeout'); };
        api.send();
        setTimeout(function () { fallback('github no answer'); }, 8000);
    } catch (e) {
        fallback('github exception');
    }
    // The page may not have a body yet when this runs
    var tries = 0;
    var waitBody = setInterval(function () {
        if (status || ++tries > 40) return clearInterval(waitBody);
        render();
    }, 250);
})();
