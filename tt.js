// tizentube-mod loader, published as tt.js (the URL inside the APK).
// The TV keeps tt.js in its cache for days, and jsDelivr can serve an old copy of a branch for hours,
// so this file rarely changes: it asks GitHub for the latest commit and runs main.js of that exact commit.
// main.js is downloaded as text and run directly. The page requires Trusted Types: scripts can only be
// run or attached through a policy, so one is created first.
// A small status line at the bottom of the screen shows what happened (for 20 seconds).
(function () {
    var REPO = 'k7lksa/tizentube-mod';
    var LOADER_VERSION = 'L4';
    var started = false;
    var status = null;
    var steps = [];
    var startedAt = Date.now();

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

    function run(code, url) {
        // Set as the first statement: once it's set, the script ran (even if it failed later)
        window.ttModStarted = false;
        var marked = 'window.ttModStarted = true;\n' + code;
        getPolicy();
        show('policy ' + policyName);
        // 1. Indirect eval: runs in the global scope, like a script file
        try {
            (0, eval)(trusted('createScript', marked + '\n//# sourceURL=tizentube-mod-main.js'));
            if (window.ttModStarted) return 'eval';
        } catch (e) {
            show('eval: ' + errorText(e));
            // The script ran and failed: don't run it twice
            if (window.ttModStarted) return 'eval, failed';
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
        try {
            var file = document.createElement('script');
            file.src = trusted('createScriptURL', url);
            file.onload = function () {
                show('src loaded, build ' + (window.ttModBuild || '?'));
            };
            file.onerror = function () { show('src failed'); };
            (document.head || document.documentElement).appendChild(file);
            return 'src pending';
        } catch (e) {
            show('src: ' + errorText(e));
        }
        return null;
    }

    function load(ref, bust) {
        if (started) return;
        started = true;
        show(ref === 'main' ? 'fallback @main' : 'commit ' + ref.slice(0, 7));
        var url = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ref + '/main.js' + (bust ? '?t=' + Math.floor(Date.now() / 600000) : '');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 60000;
        xhr.onload = function () {
            var code = xhr.responseText || '';
            if (xhr.status !== 200 || code.length < 1000) {
                show('main.js HTTP ' + xhr.status + ' ' + code.length + 'B');
                return;
            }
            show('main.js ' + Math.round(code.length / 1024) + 'KB');
            var how = run(code, url);
            show(how ? 'ran (' + how + ') build ' + (window.ttModBuild || '?') : 'not run');
        };
        xhr.onerror = function () { show('main.js network error'); };
        xhr.ontimeout = function () { show('main.js timeout'); };
        xhr.send();
    }

    function fallback(reason) {
        if (started) return;
        show(reason);
        load('main', true);
    }

    try {
        var api = new XMLHttpRequest();
        api.open('GET', 'https://api.github.com/repos/' + REPO + '/commits/main?t=' + Date.now(), true);
        api.setRequestHeader('Accept', 'application/vnd.github.sha');
        api.timeout = 5000;
        api.onload = function () {
            var sha = (api.responseText || '').trim();
            if (api.status === 200 && /^[0-9a-f]{40}$/.test(sha)) {
                load(sha, false);
            } else {
                fallback('github ' + api.status);
            }
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
