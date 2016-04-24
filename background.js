// make amazon requests in background to avoid mixed content errors

var manifestData = chrome.app.getDetails();

var fixerJsonUrl = "https://api.fixer.io/latest";

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        if (request && request.message === "yang_push_version") {
            chrome.tabs.sendMessage(sender.tab.id, {
                "message": "yang_display_version",
                "version": manifestData.version
            });

        }

        if (request && request.message === "yang_fixerdata_push" && request.callback_name) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", fixerJsonUrl, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {

                    var data = xhr.responseText || "";
                    var rates = {};

                    if (data && (typeof data == 'string')) {
                        data = JSON.parse(data);
                    }

                    if (data.rates && data.base == 'EUR') {
                        for (var ccode in data.rates) {
                            var rate = data.rates[ccode];
                            if (rate && (typeof rate == "number") && (typeof ccode == "string") ) {
                                ccode = ccode.toUpperCase();
                                rates[[ccode, 'EUR'].join('-')] = {
                                    source: ccode,
                                    target: 'EUR',
                                    rate: 1 / rate
                                }
                            }
                        }
                    }
                    chrome.tabs.sendMessage(sender.tab.id, {
                        "message": request.callback_name,
                        "data": rates
                    });
                }
            }
            xhr.send();
        }

        if (request && request.message === "yang_request_amazon" && request.site && request.asin) {
            var amazon_url = "https://" + request.site + "/dp/" + request.asin + "/";

            var xhr = new XMLHttpRequest();
            xhr.open("GET", amazon_url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    var body = xhr.responseText || "";

                    var messageBack = {
                        "message": "yang_done_request_amazon",
                        "site": request.site,
                        "asin": request.asin,
                        "body": body
                    }

                    chrome.tabs.sendMessage(sender.tab.id, messageBack);
                }
            }
            xhr.send();
        }
    }
);