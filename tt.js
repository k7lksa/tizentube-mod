// tizentube-mod loader, published as tt.js (the URL inside the APK).
// The TV keeps tt.js in its cache for days, and jsDelivr can serve an old copy of a branch for hours,
// so this file rarely changes: it asks GitHub for the latest commit and runs main.js of that exact commit.
// main.js is downloaded as text and run directly: the TV app ignores <script src> added by the page.
// A small status line at the bottom of the screen shows what happened (for 20 seconds).
(function () {
    var REPO = 'k7lksa/tizentube-mod';
    var LOADER_VERSION = 'L3';
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

    function run(code) {
        window.ttModRan = false;
        // 1. Indirect eval: runs in the global scope, like a script file
        try {
            (0, eval)(code + '\n;window.ttModRan = true;\n//# sourceURL=tizentube-mod-main.js');
        } catch (e) {
            show('eval: ' + (e && e.message ? e.message : e).toString().slice(0, 80));
            // The script ran and failed: don't run it twice. Only retry if eval itself was refused.
            if (!(e instanceof EvalError)) return 'eval, failed';
        }
        if (window.ttModRan) return 'eval';
        // 2. Inline script (if eval is not allowed)
        try {
            var script = document.createElement('script');
            script.textContent = code + '\n;window.ttModRan = true;';
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            show('inline: ' + (e && e.message ? e.message : e).toString().slice(0, 80));
        }
        return window.ttModRan ? 'inline' : null;
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
            var how = run(code);
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
