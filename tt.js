// tizentube-mod loader, published as tt.js (the URL inside the APK).
// The TV keeps tt.js in its cache for days, and jsDelivr can serve an old copy of a branch for hours,
// so this file never changes: it asks GitHub for the latest commit and loads main.js of that exact commit.
(function () {
    var REPO = 'k7lksa/tizentube-mod';
    var loaded = false;

    function load(ref, bust) {
        if (loaded) return;
        loaded = true;
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ref + '/main.js' + (bust ? '?t=' + Math.floor(Date.now() / 600000) : '');
        (document.head || document.documentElement).appendChild(script);
    }

    function fallback() {
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
                fallback();
            }
        };
        xhr.onerror = fallback;
        xhr.ontimeout = fallback;
        xhr.send();
        setTimeout(fallback, 8000);
    } catch (_) {
        fallback();
    }
})();
