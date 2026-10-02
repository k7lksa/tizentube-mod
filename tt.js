// tizentube-mod loader, published as tt.js (the URL inside the APK).
// The TV keeps tt.js in its cache for days, and jsDelivr can serve an old copy of a branch for hours,
// so this file rarely changes: it asks GitHub for the latest commit and loads main.js of that exact commit.
// A small status line at the bottom of the screen shows what happened (for 20 seconds).
(function () {
    var REPO = 'k7lksa/tizentube-mod';
    var LOADER_VERSION = 'L2';
    var loaded = false;
    var status = null;
    var steps = [];

    function show(step) {
        steps.push(step);
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

    function load(ref, bust) {
        if (loaded) return;
        loaded = true;
        show(ref === 'main' ? 'fallback @main' : 'commit ' + ref.slice(0, 7));
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ref + '/main.js' + (bust ? '?t=' + Math.floor(Date.now() / 600000) : '');
        script.onload = function () {
            show('main.js ok' + (window.ttModBuild ? ' build ' + window.ttModBuild : ''));
        };
        script.onerror = function () {
            show('main.js failed');
        };
        (document.head || document.documentElement).appendChild(script);
    }

    function fallback(reason) {
        if (!loaded) show(reason);
        load('main', true);
    }

    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.github.com/repos/' + REPO + '/commits/main?t=' + Date.now(), true);
        xhr.setRequestHeader('Accept', 'application/vnd.github.sha');
        xhr.timeout = 5000;
        xhr.onload = function () {
            var sha = (xhr.responseText || '').trim();
            if (xhr.status === 200 && /^[0-9a-f]{40}$/.test(sha)) {
                load(sha, false);
            } else {
                fallback('github ' + xhr.status);
            }
        };
        xhr.onerror = function () { fallback('github error'); };
        xhr.ontimeout = function () { fallback('github timeout'); };
        xhr.send();
        setTimeout(function () { fallback('github no answer'); }, 8000);
    } catch (e) {
        fallback('github exception');
    }
})();
